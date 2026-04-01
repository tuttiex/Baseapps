const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DUMP_FILE = '/tmp/railway_dump.sql';

async function dumpDatabase() {
    try {
        console.log('📦 Dumping Railway PostgreSQL database...\n');
        
        // Run pg_dump
        execSync(`pg_dump "$DATABASE_URL" > ${DUMP_FILE}`, {
            stdio: 'inherit',
            shell: true
        });
        
        const stats = fs.statSync(DUMP_FILE);
        console.log(`\n✅ Dump successful!`);
        console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`💾 Location: ${DUMP_FILE}`);
        console.log(`\n📥 To download, run locally:`);
        console.log(`   railway run cat ${DUMP_FILE} > railway_dump.sql`);
        
    } catch (error) {
        console.error('❌ Dump failed:', error.message);
        process.exit(1);
    }
}

dumpDatabase();
