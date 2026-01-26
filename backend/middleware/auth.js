const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and attach user to request
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Attach wallet address to request
        req.walletAddress = decoded.walletAddress;
        next();
    });
}

/**
 * Optional authentication - doesn't fail if no token
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) {
            req.walletAddress = decoded.walletAddress;
        }
        next();
    });
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdminSecret
};

/**
 * Middleware to require Admin Secret in Authorization header
 */
function requireAdminSecret(req, res, next) {
    const authHeader = req.headers['authorization'];

    // Support "Bearer <SECRET>" or just "<SECRET>"
    const token = authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader) : null;
    const ADMIN_SECRET = process.env.ADMIN_SECRET;

    // Fail securely if secret is not configured
    if (!ADMIN_SECRET) {
        console.error('SECURITY ERROR: ADMIN_SECRET environment variable is not set. Admin access disabled.');
        return res.status(500).json({
            success: false,
            error: 'Server security configuration error'
        });
    }

    if (!token || token !== ADMIN_SECRET) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid Admin Secret'
        });
    }

    next();
}
