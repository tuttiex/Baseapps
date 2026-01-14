const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = '0x26a496b5dfcc453b0f3952c455af3aa6b729793c';
const RPC_URLS = [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://1rpc.io/base'
];

const ABI = ["function isDappRegistered(bytes32 dappId) view returns (bool)"];
const CACHE_PATH = path.join(__dirname, '../dapps-cache.json');
const REG_CACHE_PATH = path.join(__dirname, '../data/registrations.json');

async function main() {
    let providerIndex = 0;
    let provider = new ethers.JsonRpcProvider(RPC_URLS[providerIndex]);
    let contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    const switchProvider = () => {
        providerIndex = (providerIndex + 1) % RPC_URLS.length;
        console.log(`\n🔄 Switching to RPC: ${RPC_URLS[providerIndex]}`);
        provider = new ethers.JsonRpcProvider(RPC_URLS[providerIndex]);
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    };

    const { dapps } = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    const registrationCache = fs.existsSync(REG_CACHE_PATH) ? JSON.parse(fs.readFileSync(REG_CACHE_PATH, 'utf8')) : {};

    console.log(`🔍 Robust Sync: Checking ${dapps.length} dapps...`);

    for (let i = 0; i < dapps.length; i++) {
        const dapp = dapps[i];
        const dappId = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(['string', 'string'], [dapp.name.toLowerCase(), dapp.url])
        );

        let retries = 3;
        while (retries > 0) {
            try {
                const isRegistered = await contract.isDappRegistered(dappId);
                registrationCache[dappId] = isRegistered;
                if (i % 50 === 0) process.stdout.write(`\rProgress: ${i}/${dapps.length} checked...`);
                break;
            } catch (e) {
                retries--;
                if (retries === 0) {
                    console.error(`\n❌ Failed at ${dapp.name} after retries: ${e.message}`);
                    switchProvider();
                    retries = 3; // Reset for new provider
                }
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    fs.writeFileSync(REG_CACHE_PATH, JSON.stringify(registrationCache, null, 2));
    const count = Object.values(registrationCache).filter(v => v === true).length;
    console.log(`\n✅ Finished. Total registered: ${count}`);
}

main().catch(console.error);
