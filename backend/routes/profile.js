const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const {
    getUserByAddress,
    getUserByUsername,
    updateUser,
    getUserFavorites,
    addFavorite,
    removeFavorite,
    linkWallet,
    unlinkWallet,
    getUserWallets,
    setDisplayWallet,
    getNonce,
    deleteNonce
} = require('../db/queries');
const { verifySignature } = require('../utils/signature');

const router = express.Router();

// Configure avatar upload
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../data/avatars');
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            cb(null, UPLOADS_DIR);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

/**
 * GET /api/profile/me
 * Get own profile (authenticated)
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await getUserByAddress(req.walletAddress);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }

        res.json({
            success: true,
            user: {
                walletAddress: user.wallet_address,
                username: user.username,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Error fetching own profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

/**
 * GET /api/profile/:address
 * Get public profile by address or username
 */
router.get('/:addressOrUsername', optionalAuth, async (req, res) => {
    try {
        const { addressOrUsername } = req.params;

        let user;
        // Check if it's an Ethereum address
        if (/^0x[a-fA-F0-9]{40}$/.test(addressOrUsername)) {
            user = await getUserByAddress(addressOrUsername);
        } else {
            // Treat as username
            user = await getUserByUsername(addressOrUsername);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userObj = {
            walletAddress: user.wallet_address,
            username: user.username,
            bio: user.bio,
            avatarUrl: user.avatar_url,
            createdAt: user.created_at,
            isOwnProfile: req.walletAddress === user.wallet_address
        };

        // Create list of all addresses for this user (primary + linked)
        let allAddresses = [user.wallet_address.toLowerCase()];

        // Fetch linked wallets for this user
        // We can reuse getUserWallets, but that gets logic for "Own" profile mostly.
        // We can just query the DB directly or use the helper.
        // getUserWallets returns { linked: [...] }
        const userWallets = await getUserWallets(user.wallet_address);
        if (userWallets && userWallets.linked) {
            allAddresses = allAddresses.concat(userWallets.linked.map(w => w.address.toLowerCase()));
        }

        // --- Fetch User's Votes ---
        let votes = [];
        try {
            const VOTES_FILE = path.join(__dirname, '../data/votes.json');
            const votesData = await fs.readFile(VOTES_FILE, 'utf8');
            const allVotes = JSON.parse(votesData);

            // Filter votes by ANY of the user's addresses
            votes = allVotes.filter(v => allAddresses.includes(v.voter.toLowerCase()));

            // Enrich votes with dapp names if possible (would need dapp map or cache)
            // For now, we return dappId and value. Frontend can resolve name if it has a list, 
            // or we could load dapps here. Let's try to load dapps cache to enrich.
            try {
                const CACHE_FILE = path.join(__dirname, '../data/dapps-cache.json');
                const APPROVED_FILE = path.join(__dirname, '../data/approved_dapps.json');
                const [cacheData, approvedData] = await Promise.all([
                    fs.readFile(CACHE_FILE, 'utf8').catch(() => '{"dapps":[]}'),
                    fs.readFile(APPROVED_FILE, 'utf8').catch(() => '[]')
                ]);

                const cachedDapps = JSON.parse(cacheData).dapps || [];
                const approvedDapps = JSON.parse(approvedData) || [];
                const allDapps = [...approvedDapps, ...cachedDapps];

                // We also need dapp-ids.json to map dappId back to name/url/logo
                const DAPP_IDS_FILE = path.join(__dirname, '../dapp-ids.json');
                const dappIdsData = await fs.readFile(DAPP_IDS_FILE, 'utf8').catch(() => '[]');
                const dappIdMap = JSON.parse(dappIdsData);

                votes = votes.map(vote => {
                    const mapping = dappIdMap.find(m => m.dappId === vote.dappId);
                    const dapp = mapping
                        ? allDapps.find(d => d.name === mapping.name || d.url === mapping.url)
                        : null;

                    return {
                        ...vote,
                        dappName: mapping ? mapping.name : 'Unknown Dapp',
                        dappLogo: dapp ? dapp.logo : null
                    };
                });
            } catch (enrichErr) {
                console.log('Error enriching votes:', enrichErr.message);
            }

        } catch (err) {
            // If votes file doesn't exist or error
            console.log('Error loading votes for profile:', err.message);
        }

        // --- Fetch User's Submitted Dapps ---
        let submittedDapps = [];
        try {
            const APPROVED_FILE = path.join(__dirname, '../data/approved_dapps.json');
            const approvedData = await fs.readFile(APPROVED_FILE, 'utf8');
            const approvedDapps = JSON.parse(approvedData);

            // Filter by submittedBy
            submittedDapps = approvedDapps.filter(d =>
                d.submittedBy && allAddresses.includes(d.submittedBy.toLowerCase())
            );
        } catch (err) {
            console.log('Error loading submitted dapps for profile:', err.message);
        }

        res.json({
            success: true,
            user: {
                ...userObj,
                votes: votes,
                submittedDapps: submittedDapps,
                // Optionally expose linked wallets count or public linked wallets?
                // For now, keep it simple.
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

/**
 * PUT /api/profile/me
 * Update own profile (authenticated)
 */
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const { username, bio } = req.body;

        // Validate username if provided
        if (username !== undefined) {
            if (username && (username.length < 3 || username.length > 50)) {
                return res.status(400).json({
                    success: false,
                    error: 'Username must be between 3 and 50 characters'
                });
            }

            if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
                return res.status(400).json({
                    success: false,
                    error: 'Username can only contain letters, numbers, hyphens, and underscores'
                });
            }

            // Check if username is already taken
            if (username) {
                const existing = await getUserByUsername(username);
                if (existing && existing.wallet_address !== req.walletAddress) {
                    return res.status(409).json({
                        success: false,
                        error: 'Username already taken'
                    });
                }
            }
        }

        // Update profile
        const updatedUser = await updateUser(req.walletAddress, { username, bio });

        res.json({
            success: true,
            user: {
                walletAddress: updatedUser.wallet_address,
                username: updatedUser.username,
                bio: updatedUser.bio,
                avatarUrl: updatedUser.avatar_url,
                updatedAt: updatedUser.updated_at
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

/**
 * POST /api/profile/avatar
 * Upload avatar image (authenticated)
 */
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Build avatar URL
        const avatarUrl = `/avatars/${req.file.filename}`;

        // Update user's avatar
        const updatedUser = await updateUser(req.walletAddress, { avatarUrl });

        res.json({
            success: true,
            avatarUrl,
            user: {
                walletAddress: updatedUser.wallet_address,
                username: updatedUser.username,
                avatarUrl: updatedUser.avatar_url
            }
        });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload avatar'
        });
    }
});

/**
 * GET /api/profile/me/favorites
 * Get user's favorite dapps (authenticated)
 */
router.get('/me/favorites', authenticateToken, async (req, res) => {
    try {
        const favorites = await getUserFavorites(req.walletAddress);

        res.json({
            success: true,
            favorites: favorites.map(f => ({
                dappName: f.dapp_name,
                addedAt: f.added_at
            }))
        });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch favorites'
        });
    }
});

/**
 * POST /api/profile/me/favorites
 * Add dapp to favorites (authenticated)
 */
router.post('/me/favorites', authenticateToken, async (req, res) => {
    try {
        const { dappName } = req.body;

        if (!dappName) {
            return res.status(400).json({
                success: false,
                error: 'Dapp name is required'
            });
        }

        await addFavorite(req.walletAddress, dappName);

        res.json({
            success: true,
            message: 'Added to favorites'
        });
    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add favorite'
        });
    }
});

/**
 * DELETE /api/profile/me/favorites/:dappName
 * Remove dapp from favorites (authenticated)
 */
router.delete('/me/favorites/:dappName', authenticateToken, async (req, res) => {
    try {
        const { dappName } = req.params;

        const removed = await removeFavorite(req.walletAddress, dappName);

        if (!removed) {
            return res.status(404).json({
                success: false,
                error: 'Favorite not found'
            });
        }

        res.json({
            success: true,
            message: 'Removed from favorites'
        });
    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove favorite'
        });
    }
});

/**
 * GET /api/profile/me/wallets
 * Get connected wallets
 */
router.get('/me/wallets', authenticateToken, async (req, res) => {
    try {
        const wallets = await getUserWallets(req.walletAddress);
        res.json({ success: true, ...wallets });
    } catch (error) {
        console.error('Error fetching wallets:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch wallets' });
    }
});

/**
 * POST /api/profile/me/wallets
 * Link a new wallet (requires signature from new wallet)
 */
router.post('/me/wallets', authenticateToken, async (req, res) => {
    try {
        const { address, signature, message } = req.body;

        if (!address || !signature || !message) {
            return res.status(400).json({ success: false, error: 'Missing parameters' });
        }

        // Verify signature of the NEW wallet
        const nonceData = await getNonce(address);
        if (!nonceData || !message.includes(nonceData.nonce)) {
            return res.status(401).json({ success: false, error: 'Invalid or expired nonce' });
        }

        const isValid = verifySignature(address, message, signature);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid signature' });
        }

        await deleteNonce(address);

        // Limit to 5 wallets (1 primary + 4 linked)
        const currentWallets = await getUserWallets(req.walletAddress);
        if (currentWallets.linked.length >= 4) {
            return res.status(400).json({ success: false, error: 'Maximum of 5 wallets allowed' });
        }

        // Link it
        try {
            await linkWallet(req.walletAddress, address);
            res.json({ success: true, message: 'Wallet linked successfully' });
        } catch (linkErr) {
            return res.status(400).json({ success: false, error: linkErr.message });
        }

    } catch (error) {
        console.error('Error linking wallet:', error);
        res.status(500).json({ success: false, error: 'Failed to link wallet' });
    }
});

/**
 * DELETE /api/profile/me/wallets/:address
 * Unlink a wallet
 */
router.delete('/me/wallets/:address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.params;
        await unlinkWallet(req.walletAddress, address);
        res.json({ success: true, message: 'Wallet unlinked' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to unlink wallet' });
    }
});

/**
 * PUT /api/profile/me/primary
 * Set display/main wallet
 */
router.put('/me/primary', authenticateToken, async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) return res.status(400).json({ error: 'Address required' });

        const result = await setDisplayWallet(req.walletAddress, address);
        res.json({ success: true, displayAddress: result.display_address });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || 'Failed to set primary wallet' });
    }
});

module.exports = router;
