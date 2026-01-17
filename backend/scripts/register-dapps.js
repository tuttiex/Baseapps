const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = '0x26a496b5dfcc453b0f3952c455af3aa6b729793c';
const RPC_URL = 'https://mainnet.base.org';
const BATCH_SIZE = 100;
const CHECK_BATCH_SIZE = 10;
const DELAY_BETWEEN_CHECKS = 150;

const CACHE_PATH = path.join(__dirname, '../dapps-cache.json');
const APPROVED_PATH = path.join(__dirname, '../data/approved_dapps.json');

const SUBMITTED_PATH = path.join(__dirname, '../data/submitted_dapps.json');
const DAPP_IDS_FILE = path.join(__dirname, '../dapp-ids.json');

const ABI = [
    "function batchRegisterDapps(bytes32[] calldata dappIds) external",
    "function isDappRegistered(bytes32 dappId) view returns (bool)"
];

function generateDappId(name, url) {
    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ['string', 'string'],
            [name.toLowerCase(), url]
        )
    );
}

async function main() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error("❌ PRIVATE_KEY missing in .env");
        return;
    }

    console.log(`🚀 Starting Intelligent Dapp Registration Sync`);
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // 1. Collect all potential dapps from all sources
    console.log(`📦 Discovering dapps...`);
    const allSources = [];

    if (fs.existsSync(CACHE_PATH)) {
        const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
        allSources.push(...(cache.dapps || []));
    }
    if (fs.existsSync(APPROVED_PATH)) {
        allSources.push(...JSON.parse(fs.readFileSync(APPROVED_PATH, 'utf8')));
    }
    if (fs.existsSync(SUBMITTED_PATH)) {
        // We usually don't register submitted but just in case
        allSources.push(...JSON.parse(fs.readFileSync(SUBMITTED_PATH, 'utf8')));
    }

    // Deduplicate by URL
    const uniqueDapps = Array.from(new Map(allSources.map(d => [d.url, d])).values());
    console.log(`🔍 Found ${uniqueDapps.length} unique dapps in total.`);

    // 2. Generate IDs
    const dappsWithIds = uniqueDapps.map(d => ({
        ...d,
        dappId: generateDappId(d.name, d.url)
    }));

    // SAVE IDs to JSON so Server can use them
    const idMap = dappsWithIds.map(d => ({
        name: d.name,
        url: d.url,
        dappId: d.dappId
    }));
    fs.writeFileSync(DAPP_IDS_FILE, JSON.stringify(idMap, null, 2));
    console.log(`💾 Saved ${idMap.length} dapp IDs to dapp-ids.json`);

    // 3. Check registration status
    console.log(`🔍 Checking on-chain status (Throttled)...`);
    const toRegister = [];

    for (let i = 0; i < dappsWithIds.length; i += CHECK_BATCH_SIZE) {
        const batch = dappsWithIds.slice(i, i + CHECK_BATCH_SIZE);
        process.stdout.write(`\rProgress: ${i}/${dappsWithIds.length} checked...`);

        const results = await Promise.all(batch.map(async (dapp) => {
            try {
                const isRegistered = await contract.isDappRegistered(dapp.dappId);
                return isRegistered ? null : dapp.dappId;
            } catch (e) {
                return dapp.dappId; // Assume unregistered on RPC error to be safe
            }
        }));

        toRegister.push(...results.filter(id => id !== null));
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_CHECKS));
    }

    console.log(`\n📊 Found ${toRegister.length} dapps that need registration.`);

    if (toRegister.length === 0) {
        console.log("✅ All discovered dapps are already registered!");
        return;
    }

    // 4. Register in batches
    for (let i = 0; i < toRegister.length; i += BATCH_SIZE) {
        const batch = toRegister.slice(i, i + BATCH_SIZE);
        console.log(`📦 Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} dapps)...`);

        let batchSuccess = false;
        let batchRetries = 2;

        while (!batchSuccess && batchRetries >= 0) {
            try {
                const tx = await contract.batchRegisterDapps(batch);
                console.log(`⏳ Tx: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ Confirmed!`);
                batchSuccess = true;
                await new Promise(r => setTimeout(r, 10000)); // 10s delay to respect RPC
            } catch (error) {
                console.error(`❌ Batch failed (Retries left: ${batchRetries}):`, error.message);
                if (error.message.includes('insufficient funds')) {
                    console.log(`⚠️ Out of gas. Stopping here for now.`);
                    return;
                }
                batchRetries--;
                await new Promise(r => setTimeout(r, 15000)); // Wait 15s before retry
            }
        }
    }

    console.log(`\n🎉 Sync process finished.`);
}

main().catch(console.error);
