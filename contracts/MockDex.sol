// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockDex {
    IERC20 public usdj;
    IERC20 public usdc;

    constructor(address _usdj, address _usdc) {
        usdj = IERC20(_usdj);
        usdc = IERC20(_usdc);
    }

    // Intercambia usdJ por USDC 1:1
    function swapUsdjForUsdc(uint256 amount) external {
        require(usdj.transferFrom(msg.sender, address(this), amount), "Fallo al transferir usdJ al Dex");
        require(usdc.transfer(msg.sender, amount), "El Dex no tiene suficiente liquidez de USDC");
    }

    // Intercambia usdJ directamente por Sepolia ETH a un precio de $3,000 USD/ETH
    function swapUsdjForEth(uint256 amountUsdj) external {
        require(usdj.transferFrom(msg.sender, address(this), amountUsdj), "Fallo al transferir usdJ al Dex");
        uint256 ethToSend = (amountUsdj * 1e18) / 3000;
        require(address(this).balance >= ethToSend, "El Dex no tiene suficiente liquidez de Sepolia ETH");
        (bool success, ) = msg.sender.call{value: ethToSend}("");
        require(success, "Fallo al enviar Sepolia ETH");
    }

    // Permite al contrato recibir ETH para tener liquidez
    receive() external payable {}
}
