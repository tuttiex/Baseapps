const express = require('express');
const jwt = require('jsonwebtoken');
const { generateNonce, verifySignature, createSignMessage } = require('../utils/signature');
const { setNonce, getNonce, deleteNonce, getUserByAddress, createUser } = require('../db/queries');

const router = express.Router();

/**
 * GET /api/auth/nonce?address=0x...
 * Get a nonce for wallet authentication
 */
router.get('/nonce', async (req, res) => {
    try {
        const { address } = req.query;

        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                success: false,
                error: 'Valid Ethereum address required'
            });
        }

        // Generate and store nonce
        const nonce = generateNonce();
        await setNonce(address, nonce, 5); // Expires in 5 minutes

        // Create the message to sign
        const message = createSignMessage(nonce);

        res.json({
            success: true,
            message,
            nonce
        });
    } catch (error) {
        console.error('Error generating nonce:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate nonce'
        });
    }
});

/**
 * POST /api/auth/verify
 * Verify signature and issue JWT token
 */
router.post('/verify', async (req, res) => {
    try {
        const { address, signature, message } = req.body;

        if (!address || !signature || !message) {
            return res.status(400).json({
                success: false,
                error: 'Address, signature, and message are required'
            });
        }

        // Get stored nonce
        const nonceData = await getNonce(address);
        if (!nonceData) {
            return res.status(401).json({
                success: false,
                error: 'Nonce expired or not found. Please request a new one.'
            });
        }

        // Verify the message contains the nonce
        if (!message.includes(nonceData.nonce)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid message'
            });
        }

        // Verify signature
        const isValid = verifySignature(address, message, signature);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Delete used nonce (prevent replay attacks)
        await deleteNonce(address);

        // Check if user exists, create if not
        let user = await getUserByAddress(address);
        if (!user) {
            user = await createUser(address);
        }

        // Generate JWT token
        const token = jwt.sign(
            { walletAddress: address.toLowerCase() },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token valid for 7 days
        );

        res.json({
            success: true,
            token,
            user: {
                walletAddress: user.wallet_address,
                username: user.username,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Error verifying signature:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout (client should delete token)
 */
router.post('/logout', (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // We just acknowledge the request
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
