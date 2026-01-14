const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = '0x26a496b5dfcc453b0f3952c455af3aa6b729793c';
const RPC_URL = 'https://mainnet.base.org';
const CHECK_BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 100;

const ABI = [
    "function isDappRegistered(bytes32 dappId) view returns (bool)"
];

const CACHE_PATH = path.join(__dirname, '../dapps-cache.json');
const REG_CACHE_PATH = path.join(__dirname, '../data/registrations.json');

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    if (!fs.existsSync(CACHE_PATH)) {
        console.error("Cache file not found");
        return;
    }

    const { dapps } = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    const registrationCache = fs.existsSync(REG_CACHE_PATH) ? JSON.parse(fs.readFileSync(REG_CACHE_PATH, 'utf8')) : {};

    console.log(`🔍 Checking registration status for ${dapps.length} dapps...`);

    for (let i = 0; i < dapps.length; i += CHECK_BATCH_SIZE) {
        const batch = dapps.slice(i, i + CHECK_BATCH_SIZE);
        process.stdout.write(`\rProgress: ${i}/${dapps.length}...`);

        await Promise.all(batch.map(async (dapp) => {
            const dappId = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ['string', 'string'],
                    [dapp.name.toLowerCase(), dapp.url]
                )
            );
            try {
                const isRegistered = await contract.isDappRegistered(dappId);
                registrationCache[dappId] = isRegistered;
            } catch (e) {
                // Keep existing status on error
            }
        }));
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }

    fs.writeFileSync(REG_CACHE_PATH, JSON.stringify(registrationCache, null, 2));
    console.log(`\n✅ Registration cache updated. Total registered: ${Object.values(registrationCache).filter(v => v === true).length}`);
}

main().catch(console.error);
