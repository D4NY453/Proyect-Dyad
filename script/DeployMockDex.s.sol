// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/MockDex.sol";
import "../contracts/MockUSDC.sol";

contract DeployMockDex is Script {
    function run() external returns (MockDex dex) {
        address usdjAddress = vm.envOr("USDJ_ADDRESS", address(0x53D6e709292c42DBEB54906f8D887a0d61B1B85d));
        
        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        console.log("Deployed MockUSDC at:", address(usdc));

        dex = new MockDex(usdjAddress, address(usdc));
        console.log("Deployed MockDex at:", address(dex));

        console.log("Deployed MockDex successfully!");

        vm.stopBroadcast();
    }
}
