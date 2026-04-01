const { Pool } = require('pg');

// Create PostgreSQL connection pool
// Works with Railway (current) and Render (target)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com')
        ? { rejectUnauthorized: false }  // Render requires SSL
        : { rejectUnauthorized: false }, // Railway also requires SSL
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ Database connected');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

module.exports = pool;
