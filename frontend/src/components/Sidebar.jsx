import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { ConnectWallet } from './ConnectWallet';
import { HomeIcon, GridIcon, PlusIcon, BlogIcon, UserIcon, BountiesIcon, XIcon, GithubIcon, UsersIcon } from './Icons';
import './Sidebar.css';

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { name: 'Home', path: '/', icon: <HomeIcon size={20} /> },
        { name: 'All Dapps', path: '/all-dapps', icon: <GridIcon size={20} /> },
        { name: 'Bounties', path: '/bounties', icon: <BountiesIcon size={20} /> },
        { name: 'Add Dapp', path: '/add-dapps', icon: <PlusIcon size={20} /> },
        { name: 'Blog', path: '/blog', icon: <BlogIcon size={20} /> },
    ];

    // Add profile link if authenticated
    if (isAuthenticated && user?.walletAddress) {
        menuItems.push({
            name: 'My Profile',
            path: `/profile/${user.walletAddress}`,
            icon: <UserIcon size={20} />
        });
    }

    const handleNavigate = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    return (
        <>
            {/* Hamburger Button */}
            <button
                className="hamburger-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
            >
                <div className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <button
                        className="sidebar-close"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close menu"
                        style={{ marginLeft: 'auto' }}
                    >
                        ✕
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => handleNavigate(item.path)}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-text">{item.name}</span>
                            <span className="sidebar-arrow">→</span>
                        </button>
                    ))}
                </nav>

                {/* CTA Section */}
                <div className="sidebar-cta">
                    <ConnectWallet />
                </div>

                {/* Footer */}
                <div className="sidebar-footer">
                    <div className="sidebar-socials">
                        <a
                            href="https://x.com/baseapps_"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sidebar-social-link"
                            aria-label="Follow us on X (Twitter)"
                        >
                            <XIcon size={18} />
                        </a>
                        <a
                            href="#"
                            className="sidebar-social-link"
                            aria-label="Discord"
                        >
                            <UsersIcon size={18} />
                        </a>
                        <a
                            href="#"
                            className="sidebar-social-link"
                            aria-label="GitHub"
                        >
                            <GithubIcon size={18} />
                        </a>
                    </div>
                    <div className="sidebar-status">
                        <span className="sidebar-status-label">Built on Base</span>
                        <div className="sidebar-status-indicator">
                            <span className="status-dot"></span>
                            <span className="status-text">Mainnet Live</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}