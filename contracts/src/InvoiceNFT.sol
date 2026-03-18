// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

/// @title InvoiceNFT — Soulbound ERC-721 representing a locked invoice payment
/// @notice Minted by InvoiceVault on lockPayment, burned on settle.
///         Non-transferable: overrides transfer hooks to prevent secondary trading.
/// @dev Each token stores invoice metadata on-chain for auditability.
contract InvoiceNFT is ERC721 {
    // ── Types ────────────────────────────────────────────────────────────
    struct InvoiceData {
        uint256 amount;
        address supplier;
        uint256 maturityDate;
        address vaultAddress;
    }

    // ── State ────────────────────────────────────────────────────────────
    address public immutable invoiceVault;
    uint256 private _nextTokenId;
    mapping(uint256 => InvoiceData) public invoices;

    // ── Errors ───────────────────────────────────────────────────────────
    error OnlyInvoiceVault();
    error SoulboundTransferBlocked();

    // ── Modifiers ────────────────────────────────────────────────────────
    modifier onlyVault() {
        if (msg.sender != invoiceVault) revert OnlyInvoiceVault();
        _;
    }

    constructor(address vault_) ERC721("Edinburgh Protocol Invoice", "EPI") {
        invoiceVault = vault_;
    }

    /// @notice Mint a new invoice NFT. Only callable by InvoiceVault.
    /// @param to The supplier address (NFT holder)
    /// @param amount The locked payment amount in vault asset units
    /// @param supplier The supplier who will receive payment
    /// @param maturityDate Unix timestamp when payment auto-releases
    /// @param vaultAddress The InvoiceVault holding the funds
    /// @return tokenId The minted NFT token ID
    function mint(
        address to,
        uint256 amount,
        address supplier,
        uint256 maturityDate,
        address vaultAddress
    ) external onlyVault returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        invoices[tokenId] = InvoiceData({
            amount: amount,
            supplier: supplier,
            maturityDate: maturityDate,
            vaultAddress: vaultAddress
        });
    }

    /// @notice Burn an invoice NFT on settlement. Only callable by InvoiceVault.
    /// @param tokenId The token to burn
    function burn(uint256 tokenId) external onlyVault {
        _burn(tokenId);
        delete invoices[tokenId];
    }

    // ── Soulbound: block all transfers ──────────────────────────────────

    /// @dev Override to prevent transfers. Only mint and burn are allowed.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow mint (from == address(0)) and burn (to == address(0))
        if (from != address(0) && to != address(0)) {
            revert SoulboundTransferBlocked();
        }
        return super._update(to, tokenId, auth);
    }
}
