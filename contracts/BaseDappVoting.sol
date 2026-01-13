// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BaseDappVoting is ReentrancyGuard, Pausable, Ownable {
    uint256 public constant VOTE_FEE = 0.0001 ether; // ~0.30$ on Base
    uint256 public constant VOTE_COOLDOWN = 1 hours;
    
    mapping(bytes32 => bool) public isDappRegistered;
    mapping(bytes32 => int256) public dappScore;
    mapping(address => mapping(bytes32 => int8)) public userVote;
    mapping(address => mapping(bytes32 => uint256)) public lastVoteTime;
    
    event VoteCast(address indexed voter, bytes32 indexed dappId, int8 value);
    event DappRegistered(bytes32 indexed dappId);
    event DappUnregistered(bytes32 indexed dappId);
    
    constructor() Ownable(msg.sender) {}
    
    function registerDapp(bytes32 dappId) external onlyOwner {
        isDappRegistered[dappId] = true;
        emit DappRegistered(dappId);
    }

    function batchRegisterDapps(bytes32[] calldata dappIds) external onlyOwner {
        for (uint256 i = 0; i < dappIds.length; i++) {
            isDappRegistered[dappIds[i]] = true;
            emit DappRegistered(dappIds[i]);
        }
    }
    
    function unregisterDapp(bytes32 dappId) external onlyOwner {
        isDappRegistered[dappId] = false;
        emit DappUnregistered(dappId);
    }
    
    function vote(bytes32 dappId, int8 value) external payable whenNotPaused nonReentrant {
        require(msg.value >= VOTE_FEE, "Vote fee required");
        require(isDappRegistered[dappId], "Invalid dappId");
        require(value >= -1 && value <= 1, "Vote: -1, 0, or +1");
        require(
            block.timestamp >= lastVoteTime[msg.sender][dappId] + VOTE_COOLDOWN,
            "Cooldown: 1 hour"
        );
        
        int8 previousVote = userVote[msg.sender][dappId];
        dappScore[dappId] = dappScore[dappId] - int256(previousVote) + int256(value);
        
        if (value == 0) {
            delete userVote[msg.sender][dappId];
        } else {
            userVote[msg.sender][dappId] = value;
        }
        
        lastVoteTime[msg.sender][dappId] = block.timestamp;
        emit VoteCast(msg.sender, dappId, value);
    }
    
    function getScore(bytes32 dappId) external view returns (int256) {
        return dappScore[dappId];
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function withdrawFees() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}
