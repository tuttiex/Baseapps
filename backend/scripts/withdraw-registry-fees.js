
const { ethers } = require('ethers');
require('dotenv').config();

const REGISTRY_CONTRACT_ADDRESS = "0x138cDd6C3007AE1E4F3818CAdeD3E1fF813b1961";

const ABI = [
    "function withdraw() external",
    "function owner() view returns (address)"
];

async function main() {
    if (!process.env.PRIVATE_KEY) {
        throw new Error("Please set PRIVATE_KEY in .env file");
    }

    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log(`📡 Connecting to Base Mainnet...`);
    console.log(`🔑 Wallet: ${wallet.address}`);

    // Check balance of contract
    const balance = await provider.getBalance(REGISTRY_CONTRACT_ADDRESS);
    console.log(`💰 Contract Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
        console.log("⚠️ No fees to withdraw.");
        return;
    }

    const contract = new ethers.Contract(REGISTRY_CONTRACT_ADDRESS, ABI, wallet);

    // Verify owner
    const owner = await contract.owner();
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error(`❌ Error: You are not the owner. Owner is ${owner}`);
        return;
    }

    console.log(`💸 Withdrawing fees...`);
    const tx = await contract.withdraw();
    console.log(`⏳ Transaction sent: ${tx.hash}`);

    await tx.wait();
    console.log(`✅ Withdrawal successful!`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
