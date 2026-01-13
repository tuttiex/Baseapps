const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONTRACT_ADDRESS = '0x26a496b5dfcc453b0f3952c455af3aa6b729793c';
const RPC_URL = 'https://mainnet.base.org';

const ABI = [
    "function isDappRegistered(bytes32 dappId) view returns (bool)"
];

async function verify() {
    const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    const dappIdsPath = path.join(__dirname, '../dapp-ids.json');
    const dapps = JSON.parse(fs.readFileSync(dappIdsPath, 'utf8'));

    // Check 5 random dapps
    const samples = [0, 250, 500, 750, 1000];
    console.log("Checking on-chain status for samples...");

    for (const i of samples) {
        if (i >= dapps.length) continue;
        const dapp = dapps[i];
        try {
            const registered = await contract.isDappRegistered(dapp.dappId);
            console.log(`[${i}] ${dapp.name}: ${registered ? '✅ REGISTERED' : '❌ NOT REGISTERED'}`);
        } catch (e) {
            console.error(`Error checking ${dapp.name}:`, e.message);
        }
    }
}

verify().catch(console.error);
