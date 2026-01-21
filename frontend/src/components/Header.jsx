import { Link } from 'react-router-dom';
import { ConnectWallet } from './ConnectWallet';
import { UserAuth } from './UserAuth';

export function Header() {
    return (
        <header className="header">
            <div className="container header-content">
                <Link to="/" className="logo-container" style={{ textDecoration: 'none' }}>
                    <img src="/Baseappslogo3.png" alt="BaseApps" className="logo" />
                    <h1 className="logo-text">BaseApps</h1>
                </Link>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <UserAuth />
                    <ConnectWallet />
                </div>
            </div>
        </header>
    );
}
