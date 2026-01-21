import { ConnectButton } from '@rainbow-me/rainbowkit';

export const ConnectWallet = () => {
    return (
        <ConnectButton.Custom>
            {({ account, chain, openConnectModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            // Only show "Connect Wallet" button when not connected
                            // UserAuth will handle the connected state
                            if (!connected) {
                                return (
                                    <button
                                        onClick={openConnectModal}
                                        type="button"
                                        className="connect-wallet-btn"
                                        style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Connect Wallet
                                    </button>
                                );
                            }

                            // When connected, return nothing - UserAuth handles everything
                            return null;
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
};
