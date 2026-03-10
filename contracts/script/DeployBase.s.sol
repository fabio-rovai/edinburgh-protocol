// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ImpactVault} from "../src/ImpactVault.sol";
import {YieldSplitter} from "../src/YieldSplitter.sol";
import {ImpactMultisig} from "../src/ImpactMultisig.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @title DeployBase — deploys the full ImpactVault stack on Base mainnet
contract DeployBase is Script {
    // Base mainnet USDC
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        address deployer = msg.sender;

        // Read signer addresses from environment
        address signer1 = vm.envAddress("SIGNER_1");
        address signer2 = vm.envAddress("SIGNER_2");
        address signer3 = vm.envAddress("SIGNER_3");

        vm.startBroadcast();

        // 1. Deploy ImpactVault with USDC on Base
        ImpactVault vault = new ImpactVault(
            IERC20(USDC),
            "Impact Vault USDC",
            "ivUSDC",
            deployer // deployer is initial owner, will transfer to multisig
        );

        // 2. Deploy YieldSplitter with deployer as initial recipient (100%)
        address[] memory wallets = new address[](1);
        wallets[0] = deployer;
        uint256[] memory bps = new uint256[](1);
        bps[0] = 10_000;

        YieldSplitter splitter = new YieldSplitter(
            IERC20(USDC),
            wallets,
            bps,
            deployer
        );

        // 3. Deploy ImpactMultisig with 3 signers, threshold=2
        address[] memory signers_ = new address[](3);
        signers_[0] = signer1;
        signers_[1] = signer2;
        signers_[2] = signer3;

        ImpactMultisig multisig = new ImpactMultisig(signers_, 2);

        // 4. Transfer vault ownership to multisig
        vault.transferOwnership(address(multisig));

        vm.stopBroadcast();

        // Log deployed addresses
        console.log("=== Base Mainnet Deployment ===");
        console.log("ImpactVault:    ", address(vault));
        console.log("YieldSplitter:  ", address(splitter));
        console.log("ImpactMultisig: ", address(multisig));
        console.log("Vault owner:    ", vault.owner());
    }
}
