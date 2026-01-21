const { verifyMessage } = require('ethers');
const crypto = require('crypto');

/**
 * Verify that a signature was created by the owner of the wallet address
 * @param {string} address - Ethereum wallet address
 * @param {string} message - Original message that was signed
 * @param {string} signature - Signature from wallet
 * @returns {boolean} True if signature is valid
 */
function verifySignature(address, message, signature) {
    try {
        const recoveredAddress = verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
        console.error('Signature verification failed:', error.message);
        return false;
    }
}

/**
 * Generate a random nonce for authentication
 * @returns {string} Random hex string
 */
function generateNonce() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create the message to be signed by the user
 * @param {string} nonce - Random nonce
 * @returns {string} Message to sign
 */
function createSignMessage(nonce) {
    const timestamp = Date.now();
    return `Sign in to BaseApps\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

module.exports = {
    verifySignature,
    generateNonce,
    createSignMessage,
};
