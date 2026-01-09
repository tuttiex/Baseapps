// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

error NotOwner();
error InsufficientFee();

contract BaseAppsRegistry {
    address public immutable owner;
    uint256 public constant FEE = 0.0003 ether;

    event DappSubmitted(address indexed submitter, string dappName, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function payForListing(string calldata _dappName) external payable {
        if (msg.value < FEE) revert InsufficientFee();
        emit DappSubmitted(msg.sender, _dappName, msg.value);
    }

    function withdraw() external {
        if (msg.sender != owner) revert NotOwner();

        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }
}
