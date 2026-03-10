// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ImpactVault} from "../src/ImpactVault.sol";
import {YieldSplitter} from "../src/YieldSplitter.sol";
import {ImpactMultisig} from "../src/ImpactMultisig.sol";
import {MockAsset, MockRWAVault} from "../src/mocks/MockRWAVault.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @title DeploySepolia — deploys the full ImpactVault stack on Sepolia testnet
contract DeploySepolia is Script {
    function run() external {
        address deployer = msg.sender;

        vm.startBroadcast();

        // 1. Deploy MockAsset and mint 1M to deployer
        MockAsset mockAsset = new MockAsset("Mock USDC", "mUSDC");
        mockAsset.mint(deployer, 1_000_000e18);

        // 2. Deploy ImpactVault with mock asset
        ImpactVault vault = new ImpactVault(
            IERC20(address(mockAsset)),
            "Impact Vault Mock",
            "ivMOCK",
            deployer
        );

        // 3. Deploy MockRWAVault with 500 bps (5%) APY
        MockRWAVault rwaVault = new MockRWAVault(
            "Mock RWA Vault",
            "mRWA",
            500
        );

        // 4. Deploy YieldSplitter with deployer as initial recipient (100%)
        address[] memory wallets = new address[](1);
        wallets[0] = deployer;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10_000;

        YieldSplitter splitter = new YieldSplitter(
            IERC20(address(mockAsset)),
            wallets,
            bps,
            deployer
        );

        // 5. Deploy ImpactMultisig with 1-of-1 (deployer only)
        address[] memory signers_ = new address[](1);
        signers_[0] = deployer;

        ImpactMultisig multisig = new ImpactMultisig(signers_, 1);

        vm.stopBroadcast();

        // Log deployed addresses
        console.log("=== Sepolia Testnet Deployment ===");
        console.log("MockAsset:      ", address(mockAsset));
        console.log("ImpactVault:    ", address(vault));
        console.log("MockRWAVault:   ", address(rwaVault));
        console.log("YieldSplitter:  ", address(splitter));
        console.log("ImpactMultisig: ", address(multisig));
    }
}
