require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createDapp, castVote, getDappByName } = require('../db/queries');
const pool = require('../db/pool');

const DATA_DIR = path.join(__dirname, '../data');

async function migrate() {
    try {
        console.log('🚀 Starting Data Migration to Database...');

        const dappsPath = path.join(DATA_DIR, 'approved_dapps.json');
        const submissionsPath = path.join(DATA_DIR, 'submitted_dapps.json');
        const votesPath = path.join(DATA_DIR, 'votes.json');

        // 1. Migrate Approved Dapps
        if (fs.existsSync(dappsPath)) {
            const approvedDapps = JSON.parse(fs.readFileSync(dappsPath, 'utf8'));
            console.log(`📦 Found ${approvedDapps.length} approved dapps.`);

            for (const dapp of approvedDapps) {
                try {
                    await createDapp({
                        name: dapp.name,
                        description: dapp.description,
                        category: dapp.category,
                        subcategory: dapp.subcategory,
                        websiteUrl: dapp.url || dapp.websiteUrl,
                        logoUrl: dapp.logo,
                        chain: dapp.chain,
                        status: 'approved',
                        submittedBy: dapp.submittedBy
                    });
                    process.stdout.write('.');
                } catch (e) {
                    if (e.message.includes('already exists')) {
                        process.stdout.write('S'); // Skip
                    } else {
                        console.error(`\n❌ Error migrating ${dapp.name}:`, e.message);
                    }
                }
            }
            console.log('\n✅ Approved Dapps Migrated.');
        }

        // 2. Migrate Pending Submissions
        if (fs.existsSync(submissionsPath)) {
            const submissions = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
            console.log(`📦 Found ${submissions.length} pending submissions.`);

            for (const sub of submissions) {
                try {
                    await createDapp({
                        name: sub.name,
                        description: sub.description,
                        category: sub.category,
                        subcategory: sub.subcategory,
                        websiteUrl: sub.websiteUrl,
                        logoUrl: sub.logo,
                        chain: 'Base',
                        status: 'pending',
                        submittedBy: sub.submittedBy
                    });
                    process.stdout.write('.');
                } catch (e) {
                    if (e.message.includes('already exists')) {
                        process.stdout.write('S');
                    } else {
                        console.error(`\n❌ Error migrating submission ${sub.name}:`, e.message);
                    }
                }
            }
            console.log('\n✅ Submissions Migrated.');
        }

        // 3. Migrate Votes
        if (fs.existsSync(votesPath)) {
            const votes = JSON.parse(fs.readFileSync(votesPath, 'utf8'));
            console.log(`📦 Found ${votes.length} votes.`);

            let successCount = 0;
            for (const vote of votes) {
                try {
                    // Votes in JSON only have dappId or Name. We need to find the DB ID.
                    // Assuming old votes key off a 'dappId' which might be different, 
                    // OR they key off name. 
                    // To be safe, we need to map the old ID/Name to the new DB ID.

                    // IF vote has a name property, use that.
                    // IF vote has dappId, we need to know what name that maps to.
                    // We can check dapp-ids.json if needed.

                    // Simple approach: Check if we can find the dapp by name in DB if we have that info?
                    // The old logic cached votes by 'dappId'.

                    // Load mapping
                    const dappIdMapPath = path.join(__dirname, '../dapp-ids.json');
                    let dappIdToName = {};
                    if (fs.existsSync(dappIdMapPath)) {
                        const map = JSON.parse(fs.readFileSync(dappIdMapPath, 'utf8'));
                        map.forEach(m => dappIdToName[m.dappId] = m.name);
                    }

                    const dappName = dappIdToName[vote.dappId];
                    if (!dappName) continue; // Cant migrate orphan votes

                    const dbDapp = await getDappByName(dappName);
                    if (dbDapp) {
                        await castVote(dbDapp.id, vote.voter, vote.value);
                        successCount++;
                        process.stdout.write('.');
                    }
                } catch (e) {
                    // console.error(e.message); 
                }
            }
            console.log(`\n✅ Migrated ${successCount} votes.`);
        }

        await pool.end();
        console.log('🎉 Migration Complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
