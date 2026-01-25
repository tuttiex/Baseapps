import { useState, useEffect } from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import { LoadingIcon, AlertIcon } from './Icons';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://baseapps-production.up.railway.app/api';

export function WalletManager({ user, onUpdate }) {
    const { address: currentAddress } = useAccount();
    const { disconnectAsync } = useDisconnect();
    const { connectAsync, connectors } = useConnect();
    const { getToken, setIsLinking } = useUser();

    // Wallets state
    const [walletData, setWalletData] = useState({ primary: '', display: '', linked: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await axios.get(`${API_URL}/profile/me/wallets`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setWalletData(response.data);
            }
        } catch (err) {
            console.error('Error fetching wallets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLinkWallet = async () => {
        setError(null);
        setConnecting(true);
        setIsLinking(true);

        const currentToken = getToken();

        try {
            await disconnectAsync();

            // Naive connector selection
            const connector = connectors[0];
            if (!connector) throw new Error("No wallet connector found");

            alert("Please select the NEW wallet you want to link in the next popup.");

            const result = await connectAsync({ connector });
            const newAddress = result.accounts[0];

            if (newAddress.toLowerCase() === walletData.primary.toLowerCase()) {
                throw new Error("You selected the same wallet! Please select a different one.");
            }

            // Generate Nonce
            const nonceRes = await axios.get(`${API_URL}/auth/nonce?address=${newAddress}`);
            const { nonce, message } = nonceRes.data;

            // Sign Message
            let signature;
            if (window.ethereum) {
                signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [message, newAddress],
                });
            } else {
                throw new Error("No wallet provider found for signing");
            }

            // Send to Backend
            await axios.post(`${API_URL}/profile/me/wallets`, {
                address: newAddress,
                signature,
                message
            }, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });

            alert("Wallet Linked! Please verify.");
            await fetchWallets();

        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to link wallet');
        } finally {
            setConnecting(false);
            setIsLinking(false);
        }
    };

    const handleUnlink = async (addr) => {
        if (!confirm(`Are you sure you want to unlink ${addr}?`)) return;
        try {
            const token = getToken();
            await axios.delete(`${API_URL}/profile/me/wallets/${addr}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchWallets();
        } catch (err) {
            setError('Failed to unlink');
        }
    };

    const handleSetPrimary = async (addr) => {
        try {
            const token = getToken();
            await axios.put(`${API_URL}/profile/me/primary`, { address: addr }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onUpdate) onUpdate();
            fetchWallets();
        } catch (err) {
            setError('Failed to set primary wallet');
        }
    };


    if (loading) return <div className="p-4 text-center">Loading wallets...</div>;

    // Construct unified list
    const primaryWallet = {
        address: walletData.primary,
        isMain: walletData.display.toLowerCase() === walletData.primary.toLowerCase(),
        isLinked: false
    };

    const linkedList = (walletData.linked || []).map(w => ({
        address: w.address,
        isMain: walletData.display.toLowerCase() === w.address.toLowerCase(),
        isLinked: true
    }));

    const allWallets = [primaryWallet, ...linkedList];

    return (
        <div className="wallet-manager-container">
            <h3>Connected Wallets ({allWallets.length}/5)</h3>
            <p className="hint-text">Connect up to 5 wallets. Select one as your main display wallet.</p>

            {error && <div className="error-message"><AlertIcon size={16} /> {error}</div>}

            <div className="wallets-list">
                {allWallets.map(w => (
                    <div key={w.address} className={`wallet-item ${w.isMain ? 'active-main' : ''}`}>
                        <div className="wallet-info">
                            <span className="wallet-address">
                                {w.address.substring(0, 6)}...{w.address.substring(38)}
                            </span>
                            {w.isMain && <span className="badge badge-primary">Main</span>}
                            {!w.isLinked && <span className="badge badge-secondary">Account ID</span>}
                        </div>

                        <div className="actions">
                            {!w.isMain && (
                                <button onClick={() => handleSetPrimary(w.address)} className="btn-text">Set as Main</button>
                            )}
                            {w.isLinked && (
                                <button onClick={() => handleUnlink(w.address)} className="btn-text btn-danger">Unlink</button>
                            )}
                        </div>
                    </div>
                ))}

                {allWallets.length < 5 && (
                    <button onClick={handleLinkWallet} disabled={connecting} className="btn-add-wallet">
                        {connecting ? (
                            <span className="flex-center"><LoadingIcon size={16} /> Connecting...</span>
                        ) : (
                            '+ Link New Wallet'
                        )}
                    </button>
                )}
            </div>

            <style>{`
                .wallet-manager-container {
                    margin-top: 2rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--border-color);
                }
                .wallets-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-top: 1rem;
                }
                .wallet-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255,255,255,0.03);
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    border: 1px solid transparent;
                }
                .wallet-item.active-main {
                    border-color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }
                .wallet-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .wallet-address {
                    font-family: monospace;
                    font-size: 0.95rem;
                }
                .badge {
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                .badge-primary {
                    background: rgba(102, 126, 234, 0.2);
                    color: #667eea;
                }
                .badge-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: #aaa;
                }
                .actions {
                    display: flex;
                    gap: 0.5rem;
                }
                .btn-text {
                    background: none;
                    border: none;
                    color: #aaa;
                    font-size: 0.85rem;
                    cursor: pointer;
                    padding: 4px 8px;
                }
                .btn-text:hover {
                    color: white;
                    text-decoration: underline;
                }
                .btn-danger:hover {
                    color: #ff4d4d;
                }
                .btn-add-wallet {
                    margin-top: 0.5rem;
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px dashed var(--border-color);
                    background: none;
                    color: var(--text-secondary);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-add-wallet:hover {
                    border-color: #667eea;
                    color: #667eea;
                    background: rgba(102, 126, 234, 0.05);
                }
                .flex-center {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
            `}</style>
        </div>
    );
}
