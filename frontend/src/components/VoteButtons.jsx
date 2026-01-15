import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import VOTING_ABI from '../contracts/voting-abi.json';

const VOTING_CONTRACT_ADDRESS = '0x26a496b5dfcc453b0f3952c455af3aa6b729793c';
const VOTE_FEE = '0.0001'; // 0.0001 ETH (~$0.30)

export const VoteButtons = ({ dappId, initialScore, isRegistered, layout = 'center', showScore = true, middleContent }) => {
    const { address, isConnected } = useAccount();
    const [score, setScore] = useState(initialScore || 0);
    const [isHovered, setIsHovered] = useState(null); // 'up' or 'down'

    // If not registered, don't show the voting interface yet -> CHANGED: Show disabled
    // if (!isRegistered) {
    //     return null;
    // }

    const { writeContract, data: hash, isPending: isVoting } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleVote = async (value, e) => {
        e.stopPropagation(); // Prevent card click
        if (!dappId) {
            alert("This dapp is not registered for voting yet.");
            return;
        }

        if (!isConnected) {
            alert("Please connect your wallet to vote!");
            return;
        }

        try {
            writeContract({
                address: VOTING_CONTRACT_ADDRESS,
                abi: VOTING_ABI,
                functionName: 'vote',
                args: [dappId, value],
                value: parseEther(VOTE_FEE),
            });
        } catch (error) {
            console.error("Voting failed:", error);
        }
    };

    useEffect(() => {
        if (isSuccess) {
            // Optimistically update score if we had the previous state, 
            // but the backend indexer will handle the real update on refresh.
            // For now, let's just show a success "pop".
        }
    }, [isSuccess]);

    return (
        <div className={`vote-container ${layout === 'split' ? 'split-layout' : ''}`}>
            <button
                className={`vote-btn up ${isVoting || isConfirming ? 'loading' : ''}`}
                onClick={(e) => handleVote(1, e)}
                onMouseEnter={() => setIsHovered('up')}
                onMouseLeave={() => setIsHovered(null)}
                disabled={isVoting || isConfirming}
            >
                {/* SVG Thumbs Up */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="thumb-icon">
                    <path d="M12.0001 2.99999C12.0001 2.99999 12.0001 7.21999 9.68006 8.78999C7.36006 10.36 4.90006 9.38999 2.00006 12C2.00006 12 2.00006 19 2.00006 20C2.00006 21 2.96006 21.05 3.00006 21.05H14.1201C15.9363 21.05 17.5855 19.9576 18.2801 18.29L20.0001 14C20.0001 14 22.0001 8.99999 18.0001 8.99999H13.6701L14.4501 5.09999C14.6201 4.24999 14.1601 3.40999 13.3701 3.00999C13.2907 2.96912 13.2087 2.93418 13.1251 2.90563C12.7235 2.76814 12.2854 2.80277 11.9101 2.99999H12.0001ZM6.00006 10.5V19H4.00006V10.5H6.00006Z" />
                </svg>
            </button>

            {/* Middle Content (like Explore Button) or Score */}
            {middleContent ? (
                <div className="vote-middle-content">
                    {middleContent}
                </div>
            ) : showScore && (
                <div className={`vote-score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`}>
                    {score > 0 ? `+${score}` : score}
                </div>
            )}

            <button
                className={`vote-btn down ${isVoting || isConfirming ? 'loading' : ''}`}
                onClick={(e) => handleVote(-1, e)}
                onMouseEnter={() => setIsHovered('down')}
                onMouseLeave={() => setIsHovered(null)}
                disabled={isVoting || isConfirming}
            >
                {/* SVG Thumbs Down */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="thumb-icon">
                    <path d="M12.0001 21C12.0001 21 12.0001 16.78 14.3201 15.21C16.6401 13.64 19.1001 14.61 22.0001 12C22.0001 12 22.0001 5 22.0001 4C22.0001 3 21.0401 2.95 21.0001 2.95H9.88006C8.06385 2.95 6.41461 4.04239 5.72006 5.71L4.00006 10C4.00006 10 2.00006 15 6.00006 15H10.3301L9.55006 18.9C9.38006 19.75 9.84006 20.59 10.6301 20.99C10.7095 21.0309 10.7915 21.0658 10.8751 21.0944C11.2766 21.2319 11.7147 21.1972 12.0901 21H12.0001ZM18.0001 13.5V5H20.0001V13.5H18.0001Z" />
                </svg>
            </button>

            {(isVoting || isConfirming) && (
                <div className="vote-status">
                    {isVoting ? "check wallet..." : "confirming..."}
                </div>
            )}
        </div>
    );
};
