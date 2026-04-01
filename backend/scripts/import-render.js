require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const IMPORT_DIR = '/tmp/imports';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function importDatabase() {
    try {
        console.log('📦 Starting database import to Render...\n');

        const tables = ['users', 'dapps', 'votes', 'user_favorites'];
        const results = {};

        for (const table of tables) {
            const filePath = path.join(IMPORT_DIR, `${table}.json`);
            
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  Skipping ${table}: file not found`);
                continue;
            }

            console.log(`📥 Importing ${table}...`);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (data.length === 0) {
                console.log(`   ℹ️  No data to import`);
                results[table] = 0;
                continue;
            }

            // Get columns from first row
            const columns = Object.keys(data[0]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            
            let inserted = 0;
            let skipped = 0;

            for (const row of data) {
                const values = columns.map(col => row[col]);
                
                try {
                    await pool.query(
                        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                        values
                    );
                    inserted++;
                } catch (err) {
                    if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
                        skipped++;
                    } else {
                        console.error(`   ⚠️  Error inserting row: ${err.message}`);
                        skipped++;
                    }
                }
            }

            results[table] = { inserted, skipped, total: data.length };
            console.log(`   ✅ ${inserted} inserted, ${skipped} skipped (duplicates/errors)`);
        }

        console.log('\n📊 Import Summary:');
        Object.entries(results).forEach(([table, result]) => {
            if (typeof result === 'object') {
                console.log(`   ${table}: ${result.inserted} new, ${result.skipped} existing (total: ${result.total})`);
            } else {
                console.log(`   ${table}: ${result} rows`);
            }
        });

        await pool.end();
        console.log('\n✅ Import complete!');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

importDatabase();
