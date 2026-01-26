const pool = require('./pool');

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
// DAPP QUERIES
// ============================================

/**
 * Create a new dapp
 */
async function createDapp(data) {
    const { name, description, category, subcategory, websiteUrl, logoUrl, chain, status, submittedBy } = data;

    // Check if exists first (since name must be unique)
    const existing = await pool.query('SELECT id FROM dapps WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
        throw new Error('Dapp with this name already exists');
    }

    const result = await pool.query(
        `INSERT INTO dapps (name, description, category, subcategory, website_url, logo_url, chain, status, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name, description, category, subcategory, websiteUrl, logoUrl, chain, status || 'pending', submittedBy]
    );
    return result.rows[0];
}

/**
 * Get all dapps by status (or all)
 */
async function getDapps(status = null) {
    let query = 'SELECT *, (SELECT COALESCE(SUM(vote_value), 0) FROM votes WHERE dapp_id = dapps.id) as score FROM dapps';
    const params = [];

    if (status) {
        query += ' WHERE status = $1';
        params.push(status);
    }

    // Default sort by score desc, then name asc
    query += ' ORDER BY score DESC, name ASC';

    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Get single dapp by ID
 */
async function getDappById(id) {
    const result = await pool.query(
        'SELECT *, (SELECT COALESCE(SUM(vote_value), 0) FROM votes WHERE dapp_id = dapps.id) as score FROM dapps WHERE id = $1',
        [id]
    );
    return result.rows[0];
}

/**
 * Get single dapp by Name
 */
async function getDappByName(name) {
    const result = await pool.query(
        'SELECT *, (SELECT COALESCE(SUM(vote_value), 0) FROM votes WHERE dapp_id = dapps.id) as score FROM dapps WHERE LOWER(name) = LOWER($1)',
        [name]
    );
    return result.rows[0];
}

/**
 * Approve dapp
 */
async function approveDapp(id) {
    const result = await pool.query(
        `UPDATE dapps SET status = 'approved' WHERE id = $1 RETURNING *`,
        [id]
    );
    return result.rows[0];
}

/**
 * Delete dapp
 */
async function deleteDapp(id) {
    const result = await pool.query(
        'DELETE FROM dapps WHERE id = $1',
        [id]
    );
    return result.rowCount > 0;
}

// ============================================
// VOTE QUERIES
// ============================================

/**
 * Cast a vote (Upsert: Insert or Update)
 */
async function castVote(dappId, voterAddress, value) {
    const result = await pool.query(
        `INSERT INTO votes (dapp_id, voter_address, vote_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (dapp_id, voter_address)
         DO UPDATE SET vote_value = $3, timestamp = CURRENT_TIMESTAMP
         RETURNING *`,
        [dappId, voterAddress.toLowerCase(), value]
    );
    return result.rows[0];
}

/**
 * Get user's vote for a specific dapp
 */
async function getUserVote(dappId, voterAddress) {
    const result = await pool.query(
        'SELECT vote_value FROM votes WHERE dapp_id = $1 AND voter_address = $2',
        [dappId, voterAddress.toLowerCase()]
    );
    return result.rows[0]?.vote_value || 0;
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

    // Dapp queries
    createDapp,
    getDapps,
    getDappById,
    getDappByName,
    approveDapp,
    deleteDapp,

    // Vote queries
    castVote,
    getUserVote
};
