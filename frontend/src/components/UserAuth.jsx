import { useState, useRef, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useAccount, useBalance, useDisconnect } from 'wagmi';

// SVG Icons
const WalletIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
    </svg>
);

const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const StarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const LogoutIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);

export function UserAuth() {
    const { user, isAuthenticated, signIn, signOut, isConnected } = useUser();
    const { address } = useAccount();
    const { data: balance } = useBalance({ address });
    const { disconnect } = useDisconnect();
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [signInError, setSignInError] = useState(null);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleSignIn = async () => {
        setSigningIn(true);
        setSignInError(null);

        try {
            console.log('Manual sign-in initiated...');
            await signIn();
            console.log('Sign-in successful');
        } catch (error) {
            console.error('Sign in failed:', error);

            // Show user-friendly error message
            if (error.message?.includes('User rejected')) {
                setSignInError('Signature request was rejected');
            } else if (error.message?.includes('not connected')) {
                setSignInError('Please connect your wallet first');
            } else {
                setSignInError('Sign-in failed. Please try again');
            }

            // Clear error after 5 seconds
            setTimeout(() => setSignInError(null), 5000);
        } finally {
            setSigningIn(false);
        }
    };

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

    // Connected but not authenticated - show Sign In button
    if (isConnected && !isAuthenticated) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <button
                    className="sign-in-btn"
                    onClick={handleSignIn}
                    disabled={signingIn}
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: signingIn ? 'not-allowed' : 'pointer',
                        opacity: signingIn ? 0.6 : 1,
                        transition: 'all 0.2s',
                    }}
                >
                    {signingIn ? 'Signing In...' : 'Sign In'}
                </button>
                {signInError && (
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#ff4444',
                        padding: '0.5rem',
                        background: 'rgba(255, 68, 68, 0.1)',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap'
                    }}>
                        {signInError}
                    </div>
                )}
            </div>
        );
    }

    // Not authenticated - don't show anything (ConnectWallet handles it)
    if (!isAuthenticated || !user) {
        return null;
    }

    const formattedBalance = balance
        ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
        : '0.0000 ETH';

    // Authenticated - show user menu
    return (
        <div className="user-auth" ref={menuRef}>
            <button
                className="user-menu-trigger"
                onClick={() => setShowMenu(!showMenu)}
            >
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username || 'User'} className="user-avatar-small" />
                ) : (
                    <div className="user-avatar-placeholder">
                        {user?.username?.[0]?.toUpperCase() || <UserIcon size={16} />}
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
                            <div className="wallet-info-header">
                                <WalletIcon />
                                <span className="wallet-info-label">Balance</span>
                            </div>
                            <div className="wallet-address-display">
                                {user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
                            </div>
                            <div className="wallet-balance">{formattedBalance}</div>
                        </div>

                        <div className="menu-divider" />

                        <a href={`/profile/${user?.walletAddress}`} className="menu-item">
                            <UserIcon />
                            <span>Profile</span>
                        </a>
                        <a href={`/profile/${user?.walletAddress}#favorites`} className="menu-item">
                            <StarIcon />
                            <span>Favorites</span>
                        </a>

                        <div className="menu-divider" />

                        <button onClick={handleCopyAddress} className="menu-item">
                            {copied ? <CheckIcon /> : <CopyIcon />}
                            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                        </button>

                        <div className="menu-divider" />

                        <button onClick={handleDisconnect} className="menu-item menu-item-danger">
                            <LogoutIcon />
                            <span>Disconnect</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
