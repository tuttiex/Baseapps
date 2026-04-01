require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createDapp } = require('../db/queries');
const pool = require('../db/pool');

async function seedDatabase() {
    try {
        console.log('🌱 Starting Database Seeding from dapps-seed.json...');
        const seedFilePath = path.join(__dirname, '../dapps-seed.json');

        if (!fs.existsSync(seedFilePath)) {
            console.error(`❌ Seed file not found at: ${seedFilePath}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(seedFilePath, 'utf8');
        const data = JSON.parse(fileContent);

        if (!data.dapps || !Array.isArray(data.dapps)) {
            console.error('❌ Invalid JSON format: "dapps" array not found.');
            process.exit(1);
        }

        const totalDapps = data.dapps.length;
        console.log(`📦 Found ${totalDapps} dapps to process.\n`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (let i = 0; i < totalDapps; i++) {
            const dapp = data.dapps[i];

            // Provide visual progress
            if (i % 50 === 0 && i !== 0) {
                console.log(`⏳ Processed ${i}/${totalDapps}...`);
            }

            try {
                await createDapp({
                    name: dapp.name,
                    description: dapp.description || 'No description provided.',
                    category: dapp.category || 'Other',
                    subcategory: dapp.subcategory || null,
                    websiteUrl: dapp.url || dapp.websiteUrl || '#',
                    logoUrl: dapp.logo || '/placeholder-logo.png',
                    chain: dapp.chain || 'Base',
                    status: 'approved',
                    submittedBy: dapp.submittedBy || 'Tuttiex System'
                });
                successCount++;
            } catch (error) {
                if (error.message.includes('already exists')) {
                    skipCount++;
                } else {
                    console.error(`\n❌ Error inserting "${dapp.name}": ${error.message}`);
                    errorCount++;
                }
            }
        }

        console.log('\n--- Seeding Complete ---');
        console.log(`✅ Successfully inserted: ${successCount}`);
        console.log(`⏭️  Skipped (already exists): ${skipCount}`);
        console.log(`❌ Errors: ${errorCount}`);

        // Close the database pool connection
        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('💥 Fatal Error during seeding:', error);
        process.exit(1);
    }
}

seedDatabase();
