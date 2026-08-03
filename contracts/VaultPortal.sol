// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVaultV2 {
    function deposit() external payable;
    function stableToken() external view returns (address);
    function volatileToken() external view returns (address);
}

/// @title VaultPortal (L1 to Aztec L2 Cross-Chain Messaging Portal)
/// @notice Conecta la bóveda L1 Dyad Vault V2 con la bóveda privada ShieldedVault.nr en Aztec L2.
contract VaultPortal is Ownable, ReentrancyGuard {
    IVaultV2 public immutable vault;
    address public aztecL2Bridge;

    event DepositBridgeToAztec(address indexed l1Sender, bytes32 indexed aztecRecipient, uint256 ethAmount, bytes32 shieldProofHash);
    event AztecBridgeAddressUpdated(address oldBridge, address newBridge);

    error DireccionInvalida();
    error DepositoInvalido();

    constructor(address _vaultAddress, address _aztecL2Bridge) Ownable(msg.sender) {
        if (_vaultAddress == address(0)) revert DireccionInvalida();
        vault = IVaultV2(_vaultAddress);
        aztecL2Bridge = _aztecL2Bridge;
    }

    function setAztecL2Bridge(address _newBridge) external onlyOwner {
        if (_newBridge == address(0)) revert DireccionInvalida();
        emit AztecBridgeAddressUpdated(aztecL2Bridge, _newBridge);
        aztecL2Bridge = _newBridge;
    }

    /// @notice Deposita ETH en la bóveda L1 y envía un mensaje cruzado a Aztec L2 para mintear notas privadas.
    /// @param aztecRecipient Clave pública o Hash del receptor privado en Aztec L2
    /// @param shieldProofHash Hash de la prueba ZK de cumplimiento generada por Shield Clean SDK
    function depositToAztecL2(bytes32 aztecRecipient, bytes32 shieldProofHash) external payable nonReentrant {
        if (msg.value == 0) revert DepositoInvalido();
        if (aztecRecipient == bytes32(0)) revert DireccionInvalida();

        // 1. Depositar en VaultV2 para respaldar las notas
        vault.deposit{value: msg.value}();

        // 2. Emitir evento de mensajería cruzada para Aztec Inbox
        emit DepositBridgeToAztec(msg.sender, aztecRecipient, msg.value, shieldProofHash);
    }

    receive() external payable {}
}
