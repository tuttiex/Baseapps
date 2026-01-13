import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_PATH = path.join(__dirname, '../dapps-cache.json');
const OUTPUT_PATH = path.join(__dirname, '../dapp-ids.json');

async function generateIds() {
    if (!fs.existsSync(CACHE_PATH)) {
        console.error('Cache file not found at:', CACHE_PATH);
        return;
    }

    const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    const dapps = data.dapps || [];

    const dappIdentities = dapps.map(dapp => {
        const lowerName = dapp.name.toLowerCase();
        const url = dapp.url;

        // Match Solidity: keccak256(abi.encode(string, string))
        const dappId = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ['string', 'string'],
                [lowerName, url]
            )
        );

        return {
            name: dapp.name,
            url: dapp.url,
            dappId: dappId
        };
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dappIdentities, null, 2));
    console.log(`Generated IDs for ${dappIdentities.length} dapps.`);
    console.log(`Mapping saved to: ${OUTPUT_PATH}`);
}

generateIds().catch(console.error);
