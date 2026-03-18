// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {InvoiceVault} from "../src/InvoiceVault.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {ImpactVault} from "../src/ImpactVault.sol";
import {MockAsset} from "../src/mocks/MockRWAVault.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract InvoiceVaultTest is Test {
    InvoiceVault vault;
    InvoiceNFT nft;
    MockAsset asset;

    address admin = address(0xA);
    address buyer = address(0xB);
    address supplier = address(0xC);

    uint256 constant AMOUNT = 10_000e18;
    uint256 constant INVOICE_ID = 1;

    function setUp() public {
        asset = new MockAsset("GBP Coin", "GBPc");

        // Deploy InvoiceVault — NFT needs vault address, so deploy in two steps
        // First deploy vault with a placeholder NFT, then redeploy properly
        // For stub tests, we deploy NFT first with a predicted vault address
        address predictedVault = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        nft = new InvoiceNFT(predictedVault);
        vault = new InvoiceVault(
            IERC20(address(asset)),
            "Edinburgh Invoice Vault",
            "eIV",
            admin,
            nft
        );

        // Whitelist the vault itself and buyer for deposits
        vm.startPrank(admin);
        vault.setWhitelisted(address(vault), true);
        vault.setWhitelisted(buyer, true);
        vm.stopPrank();

        // Mint tokens to buyer
        asset.mint(buyer, AMOUNT * 10);
    }

    function test_lockPayment_mintsNFT() public {
        // TODO: Verify that lockPayment mints an InvoiceNFT to the supplier
        // - Buyer approves and calls lockPayment
        // - Assert NFT balance of supplier == 1
        // - Assert NFT metadata matches invoice details
    }

    function test_lockPayment_depositsToVault() public {
        // TODO: Verify that lockPayment deposits the asset into the ERC-4626 vault
        // - Check vault totalAssets increases by AMOUNT
        // - Check buyer's asset balance decreases by AMOUNT
    }

    function test_claimEarly_withYieldOffset() public {
        // TODO: Verify early claim calculates yield offset correctly
        // - Lock a payment, simulate yield accrual
        // - Supplier claims early
        // - Assert payout includes yield offset against discount
    }

    function test_claimEarly_beforeMaturity() public {
        // TODO: Verify supplier can claim before maturity date
        // - Lock a payment with maturity 30 days out
        // - Claim at day 15
        // - Assert payment is released and status is ClaimedEarly
    }

    function test_settle_atMaturity() public {
        // TODO: Verify settlement works at maturity
        // - Lock a payment, warp to maturity
        // - Call settle
        // - Assert full amount transferred to supplier
        // - Assert status is Settled
    }

    function test_settle_burnsNFT() public {
        // TODO: Verify that settle burns the InvoiceNFT
        // - Lock a payment (NFT minted)
        // - Settle at maturity
        // - Assert NFT no longer exists (ownerOf reverts)
    }

    function test_cannotSettleBeforeMaturity() public {
        // TODO: Verify settle reverts before maturity date
        // - Lock a payment with maturity 30 days out
        // - Try to settle at day 15
        // - Assert revert with MaturityNotReached
    }

    function test_onlySupplierCanClaim() public {
        // TODO: Verify only the designated supplier can call claimEarly
        // - Lock a payment
        // - Non-supplier address calls claimEarly
        // - Assert revert with NotSupplier
    }
}
