import { useState } from 'react';
import { useUser } from '../context/UserContext';

export function UserAuth() {
    const { user, isAuthenticated, signOut } = useUser();
    const [showMenu, setShowMenu] = useState(false);

    const handleSignOut = () => {
        signOut();
        setShowMenu(false);
    };

    // Don't show anything if not authenticated (auto-sign-in handles login)
    if (!isAuthenticated || !user) {
        return null;
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
