
const { ethers } = require('ethers');
require('dotenv').config();

// BaseDappVoting Contract
const VOTING_CONTRACT_ADDRESS = "0x26a496b5dfcc453b0f3952c455af3aa6b729793c";

const ABI = [
    "function withdrawFees() external",
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
    const balance = await provider.getBalance(VOTING_CONTRACT_ADDRESS);
    console.log(`💰 Voting Contract Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
        console.log("⚠️ No fees to withdraw.");
        return;
    }

    const contract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, ABI, wallet);

    // Verify owner
    try {
        const owner = await contract.owner();
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            console.error(`❌ Error: You are not the owner. Owner is ${owner}`);
            return;
        }
    } catch (e) {
        console.log("⚠️ Could not verify owner (might be proxy or different ABI), attempting withdrawal anyway...");
    }

    console.log(`💸 Withdrawing voting fees...`);
    try {
        const tx = await contract.withdrawFees();
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Withdrawal successful!`);
    } catch (e) {
        console.error("❌ Withdrawal failed:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
