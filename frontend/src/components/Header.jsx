import { Link, useLocation } from 'react-router-dom';
import { ConnectWallet } from './ConnectWallet';
import { UserAuth } from './UserAuth';
import { Sidebar } from './Sidebar';

export function Header() {
    const location = useLocation();
    
    const navLinks = [
        { name: 'Explore', path: '/all-dapps' },
        { name: 'News', path: '/blog' },
        { name: 'Submit', path: '/add-dapps' },
        { name: 'Bounties', path: '/bounties' },
    ];
    
    return (
        <header className="header">
            <div className="container header-content">
                <div className="header-left">
                    <Sidebar />
                    <Link to="/" className="logo-container" style={{ textDecoration: 'none' }}>
                        <img src="/Baseappslogo3.png" alt="BaseApps" className="logo" />
                        <h1 className="logo-text">BaseApps</h1>
                    </Link>
                </div>
                
                {/* Desktop Navigation */}
                <nav className="header-nav">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>
                
                <div className="header-right">
                    <UserAuth />
                    <ConnectWallet />
                </div>
            </div>
        </header>
    );
}
