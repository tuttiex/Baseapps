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
                <span className="thumb">👍</span>
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
                <span className="thumb">👎</span>
            </button>

            {(isVoting || isConfirming) && (
                <div className="vote-status">
                    {isVoting ? "check wallet..." : "confirming..."}
                </div>
            )}
        </div>
    );
};
