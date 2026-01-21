import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useAccount, useBalance, useDisconnect } from 'wagmi';

export function UserAuth() {
    const { user, isAuthenticated, signOut } = useUser();
    const { address } = useAccount();
    const { data: balance } = useBalance({ address });
    const { disconnect } = useDisconnect();
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleDisconnect = () => {
        disconnect();
        signOut();
        setShowMenu(false);
    };

    const handleCopyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleViewOnBasescan = () => {
        if (address) {
            window.open(`https://basescan.org/address/${address}`, '_blank');
        }
    };

    // Don't show anything if not authenticated (auto-sign-in handles login)
    if (!isAuthenticated || !user) {
        return null;
    }

    const formattedBalance = balance
        ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
        : '0.0000 ETH';

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
                        <div className="menu-section menu-wallet-info">
                            <div className="wallet-address-display">
                                {user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
                            </div>
                            <div className="wallet-balance">{formattedBalance}</div>
                        </div>

                        <div className="menu-divider" />

                        <a href={`/profile/${user?.walletAddress}`} className="menu-item">
                            👤 My Profile
                        </a>
                        <a href={`/profile/${user?.walletAddress}#favorites`} className="menu-item">
                            ⭐ Favorites
                        </a>

                        <div className="menu-divider" />

                        <button onClick={handleCopyAddress} className="menu-item">
                            {copied ? '✅ Copied!' : '📋 Copy Address'}
                        </button>
                        <button onClick={handleViewOnBasescan} className="menu-item">
                            🔍 View on Basescan
                        </button>

                        <div className="menu-divider" />

                        <button onClick={handleDisconnect} className="menu-item menu-item-danger">
                            🚪 Disconnect Wallet
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
