import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import axios from 'axios';

const API_URL = 'https://baseapps-production.up.railway.app/api';

/**
 * Authentication hook for wallet-based sign-in
 * Handles nonce generation, message signing, and JWT verification
 */
export function useAuth() {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Sign in with connected wallet
     * @returns {Object} { token, user } on success
     */
    const signIn = async () => {
        if (!address || !isConnected) {
            throw new Error('Wallet not connected');
        }

        setLoading(true);
        setError(null);

        try {
            // Step 1: Request nonce from backend
            const nonceResponse = await axios.get(`${API_URL}/auth/nonce`, {
                params: { address }
            });

            const { message } = nonceResponse.data;

            // Step 2: Sign the message with wallet
            const signature = await signMessageAsync({ message });

            // Step 3: Verify signature and get JWT
            const verifyResponse = await axios.post(`${API_URL}/auth/verify`, {
                address,
                signature,
                message
            });

            const { token, user } = verifyResponse.data;

            // Step 4: Store token in localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));

            setLoading(false);
            return { token, user };
        } catch (err) {
            console.error('Sign in error:', err);
            setError(err.response?.data?.error || err.message || 'Sign in failed');
            setLoading(false);
            throw err;
        }
    };

    /**
     * Sign out - clear localStorage and state
     */
    const signOut = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    };

    /**
     * Get stored auth token
     */
    const getToken = () => {
        return localStorage.getItem('auth_token');
    };

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = () => {
        const token = getToken();
        if (!token) return false;

        // Optional: Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            return !isExpired;
        } catch {
            return false;
        }
    };

    return {
        signIn,
        signOut,
        getToken,
        isAuthenticated,
        loading,
        error,
        address,
        isConnected
    };
}
