import { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API_URL = 'https://baseapps-production.up.railway.app/api';

const UserContext = createContext();

export function UserProvider({ children }) {
    const { address, isConnected } = useAccount();
    const { signIn: authSignIn, signOut: authSignOut, getToken, isAuthenticated } = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Auto-load user on mount if token exists
    useEffect(() => {
        const loadUser = async () => {
            const token = getToken();

            if (!token || !isAuthenticated()) {
                setUser(null);
                setLoading(false);
                return;
            }

            // Try to load cached user from localStorage
            const cachedUser = localStorage.getItem('user');
            if (cachedUser) {
                try {
                    const parsedUser = JSON.parse(cachedUser);
                    // Fix avatar URL if needed
                    if (parsedUser.avatarUrl && !parsedUser.avatarUrl.startsWith('http')) {
                        parsedUser.avatarUrl = `https://baseapps-production.up.railway.app${parsedUser.avatarUrl}`;
                    }
                    setUser(parsedUser);
                } catch (e) {
                    console.error('Error parsing cached user:', e);
                }
            }

            // Fetch fresh user data from API
            try {
                const response = await axios.get(`${API_URL}/profile/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    const freshUser = response.data.user;
                    // Fix avatar URL if needed
                    if (freshUser.avatarUrl && !freshUser.avatarUrl.startsWith('http')) {
                        freshUser.avatarUrl = `https://baseapps-production.up.railway.app${freshUser.avatarUrl}`;
                    }
                    setUser(freshUser);
                    localStorage.setItem('user', JSON.stringify(freshUser));
                }
            } catch (err) {
                console.error('Error loading user:', err);
                // If token is invalid, clear it
                if (err.response?.status === 401 || err.response?.status === 403) {
                    authSignOut();
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    // Clear user when wallet disconnects
    useEffect(() => {
        if (!isConnected && user) {
            handleSignOut();
        }
    }, [isConnected]);

    // Auto sign-in when wallet connects (if not already authenticated)
    useEffect(() => {
        let timeoutId;
        let isSubscribed = true;

        const autoSignIn = async () => {
            // Wait a bit for wallet to fully connect
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!isSubscribed) return;

            // Only attempt if wallet is connected, we have an address, and we're not already authenticated
            if (isConnected && address && !user && !loading) {
                const token = getToken();

                // Check if we have a valid token for this address
                let shouldSignIn = false;

                if (!token) {
                    shouldSignIn = true;
                } else {
                    // Check if token is valid and for the current address
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const isExpired = payload.exp * 1000 < Date.now();
                        const isWrongAddress = payload.address?.toLowerCase() !== address?.toLowerCase();

                        if (isExpired || isWrongAddress) {
                            shouldSignIn = true;
                        }
                    } catch {
                        shouldSignIn = true;
                    }
                }

                if (shouldSignIn) {
                    try {
                        console.log('Attempting auto sign-in...');
                        await handleSignIn();
                    } catch (err) {
                        // User cancelled or sign-in failed
                        console.log('Auto sign-in cancelled or failed:', err.message);
                    }
                }
            }
        };

        // Debounce the auto sign-in to prevent multiple attempts
        timeoutId = setTimeout(() => {
            autoSignIn();
        }, 1000);

        return () => {
            isSubscribed = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isConnected, address, user, loading]);

    /**
     * Sign in with wallet
     */
    const handleSignIn = async () => {
        setLoading(true);
        setError(null);

        try {
            const { user: newUser } = await authSignIn();
            setUser(newUser);
            return newUser;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sign out
     */
    const handleSignOut = () => {
        authSignOut();
        setUser(null);
    };

    /**
     * Update user profile
     */
    const updateProfile = async (updates) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const response = await axios.put(`${API_URL}/profile/me`, updates, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const updatedUser = response.data.user;
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                return updatedUser;
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            throw err;
        }
    };

    /**
     * Upload avatar
     */
    const uploadAvatar = async (file) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await axios.post(`${API_URL}/profile/avatar`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                const updatedUser = response.data.user;

                // Fix avatar URL to include full backend URL
                if (updatedUser.avatarUrl && !updatedUser.avatarUrl.startsWith('http')) {
                    updatedUser.avatarUrl = `https://baseapps-production.up.railway.app${updatedUser.avatarUrl}`;
                }

                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                return updatedUser;
            }
        } catch (err) {
            console.error('Error uploading avatar:', err);
            throw err;
        }
    };

    /**
     * Get favorites
     */
    const getFavorites = async () => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const response = await axios.get(`${API_URL}/profile/me/favorites`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.favorites || [];
        } catch (err) {
            console.error('Error getting favorites:', err);
            return [];
        }
    };

    /**
     * Add favorite
     */
    const addFavorite = async (dappName) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            await axios.post(`${API_URL}/profile/me/favorites`,
                { dappName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            console.error('Error adding favorite:', err);
            throw err;
        }
    };

    /**
     * Remove favorite
     */
    const removeFavorite = async (dappName) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            await axios.delete(`${API_URL}/profile/me/favorites/${encodeURIComponent(dappName)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Error removing favorite:', err);
            throw err;
        }
    };

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user && isAuthenticated(),
        signIn: handleSignIn,
        signOut: handleSignOut,
        updateProfile,
        uploadAvatar,
        getFavorites,
        addFavorite,
        removeFavorite,
        address,
        isConnected
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
}
