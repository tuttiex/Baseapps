const pool = require('./pool');

// Initialize Database Schema Updates
async function initDatabase() {
    try {
        // Create linked_wallets table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS linked_wallets (
                linked_address VARCHAR(42) PRIMARY KEY,
                user_address VARCHAR(42) REFERENCES users(wallet_address) ON DELETE CASCADE,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add display_address column to users if not exists
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='display_address') THEN 
                    ALTER TABLE users ADD COLUMN display_address VARCHAR(42);
                END IF;
            END $$;
        `);

        console.log('✅ Database schema initialized for Linked Wallets');
    } catch (err) {
        console.error('❌ Failed to init database schema:', err);
    }
}

// Run init
initDatabase();

// ============================================
// USER QUERIES
// ============================================

/**
 * Get user by wallet address
 */
async function getUserByAddress(walletAddress) {
    const result = await pool.query(
        'SELECT * FROM users WHERE wallet_address = $1',
        [walletAddress.toLowerCase()]
    );
    return result.rows[0] || null;
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
    const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );
    return result.rows[0] || null;
}

/**
 * Create new user
 */
async function createUser(walletAddress, username = null, bio = null, avatarUrl = null) {
    const result = await pool.query(
        `INSERT INTO users (wallet_address, username, bio, avatar_url) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
        [walletAddress.toLowerCase(), username, bio, avatarUrl]
    );
    return result.rows[0];
}

/**
 * Update user profile
 */
async function updateUser(walletAddress, { username, bio, avatarUrl }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
        updates.push(`username = $${paramCount++}`);
        values.push(username);
    }
    if (bio !== undefined) {
        updates.push(`bio = $${paramCount++}`);
        values.push(bio);
    }
    if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramCount++}`);
        values.push(avatarUrl);
    }

    if (updates.length === 0) {
        return getUserByAddress(walletAddress);
    }

    values.push(walletAddress.toLowerCase());
    const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE wallet_address = $${paramCount} RETURNING *`,
        values
    );
    return result.rows[0];
}

// ============================================
// AUTHENTICATION QUERIES
// ===========================================

/**
 * Create or update nonce for authentication
 */
async function setNonce(walletAddress, nonce, expiresInMinutes = 5) {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    await pool.query(
        `INSERT INTO auth_nonces (wallet_address, nonce, expires_at) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (wallet_address) 
     DO UPDATE SET nonce = $2, created_at = CURRENT_TIMESTAMP, expires_at = $3`,
        [walletAddress.toLowerCase(), nonce, expiresAt]
    );
}

/**
 * Get and validate nonce
 */
async function getNonce(walletAddress) {
    const result = await pool.query(
        `SELECT nonce, expires_at FROM auth_nonces 
     WHERE wallet_address = $1 AND expires_at > CURRENT_TIMESTAMP`,
        [walletAddress.toLowerCase()]
    );
    return result.rows[0] || null;
}

/**
 * Delete used nonce
 */
async function deleteNonce(walletAddress) {
    await pool.query(
        'DELETE FROM auth_nonces WHERE wallet_address = $1',
        [walletAddress.toLowerCase()]
    );
}

/**
 * Clean up expired nonces (run periodically)
 */
async function cleanupExpiredNonces() {
    const result = await pool.query(
        'DELETE FROM auth_nonces WHERE expires_at < CURRENT_TIMESTAMP'
    );
    return result.rowCount;
}

// ============================================
// FAVORITES QUERIES
// ============================================

/**
 * Get user's favorite dapps
 */
async function getUserFavorites(walletAddress) {
    const result = await pool.query(
        'SELECT dapp_name, added_at FROM user_favorites WHERE wallet_address = $1 ORDER BY added_at DESC',
        [walletAddress.toLowerCase()]
    );
    return result.rows;
}

/**
 * Add dapp to favorites
 */
async function addFavorite(walletAddress, dappName) {
    const result = await pool.query(
        `INSERT INTO user_favorites (wallet_address, dapp_name) 
     VALUES ($1, $2) 
     ON CONFLICT (wallet_address, dapp_name) DO NOTHING 
     RETURNING *`,
        [walletAddress.toLowerCase(), dappName]
    );
    return result.rows[0];
}

/**
 * Remove dapp from favorites
 */
async function removeFavorite(walletAddress, dappName) {
    const result = await pool.query(
        'DELETE FROM user_favorites WHERE wallet_address = $1 AND dapp_name = $2',
        [walletAddress.toLowerCase(), dappName]
    );
    return result.rowCount > 0;
}

/**
 * Check if dapp is favorited by user
 */
async function isFavorited(walletAddress, dappName) {
    const result = await pool.query(
        'SELECT 1 FROM user_favorites WHERE wallet_address = $1 AND dapp_name = $2',
        [walletAddress.toLowerCase(), dappName]
    );
    return result.rows.length > 0;
}

// ============================================
// WALLET MANAGEMENT QUERIES
// ============================================

/**
 * Link a secondary wallet to a user
 */
async function linkWallet(userAddress, linkedAddress) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if linked wallet is already a user
        const existingUser = await client.query('SELECT wallet_address FROM users WHERE wallet_address = $1', [linkedAddress.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            throw new Error('Wallet is already registered as a primary user');
        }

        // Insert into linked_wallets
        await client.query(
            'INSERT INTO linked_wallets (user_address, linked_address) VALUES ($1, $2)',
            [userAddress.toLowerCase(), linkedAddress.toLowerCase()]
        );

        await client.query('COMMIT');
        return true;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Unlink a wallet
 */
async function unlinkWallet(userAddress, linkedAddress) {
    const result = await pool.query(
        'DELETE FROM linked_wallets WHERE user_address = $1 AND linked_address = $2',
        [userAddress.toLowerCase(), linkedAddress.toLowerCase()]
    );
    return result.rowCount > 0;
}

/**
 * Get all wallets for a user (primary + linked)
 */
async function getUserWallets(userAddress) {
    const linked = await pool.query(
        'SELECT linked_address, added_at FROM linked_wallets WHERE user_address = $1',
        [userAddress.toLowerCase()]
    );

    // Get primary info to see display setting
    const user = await getUserByAddress(userAddress);

    return {
        primary: userAddress.toLowerCase(),
        display: user?.display_address || userAddress.toLowerCase(), // Default to primary if not set
        linked: linked.rows.map(r => ({
            address: r.linked_address,
            addedAt: r.added_at
        }))
    };
}

/**
 * Set the display/main wallet
 */
async function setDisplayWallet(userAddress, displayAddress) {
    // Verify the address is either the primary OR one of the linked wallets
    if (displayAddress.toLowerCase() !== userAddress.toLowerCase()) {
        const isLinked = await pool.query(
            'SELECT 1 FROM linked_wallets WHERE user_address = $1 AND linked_address = $2',
            [userAddress.toLowerCase(), displayAddress.toLowerCase()]
        );
        if (isLinked.rows.length === 0) {
            throw new Error('Address is not linked to this account');
        }
    }

    const result = await pool.query(
        'UPDATE users SET display_address = $1 WHERE wallet_address = $2 RETURNING display_address',
        [displayAddress.toLowerCase(), userAddress.toLowerCase()]
    );
    return result.rows[0];
}

/**
 * Resolve any wallet address to the primary user account
 * Returns the User object of the owner (whether it's the primary or linked wallet)
 */
async function resolveUserByWallet(address) {
    const normalized = address.toLowerCase();

    // 1. Check if it is a primary user
    let user = await getUserByAddress(normalized);
    if (user) return user;

    // 2. Check if it is a linked wallet
    const link = await pool.query(
        'SELECT user_address FROM linked_wallets WHERE linked_address = $1',
        [normalized]
    );

    if (link.rows.length > 0) {
        // Fetch the parent user
        return getUserByAddress(link.rows[0].user_address);
    }

    return null;
}

module.exports = {
    // User queries
    getUserByAddress,
    getUserByUsername,
    createUser,
    updateUser,

    // Auth queries
    setNonce,
    getNonce,
    deleteNonce,
    cleanupExpiredNonces,

    // Favorites queries
    getUserFavorites,
    addFavorite,
    removeFavorite,
    isFavorited,

    // Wallet mgmt
    linkWallet,
    unlinkWallet,
    getUserWallets,
    setDisplayWallet,
    resolveUserByWallet
};
