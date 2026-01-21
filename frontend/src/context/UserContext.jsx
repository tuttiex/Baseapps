import { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
                    setUser(JSON.parse(cachedUser));
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
                    setUser(response.data.user);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
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
