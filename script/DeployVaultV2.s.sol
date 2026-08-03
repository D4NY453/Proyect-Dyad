// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/VaultV2.sol";
import "../contracts/RWACertificate.sol";

contract MockDeployRealEstateOracle is IRealEstateOracle {
    function getLatestPrice(uint256) external view returns (uint256 price, uint256 timestamp) {
        return (500_000 * 1e18, block.timestamp);
    }
}

contract DeployVaultV2 is Script {
    function run() external returns (VaultV2 vault) {
        // Addresses for Sepolia Testnet
        address priceFeed = vm.envOr("PRICE_FEED_ADDRESS", address(0x694AA1769357215DE4FAC081bf1f309aDC325306)); // ETH/USD Sepolia Chainlink Feed
        address realEstateOracle = vm.envOr("REAL_ESTATE_ORACLE_ADDRESS", address(0));
        address rwaCertificate = vm.envOr("RWA_CERTIFICATE_ADDRESS", address(0));

        vm.startBroadcast();

        // Deploy helper contracts if addresses are not provided
        if (rwaCertificate == address(0)) {
            RWACertificate cert = new RWACertificate();
            rwaCertificate = address(cert);
            console.log("Deployed RWACertificate at:", rwaCertificate);
        }

        if (realEstateOracle == address(0)) {
            MockDeployRealEstateOracle oracle = new MockDeployRealEstateOracle();
            realEstateOracle = address(oracle);
            console.log("Deployed RealEstateOracle at:", realEstateOracle);
        }

        vault = new VaultV2(priceFeed, realEstateOracle, rwaCertificate);
        console.log("Deployed VaultV2 at:", address(vault));
        console.log("Deployed StableToken (usdJ) at:", address(vault.stableToken()));
        console.log("Deployed VolatileToken (vETH) at:", address(vault.volatileToken()));

        vm.stopBroadcast();
    }
}
