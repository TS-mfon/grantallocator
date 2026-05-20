// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract GrantTreasury {
    struct Tranche {
        bytes32 milestoneId;
        address recipient;
        uint256 amount;
        bool paid;
        string note;
    }

    address public owner;
    IERC20Minimal public immutable usdc;

    mapping(bytes32 => Tranche) public tranches;

    event TrancheRegistered(bytes32 indexed trancheId, bytes32 indexed milestoneId, address indexed recipient, uint256 amount, string note);
    event TranchePaid(bytes32 indexed trancheId, address indexed recipient, uint256 amount, string payoutRef);

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor(address usdcToken) {
        owner = msg.sender;
        usdc = IERC20Minimal(usdcToken);
    }

    function registerTranche(
        bytes32 trancheId,
        bytes32 milestoneId,
        address recipient,
        uint256 amount,
        string calldata note
    ) external onlyOwner {
        require(tranches[trancheId].recipient == address(0), "TRANCHE_EXISTS");
        tranches[trancheId] = Tranche({
            milestoneId: milestoneId,
            recipient: recipient,
            amount: amount,
            paid: false,
            note: note
        });
        emit TrancheRegistered(trancheId, milestoneId, recipient, amount, note);
    }

    function payTranche(bytes32 trancheId, string calldata payoutRef) external onlyOwner {
        Tranche storage tranche = tranches[trancheId];
        require(tranche.recipient != address(0), "UNKNOWN_TRANCHE");
        require(!tranche.paid, "TRANCHE_PAID");
        tranche.paid = true;
        require(usdc.transfer(tranche.recipient, tranche.amount), "USDC_TRANSFER_FAILED");
        emit TranchePaid(trancheId, tranche.recipient, tranche.amount, payoutRef);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        owner = newOwner;
    }
}
