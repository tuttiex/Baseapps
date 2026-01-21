import { useState } from 'react';
import { useUser } from '../context/UserContext';

export function UserAuth() {
    const { user, isAuthenticated, signIn, signOut, loading, isConnected } = useUser();
    const [showMenu, setShowMenu] = useState(false);
    const [signingIn, setSigningIn] = useState(false);

    const handleSignIn = async () => {
        setSigningIn(true);
        try {
            await signIn();
        } catch (error) {
            console.error('Sign in failed:', error);
        } finally {
            setSigningIn(false);
        }
    };

    const handleSignOut = () => {
        signOut();
        setShowMenu(false);
    };

    // Show loading state
    if (loading) {
        return <div className="user-auth-loading">Loading...</div>;
    }

    // Not connected to wallet
    if (!isConnected) {
        return null; // RainbowKit ConnectWallet button handles this
    }

    // Connected but not authenticated
    if (!isAuthenticated) {
        return (
            <button
                className="sign-in-btn"
                onClick={handleSignIn}
                disabled={signingIn}
            >
                {signingIn ? '🔄 Signing...' : '✍️ Sign In'}
            </button>
        );
    }

    // Authenticated - show user menu
    return (
        <div className="user-auth">
            <button
                className="user-menu-trigger"
                onClick={() => setShowMenu(!showMenu)}
            >
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username || 'User'} className="user-avatar-small" />
                ) : (
                    <div className="user-avatar-placeholder">
                        {user?.username?.[0]?.toUpperCase() || '👤'}
                    </div>
                )}
                <span className="user-name">
                    {user?.username || `${user?.walletAddress?.slice(0, 6)}...${user?.walletAddress?.slice(-4)}`}
                </span>
                <span className="dropdown-arrow">▼</span>
            </button>

            {showMenu && (
                <>
                    <div className="menu-overlay" onClick={() => setShowMenu(false)} />
                    <div className="user-menu">
                        <a href={`/profile/${user?.walletAddress}`} className="menu-item">
                            👤 My Profile
                        </a>
                        <a href={`/profile/${user?.walletAddress}#favorites`} className="menu-item">
                            ⭐ Favorites
                        </a>
                        <button onClick={handleSignOut} className="menu-item menu-item-danger">
                            🚪 Sign Out
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
