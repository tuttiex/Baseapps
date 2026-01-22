import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { HomeIcon, GridIcon, PlusIcon, BlogIcon, UserIcon, BountiesIcon } from './Icons';
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

                <div className="sidebar-footer">
                    <a
                        href="https://x.com/baseapps_"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar-x-link"
                        aria-label="Follow us on X (Twitter)"
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                    </a>
                    <div className="sidebar-footer-text">
                        BaseApps • Base Network
                    </div>
                </div>
            </div>
        </>
    );
}