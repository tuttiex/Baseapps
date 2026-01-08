import { ConnectButton } from '@rainbow-me/rainbowkit';

export const ConnectWallet = () => {
    return (
        <div className="wallet-connect-wrapper">
            <ConnectButton
                label="Connect Wallet"
                accountStatus="address"
                chainStatus="icon"
                showBalance={false}
            />
        </div>
    );
};
