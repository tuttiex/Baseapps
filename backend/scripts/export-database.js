require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const EXPORT_DIR = path.join(__dirname, '../data/exports');

// Create pool with Railway public URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:nIyGLJhcXCnOzAedmBxjPfShyeelhgdF@switchback.proxy.rlwy.net:50617/railway',
    ssl: {
        rejectUnauthorized: false
    },
    max: 5,
    connectionTimeoutMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
});

async function exportDatabase() {
    try {
        console.log('📦 Starting database export from Railway...\n');

        // Create export directory
        if (!fs.existsSync(EXPORT_DIR)) {
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        }

        // Test connection first
        console.log('🔌 Testing database connection...');
        await pool.query('SELECT 1');
        console.log('✅ Connected to Railway database\n');

        // Export users
        console.log('👥 Exporting users...');
        const usersResult = await pool.query('SELECT * FROM users');
        fs.writeFileSync(
            path.join(EXPORT_DIR, 'users.json'),
            JSON.stringify(usersResult.rows, null, 2)
        );
        console.log(`   ✅ ${usersResult.rows.length} users exported`);

        // Export dapps
        console.log('📱 Exporting dapps...');
        const dappsResult = await pool.query('SELECT * FROM dapps');
        fs.writeFileSync(
            path.join(EXPORT_DIR, 'dapps.json'),
            JSON.stringify(dappsResult.rows, null, 2)
        );
        console.log(`   ✅ ${dappsResult.rows.length} dapps exported`);

        // Export votes
        console.log('🗳️  Exporting votes...');
        const votesResult = await pool.query('SELECT * FROM votes');
        fs.writeFileSync(
            path.join(EXPORT_DIR, 'votes.json'),
            JSON.stringify(votesResult.rows, null, 2)
        );
        console.log(`   ✅ ${votesResult.rows.length} votes exported`);

        // Export user_favorites
        console.log('⭐ Exporting user favorites...');
        const favoritesResult = await pool.query('SELECT * FROM user_favorites');
        fs.writeFileSync(
            path.join(EXPORT_DIR, 'user_favorites.json'),
            JSON.stringify(favoritesResult.rows, null, 2)
        );
        console.log(`   ✅ ${favoritesResult.rows.length} favorites exported`);

        // Summary
        console.log('\n📊 Export Summary:');
        console.log(`   Users: ${usersResult.rows.length}`);
        console.log(`   Dapps: ${dappsResult.rows.length}`);
        console.log(`   Votes: ${votesResult.rows.length}`);
        console.log(`   Favorites: ${favoritesResult.rows.length}`);
        console.log(`\n💾 Files saved to: ${EXPORT_DIR}`);

        // Close pool
        await pool.end();
        console.log('\n✅ Export complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Export failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

exportDatabase();
