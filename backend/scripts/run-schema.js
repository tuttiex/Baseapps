require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Connect to Render database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runSchema() {
    try {
        console.log('🔌 Connecting to Render database...');
        
        // Read schema file
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📜 Running schema.sql...\n');
        
        // Execute schema
        await pool.query(schemaSQL);
        
        console.log('\n✅ Schema created successfully!');
        console.log('📊 Tables created: users, auth_nonces, user_favorites, dapps, votes');
        
    } catch (error) {
        console.error('❌ Schema creation failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runSchema();
