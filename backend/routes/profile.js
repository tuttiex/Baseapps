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
    removeFavorite
} = require('../db/queries');

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

        res.json({
            success: true,
            user: {
                walletAddress: user.wallet_address,
                username: user.username,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                createdAt: user.created_at,
                isOwnProfile: req.walletAddress === user.wallet_address
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

module.exports = router;
