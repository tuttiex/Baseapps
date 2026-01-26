require('dotenv').config();
const fs = require('fs');
const pool = require('./db/pool');

async function runSchema() {
    try {
        console.log('📂 Reading schema file...');
        const schema = fs.readFileSync('./db/schema.sql', 'utf8');

        console.log('🚀 Executing schema...');
        // Dapps Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dapps (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                category VARCHAR(100),
                subcategory VARCHAR(100),
                website_url VARCHAR(255),
                logo_url VARCHAR(255),
                chain VARCHAR(50) DEFAULT 'Base',
                status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
                submitted_by VARCHAR(42),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Votes Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                dapp_id INTEGER REFERENCES dapps(id) ON DELETE CASCADE,
                voter_address VARCHAR(42) NOT NULL,
                vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(dapp_id, voter_address)
            );
        `);

        console.log('✅ Schema executed successfully!');
        console.log('\n📊 Verifying tables created...');

        const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

        console.log('\n✅ Tables created:');
        result.rows.forEach(row => {
            console.log(`   - ${row.tablename}`);
        });

        await pool.end();
        console.log('\n🎉 Database setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error running schema:');
        console.error('Message:', error.message);
        console.error('Detail:', error.detail);
        console.error('Hint:', error.hint);
        process.exit(1);
    }
}

runSchema();
