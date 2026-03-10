// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MockAsset} from "../src/mocks/MockRWAVault.sol";
import {ImpactVault} from "../src/ImpactVault.sol";
import {YieldSplitter} from "../src/YieldSplitter.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract IntegrationTest is Test {
    MockAsset asset;
    ImpactVault vault;
    YieldSplitter splitter;

    address admin = address(this);
    address donor = address(0x1);
    address schoolProgramme = address(0x2);
    address nutritionProgramme = address(0x3);

    function setUp() public {
        // Deploy mock underlying asset
        asset = new MockAsset("Mock USD", "mUSD");

        // Deploy ImpactVault
        vault = new ImpactVault(IERC20(address(asset)), "ImpactVault", "ivUSD", admin);
        vault.setWhitelisted(donor, true);

        // Deploy YieldSplitter: 60% school, 40% nutrition
        address[] memory recipients = new address[](2);
        uint256[] memory bps = new uint256[](2);
        recipients[0] = schoolProgramme;
        recipients[1] = nutritionProgramme;
        bps[0] = 6000;
        bps[1] = 4000;
        splitter = new YieldSplitter(IERC20(address(asset)), recipients, bps, admin);

        // Give donor some tokens
        asset.mint(donor, 1000 ether);
    }

    function test_full_deposit_yield_distribute_pipeline() public {
        // 1. Donor deposits into ImpactVault
        vm.startPrank(donor);
        asset.approve(address(vault), 100 ether);
        uint256 shares = vault.deposit(100 ether, donor);
        vm.stopPrank();

        assertGt(shares, 0);
        assertEq(asset.balanceOf(address(vault)), 100 ether);

        // 2. Simulate yield: mint yield tokens to splitter (as if vault redirected yield)
        // In production, the vault would route yield to the splitter.
        // For this test, we simulate by minting directly.
        asset.mint(address(splitter), 5 ether); // simulating 5% yield

        // 3. Distribute yield to recipients
        splitter.distribute();

        // 4. Verify recipients received correct splits
        assertEq(asset.balanceOf(schoolProgramme), 3 ether);      // 60% of 5
        assertEq(asset.balanceOf(nutritionProgramme), 2 ether);    // 40% of 5

        // 5. Verify donor's principal is untouched in vault
        assertEq(asset.balanceOf(address(vault)), 100 ether);

        // 6. Donor can still withdraw principal
        vm.startPrank(donor);
        vault.redeem(shares, donor, donor);
        vm.stopPrank();
        assertEq(asset.balanceOf(donor), 1000 ether); // back to original
    }

    function test_multiple_yield_cycles() public {
        // Deposit
        vm.startPrank(donor);
        asset.approve(address(vault), 100 ether);
        vault.deposit(100 ether, donor);
        vm.stopPrank();

        // Cycle 1: 5 ether yield
        asset.mint(address(splitter), 5 ether);
        splitter.distribute();

        // Cycle 2: 3 ether yield
        asset.mint(address(splitter), 3 ether);
        splitter.distribute();

        // School: 60% of 8 = 4.8 ether
        assertEq(asset.balanceOf(schoolProgramme), 4.8 ether);
        // Nutrition: 40% of 8 = 3.2 ether
        assertEq(asset.balanceOf(nutritionProgramme), 3.2 ether);
    }

    function test_non_whitelisted_blocked() public {
        address random = address(0x99);
        asset.mint(random, 100 ether);
        vm.startPrank(random);
        asset.approve(address(vault), 100 ether);
        vm.expectRevert(abi.encodeWithSelector(ImpactVault.NotWhitelisted.selector, random));
        vault.deposit(100 ether, random);
        vm.stopPrank();
    }
}
