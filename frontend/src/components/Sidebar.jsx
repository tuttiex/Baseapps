import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { HomeIcon, GridIcon, PlusIcon, BlogIcon, UserIcon } from './Icons';
import './Sidebar.css';

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { name: 'Home', path: '/', icon: <HomeIcon size={20} /> },
        { name: 'All Dapps', path: '/all-dapps', icon: <GridIcon size={20} /> },
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
                    <h2 className="sidebar-title">Navigation</h2>
                    <button
                        className="sidebar-close"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close menu"
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
                    <div className="sidebar-footer-text">
                        BaseApps • Base Network
                    </div>
                </div>
            </div>
        </>
    );
}
