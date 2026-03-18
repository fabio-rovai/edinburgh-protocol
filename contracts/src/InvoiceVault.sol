// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ImpactVault} from "./ImpactVault.sol";
import {InvoiceNFT} from "./InvoiceNFT.sol";

/// @title InvoiceVault — Payment commitment vault extending ImpactVault
/// @notice Locks buyer deposits at invoice acceptance, streams yield to suppliers,
///         and auto-releases payment at maturity. Built for B2B trade finance.
/// @dev Extends ImpactVault (ERC-4626) with invoice lifecycle management.
///      Each locked payment mints a soulbound InvoiceNFT as proof of commitment.
contract InvoiceVault is ImpactVault {
    using SafeERC20 for IERC20;

    // ── Types ────────────────────────────────────────────────────────────
    enum InvoiceStatus {
        None,
        Locked,
        ClaimedEarly,
        Settled
    }

    struct Invoice {
        address buyer;
        address supplier;
        uint256 amount;
        uint256 maturityDate;
        uint256 lockedAt;
        uint256 nftTokenId;
        InvoiceStatus status;
    }

    // ── State ────────────────────────────────────────────────────────────
    InvoiceNFT public immutable invoiceNFT;
    mapping(uint256 => Invoice) public invoiceRegistry;
    uint256 public invoiceCount;

    // ── Events ───────────────────────────────────────────────────────────
    event PaymentLocked(
        uint256 indexed invoiceId,
        address indexed buyer,
        address indexed supplier,
        uint256 amount,
        uint256 maturityDate
    );
    event EarlyClaim(
        uint256 indexed invoiceId,
        address indexed supplier,
        uint256 amountPaid,
        uint256 yieldOffset
    );
    event PaymentSettled(
        uint256 indexed invoiceId,
        address indexed supplier,
        uint256 amount
    );

    // ── Errors ───────────────────────────────────────────────────────────
    error InvoiceNotFound(uint256 invoiceId);
    error InvoiceNotLocked(uint256 invoiceId);
    error NotSupplier(address caller, address supplier);
    error MaturityNotReached(uint256 maturityDate, uint256 current);
    error InvalidMaturityDate(uint256 maturityDate);
    error ZeroAmount();
    error ZeroAddress();

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address admin,
        InvoiceNFT nft_
    ) ImpactVault(asset_, name_, symbol_, admin) {
        invoiceNFT = nft_;
    }

    /// @notice Lock a payment for a supplier. Buyer deposits stablecoin into the vault
    ///         and an InvoiceNFT is minted to the supplier as proof of commitment.
    /// @param invoiceId External invoice identifier
    /// @param supplier Address of the supplier who will receive payment
    /// @param maturityDate Unix timestamp when payment auto-releases
    /// @param amount Amount of the underlying asset to lock
    function lockPayment(
        uint256 invoiceId,
        address supplier,
        uint256 maturityDate,
        uint256 amount
    ) external {
        if (amount == 0) revert ZeroAmount();
        if (supplier == address(0)) revert ZeroAddress();
        if (maturityDate <= block.timestamp) revert InvalidMaturityDate(maturityDate);
        if (invoiceRegistry[invoiceId].status != InvoiceStatus.None) {
            revert InvoiceNotFound(invoiceId); // already exists
        }

        // Transfer asset from buyer to this contract and deposit into vault
        IERC20 asset_ = IERC20(asset());
        asset_.safeTransferFrom(msg.sender, address(this), amount);
        asset_.approve(address(this), amount);

        // Deposit into the ERC-4626 vault (mints shares to this contract)
        uint256 shares = deposit(amount, address(this));

        // Mint soulbound InvoiceNFT to supplier
        uint256 nftTokenId = invoiceNFT.mint(
            supplier,
            amount,
            supplier,
            maturityDate,
            address(this)
        );

        // Record invoice
        invoiceRegistry[invoiceId] = Invoice({
            buyer: msg.sender,
            supplier: supplier,
            amount: amount,
            maturityDate: maturityDate,
            lockedAt: block.timestamp,
            nftTokenId: nftTokenId,
            status: InvoiceStatus.Locked
        });

        invoiceCount++;

        emit PaymentLocked(invoiceId, msg.sender, supplier, amount, maturityDate);
    }

    /// @notice Supplier claims payment early. Yield earned offsets any early-payment discount.
    /// @param invoiceId The invoice to claim
    function claimEarly(uint256 invoiceId) external {
        Invoice storage inv = invoiceRegistry[invoiceId];
        if (inv.status != InvoiceStatus.Locked) revert InvoiceNotLocked(invoiceId);
        if (msg.sender != inv.supplier) revert NotSupplier(msg.sender, inv.supplier);

        // TODO: Calculate yield earned and apply as offset to early-payment discount
        // For now, stub: supplier receives the full locked amount
        uint256 payout = inv.amount;
        uint256 yieldOffset = 0;

        inv.status = InvoiceStatus.ClaimedEarly;

        // Redeem vault shares and transfer to supplier
        redeem(previewWithdraw(payout), inv.supplier, address(this));

        // Burn the InvoiceNFT
        invoiceNFT.burn(inv.nftTokenId);

        emit EarlyClaim(invoiceId, inv.supplier, payout, yieldOffset);
    }

    /// @notice Auto-release full payment at maturity. Burns the InvoiceNFT.
    /// @param invoiceId The invoice to settle
    function settle(uint256 invoiceId) external {
        Invoice storage inv = invoiceRegistry[invoiceId];
        if (inv.status != InvoiceStatus.Locked) revert InvoiceNotLocked(invoiceId);
        if (block.timestamp < inv.maturityDate) {
            revert MaturityNotReached(inv.maturityDate, block.timestamp);
        }

        inv.status = InvoiceStatus.Settled;

        // Redeem vault shares and transfer full amount to supplier
        redeem(previewWithdraw(inv.amount), inv.supplier, address(this));

        // Burn the InvoiceNFT
        invoiceNFT.burn(inv.nftTokenId);

        emit PaymentSettled(invoiceId, inv.supplier, inv.amount);
    }

    /// @notice View the current status of an invoice
    /// @param invoiceId The invoice to query
    /// @return status The current InvoiceStatus enum value
    /// @return buyer The buyer address
    /// @return supplier The supplier address
    /// @return amount The locked amount
    /// @return maturityDate The maturity timestamp
    function getInvoiceStatus(uint256 invoiceId)
        external
        view
        returns (
            InvoiceStatus status,
            address buyer,
            address supplier,
            uint256 amount,
            uint256 maturityDate
        )
    {
        Invoice storage inv = invoiceRegistry[invoiceId];
        return (inv.status, inv.buyer, inv.supplier, inv.amount, inv.maturityDate);
    }
}
