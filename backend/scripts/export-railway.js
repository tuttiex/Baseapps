require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const EXPORT_DIR = '/tmp/exports';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function exportDatabase() {
    try {
        console.log('📦 Starting database export...\n');

        if (!fs.existsSync(EXPORT_DIR)) {
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        }

        const tables = ['users', 'dapps', 'votes', 'user_favorites'];
        const results = {};

        for (const table of tables) {
            console.log(`📤 Exporting ${table}...`);
            const result = await pool.query(`SELECT * FROM ${table}`);
            const filePath = path.join(EXPORT_DIR, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(result.rows, null, 2));
            results[table] = result.rows.length;
            console.log(`   ✅ ${result.rows.length} rows exported to ${filePath}`);
        }

        console.log('\n📊 Export Summary:');
        Object.entries(results).forEach(([table, count]) => {
            console.log(`   ${table}: ${count}`);
        });
        console.log(`\n💾 Files saved to: ${EXPORT_DIR}`);
        console.log('\n⚠️  Download these files before the container restarts!');
        console.log('Command: railway run cat /tmp/exports/users.json > users.json');

        await pool.end();

    } catch (error) {
        console.error('❌ Export failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

exportDatabase();
