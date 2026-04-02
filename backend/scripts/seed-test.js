const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://baseapps_db_user:TtY4DfPnZO72PmTUSGhhuv7uVDn7R1VU@dpg-d76ho0n5r7bs73c6ql0g-a.oregon-postgres.render.com/baseapps_db',
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        const data = JSON.parse(fs.readFileSync('./dapps-seed.json'));
        console.log('Found ' + data.dapps.length + ' dapps...\n');
        
        // Test connection first
        const testResult = await pool.query('SELECT COUNT(*) FROM dapps');
        console.log('Current dapps in DB: ' + testResult.rows[0].count);
        
        let success = 0;
        let failed = 0;
        
        for (const d of data.dapps.slice(0, 5)) {  // Try first 5 only
            try {
                await pool.query(
                    'INSERT INTO dapps(name, description, category, website_url, logo_url, chain, status, submitted_by) VALUES($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
                    [d.name, d.description || 'No description', d.category, d.url || d.websiteUrl, d.logo || d.logoUrl, d.chain || 'Base', 'approved', 'system']
                );
                console.log('✅ Inserted: ' + d.name);
                success++;
            } catch (e) {
                console.log('❌ Failed: ' + d.name + ' - ' + e.message);
                failed++;
            }
        }
        
        console.log('\nResults: ' + success + ' success, ' + failed + ' failed');
        
    } catch (error) {
        console.error('Fatal error:', error.message);
    } finally {
        await pool.end();
    }
}

seed();
