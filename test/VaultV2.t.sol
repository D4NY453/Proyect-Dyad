// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/VaultV2.sol";
import "../contracts/RWACertificate.sol";

contract MockPriceFeed is AggregatorV3Interface {
    int256 private price;
    uint256 private updatedAt;
    uint80 private roundId;

    constructor(int256 initialPrice) {
        price = initialPrice;
        updatedAt = block.timestamp;
        roundId = 1;
    }

    function setPrice(int256 newPrice) external {
        price = newPrice;
        updatedAt = block.timestamp;
        roundId++;
    }

    function setUpdatedAt(uint256 newTimestamp) external {
        updatedAt = newTimestamp;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, price, block.timestamp, updatedAt, roundId);
    }
}

contract MockRealEstateOracle is IRealEstateOracle {
    mapping(uint256 => uint256) public prices;
    mapping(uint256 => uint256) public timestamps;

    function setPropertyPrice(uint256 propertyId, uint256 priceUSD) external {
        prices[propertyId] = priceUSD;
        timestamps[propertyId] = block.timestamp;
    }

    function getLatestPrice(uint256 propertyId) external view returns (uint256 price, uint256 timestamp) {
        return (prices[propertyId], timestamps[propertyId]);
    }
}

contract VaultV2Test is Test {
    VaultV2 public vault;
    MockPriceFeed public priceFeed;
    MockRealEstateOracle public realEstateOracle;
    RWACertificate public rwaCert;

    address public owner = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    // ETH = $3000 USD (8 decimals in Chainlink)
    int256 constant INITIAL_ETH_PRICE = 3000 * 1e8;

    function setUp() public {
        priceFeed = new MockPriceFeed(INITIAL_ETH_PRICE);
        realEstateOracle = new MockRealEstateOracle();
        rwaCert = new RWACertificate();

        vault = new VaultV2(
            address(priceFeed),
            address(realEstateOracle),
            address(rwaCert)
        );

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function test_Deposit_MintsAt75PercentLTV() public {
        vm.prank(alice);
        vault.deposit{value: 10 ether}();

        // 10 ETH * $3000 * 75% = 22,500 usdJ
        uint256 expectedStable = (10 ether * 3000 * 1e18 * 75) / (1e18 * 100);
        assertEq(vault.stableToken().balanceOf(alice), expectedStable);
        assertEq(vault.volatileToken().balanceOf(alice), 10 ether);
        assertEq(address(vault).balance, 10 ether);
    }

    function test_RedeemStable_BurnsBothStableAndVolatile_PreventsInfiniteMinting() public {
        vm.startPrank(alice);
        vault.deposit{value: 10 ether}();

        uint256 stableBalance = vault.stableToken().balanceOf(alice);

        // Redeem full stable balance (22,500 usdJ -> 7.5 ETH returned, 7.5 vETH burned)
        vault.redeemStable(stableBalance);

        // usdJ is 0, vETH remaining is 2.5 ETH (representing the 25% uncollateralized equity)
        assertEq(vault.stableToken().balanceOf(alice), 0);
        assertEq(vault.volatileToken().balanceOf(alice), 2.5 ether);
        assertEq(alice.balance, 97.5 ether);

        // Alice now redeems her remaining 2.5 vETH
        vault.redeemVolatile(2.5 ether);
        vm.stopPrank();

        // Now all balances are 0 and Alice has her original 100 ETH back!
        assertEq(vault.volatileToken().balanceOf(alice), 0);
        assertEq(alice.balance, 100 ether);
    }

    function test_RedeemStable_RevertsIfInsufficientVolatileToken() public {
        vm.startPrank(alice);
        vault.deposit{value: 10 ether}();

        // Alice transfers half of her vETH to Bob
        vault.volatileToken().transfer(bob, 5 ether);

        uint256 stableBalance = vault.stableToken().balanceOf(alice);

        // Attempting to redeem full stable balance without full vETH balance must revert
        vm.expectRevert(SaldoInsuficiente.selector);
        vault.redeemStable(stableBalance);
        vm.stopPrank();
    }

    function test_RwaMintAndRepay() public {
        uint256 propertyId = 1;
        uint256 propertyValueUSD = 500_000 * 1e18; // $500k USD

        // Set oracle price and mint NFT to Alice
        realEstateOracle.setPropertyPrice(propertyId, propertyValueUSD);
        rwaCert.mintCertificate(alice, propertyId, "ipfs://property1");

        vm.startPrank(alice);
        vault.mintUsdJAgainstRWA(propertyId);

        // 80% LTV of $500k = $400k. 1% fee = $4k to treasury, $396k net to Alice
        uint256 totalMinted = (propertyValueUSD * 80) / 100;
        uint256 fee = (totalMinted * 1) / 100;
        uint256 netToAlice = totalMinted - fee;

        assertEq(vault.stableToken().balanceOf(alice), netToAlice);
        assertEq(vault.usdJMintedAgainstProperty(propertyId), totalMinted);

        // Alice repays $100k of debt
        uint256 repayAmount = 100_000 * 1e18;
        vault.repayUsdJForRWA(propertyId, repayAmount);

        assertEq(vault.usdJMintedAgainstProperty(propertyId), totalMinted - repayAmount);
        assertEq(vault.stableToken().balanceOf(alice), netToAlice - repayAmount);
        vm.stopPrank();
    }

    function test_EmergencyPause() public {
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit{value: 1 ether}();

        vault.unpause();

        vm.prank(alice);
        vault.deposit{value: 1 ether}();
        assertGt(vault.stableToken().balanceOf(alice), 0);
    }

    function test_StalePriceFeedReverts() public {
        // Fast forward 2 hours into the future
        vm.warp(block.timestamp + 2 hours);

        vm.prank(alice);
        vm.expectRevert(FeedObsoleto.selector);
        vault.deposit{value: 1 ether}();
    }

    function test_PriceFluctuations_LeverageAndSolvency() public {
        // 1. Alice deposita 10 ETH cuando ETH vale $3000 USD
        // Recibe 22,500 usdJ (75% LTV) y 10 vETH (jETH)
        vm.prank(alice);
        vault.deposit{value: 10 ether}();

        // 2. ESCENARIO DE SUBIDA (+33.3%): El precio de ETH sube a $4000 USD
        priceFeed.setPrice(4000 * 1e8);

        // La deuda de 22,500 usdJ ahora equivale a solo 5.625 ETH a $4000.
        // El ETH disponible para los poseedores de jETH aumenta de 2.5 ETH a 4.375 ETH.
        // ¡Ganancia apalancada para jETH del +75%!
        uint256 volatileBal = vault.volatileToken().balanceOf(alice);

        vm.prank(alice);
        vault.redeemVolatile(volatileBal);

        // Alice retira 4.375 ETH en ganancias reteniendo el 100% de sus 22,500 usdJ
        assertEq(alice.balance, 90 ether + 4.375 ether);
        assertEq(vault.stableToken().balanceOf(alice), 22_500 * 1e18);
    }
}

