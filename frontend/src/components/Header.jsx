import { Link } from 'react-router-dom';
import { ConnectWallet } from './ConnectWallet';
import { UserAuth } from './UserAuth';
import { Sidebar } from './Sidebar';

export function Header() {
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
                <div className="header-right">
                    <UserAuth />
                    <ConnectWallet />
                </div>
            </div>
        </header>
    );
}
