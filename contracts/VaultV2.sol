// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// 1. Errores Personalizados
error DepositoInvalido();
error SaldoInsuficiente();
error LiquidezInsuficiente();
error PrecioInvalido();
error FeedInvalido();
error FeedObsoleto();
error LimiteLTVExcedido();
error NoEsDuenoDelCertificado();
error DivisionPorCero();
error TransferenciaFallida();
error DatosOraculoObsoletos();

// 2. Interfaces
interface AggregatorV3Interface {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

interface IRealEstateOracle {
    function getLatestPrice(uint256 _propertyId) external view returns (uint256 price, uint256 timestamp);
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

// 3. Tokens
contract StableToken is ERC20, Ownable {
    constructor() ERC20("USD J", "usdJ") Ownable(msg.sender) {}
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
    function burn(address from, uint256 amount) external onlyOwner { _burn(from, amount); }
}

contract VolatileToken is ERC20, Ownable {
    constructor() ERC20("Volatile ETH", "vETH") Ownable(msg.sender) {}
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
    function burn(address from, uint256 amount) external onlyOwner { _burn(from, amount); }
}

// 4. Vault V2 (L1 Crypto + RWA)
contract VaultV2 is Ownable, ReentrancyGuard, Pausable {
    StableToken public immutable stableToken;
    VolatileToken public immutable volatileToken;
    AggregatorV3Interface internal immutable priceFeed;
    IRealEstateOracle public immutable realEstateOracle;
    IERC721 public immutable rwaCertificate;
    address public immutable treasuryWallet;

    uint256 public constant ETH_LTV_PERCENTAGE = 75; // LTV 75% para depósitos en ETH
    uint256 public constant RWA_LTV_PERCENTAGE = 80; // LTV 80% para certificados RWA
    uint256 public constant MINT_FEE_PERCENTAGE = 1;  // 1% fee en minteo RWA

    // Registro de cuánto usdJ se ha impreso contra cada propiedad RWA
    mapping(uint256 => uint256) public usdJMintedAgainstProperty;

    // Eventos del Protocolo
    event Deposited(address indexed user, uint256 ethAmount, uint256 stableMinted, uint256 volatileMinted);
    event RedeemedStable(address indexed user, uint256 stableAmount, uint256 ethReturned);
    event RedeemedVolatile(address indexed user, uint256 volatileAmount, uint256 ethReturned);
    event RwaMinted(address indexed user, uint256 indexed propertyId, uint256 netAmount, uint256 fee);
    event RwaRepaid(address indexed user, uint256 indexed propertyId, uint256 amount);

    constructor(
        address _priceFeedAddress, 
        address _realEstateOracleAddress, 
        address _rwaCertificateAddress
    ) Ownable(msg.sender) {
        if (_priceFeedAddress == address(0)) revert FeedInvalido();
        if (_realEstateOracleAddress == address(0)) revert FeedInvalido();
        if (_rwaCertificateAddress == address(0)) revert FeedInvalido();

        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        realEstateOracle = IRealEstateOracle(_realEstateOracleAddress);
        rwaCertificate = IERC721(_rwaCertificateAddress);
        stableToken = new StableToken();
        volatileToken = new VolatileToken();
        treasuryWallet = msg.sender;
    }

    function getLatestPrice() public view returns (uint256) {
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
        if (price <= 0) revert PrecioInvalido();
        if (answeredInRound < roundId) revert FeedInvalido();
        if (updatedAt == 0 || block.timestamp - updatedAt > 3600) revert FeedObsoleto();
        return uint256(price) * 10**10; 
    }

    // --- LOGICA CRIPTO L1 (Deposit / Redeem) ---
    function deposit() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert DepositoInvalido();
        uint256 currentPrice = getLatestPrice();
        
        // Emisión de usdJ a un LTV prudente del 75%
        uint256 stableAmountToMint = (msg.value * currentPrice * ETH_LTV_PERCENTAGE) / (1e18 * 100);
        
        stableToken.mint(msg.sender, stableAmountToMint);
        volatileToken.mint(msg.sender, msg.value); 

        emit Deposited(msg.sender, msg.value, stableAmountToMint, msg.value);
    }

    function redeemStable(uint256 stableAmount) external whenNotPaused nonReentrant {
        if (stableAmount == 0) revert DepositoInvalido();
        if (stableToken.balanceOf(msg.sender) < stableAmount) revert SaldoInsuficiente();

        uint256 currentPrice = getLatestPrice();
        uint256 ethToReturn = (stableAmount * 1e18) / currentPrice;
        if (address(this).balance < ethToReturn) revert LiquidezInsuficiente();

        // Para evitar acuñación infinita y arbitraje sin riesgo de vETH:
        // El usuario DEBE devolver/quemar los vETH correspondientes al ETH que retira
        if (volatileToken.balanceOf(msg.sender) < ethToReturn) revert SaldoInsuficiente();

        stableToken.burn(msg.sender, stableAmount);
        volatileToken.burn(msg.sender, ethToReturn);
        
        (bool success, ) = payable(msg.sender).call{value: ethToReturn}("");
        if (!success) revert TransferenciaFallida();

        emit RedeemedStable(msg.sender, stableAmount, ethToReturn);
    }

    function redeemVolatile(uint256 volatileAmount) external whenNotPaused nonReentrant {
        if (volatileAmount == 0) revert DepositoInvalido();
        if (volatileToken.balanceOf(msg.sender) < volatileAmount) revert SaldoInsuficiente();

        uint256 currentPrice = getLatestPrice();
        uint256 totalStableSupply = stableToken.totalSupply();
        uint256 totalVolatileSupply = volatileToken.totalSupply();
        if (totalVolatileSupply == 0) revert DivisionPorCero();

        uint256 ethLockedForStables = (totalStableSupply * 1e18) / currentPrice;
        uint256 ethAvailableForVolatiles = address(this).balance > ethLockedForStables 
            ? address(this).balance - ethLockedForStables 
            : 0;

        uint256 ethToReturn = (ethAvailableForVolatiles * volatileAmount) / totalVolatileSupply;
        volatileToken.burn(msg.sender, volatileAmount);
        
        if (ethToReturn > 0) {
            (bool success, ) = payable(msg.sender).call{value: ethToReturn}("");
            if (!success) revert TransferenciaFallida();
        }

        emit RedeemedVolatile(msg.sender, volatileAmount, ethToReturn);
    }

    // --- LOGICA RWA (Mint / Repay) ---
    function mintUsdJAgainstRWA(uint256 propertyId) external whenNotPaused nonReentrant {
        if (rwaCertificate.ownerOf(propertyId) != msg.sender) revert NoEsDuenoDelCertificado();

        (uint256 propertyPriceInUSD, uint256 timestamp) = realEstateOracle.getLatestPrice(propertyId);
        if (propertyPriceInUSD == 0) revert PrecioInvalido();
        if (timestamp == 0 || block.timestamp - timestamp > 7 days) revert DatosOraculoObsoletos();
        
        uint256 maxMintableWithDecimals = (propertyPriceInUSD * RWA_LTV_PERCENTAGE) / 100;
        uint256 alreadyMinted = usdJMintedAgainstProperty[propertyId];
        if (maxMintableWithDecimals <= alreadyMinted) revert LimiteLTVExcedido();

        uint256 amountToMint = maxMintableWithDecimals - alreadyMinted;
        uint256 fee = (amountToMint * MINT_FEE_PERCENTAGE) / 100;
        uint256 netAmount = amountToMint - fee;

        usdJMintedAgainstProperty[propertyId] += amountToMint;
        stableToken.mint(treasuryWallet, fee);
        stableToken.mint(msg.sender, netAmount);

        emit RwaMinted(msg.sender, propertyId, netAmount, fee);
    }

    function repayUsdJForRWA(uint256 propertyId, uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert DepositoInvalido();
        if (usdJMintedAgainstProperty[propertyId] < amount) revert LimiteLTVExcedido();
        if (stableToken.balanceOf(msg.sender) < amount) revert SaldoInsuficiente();

        usdJMintedAgainstProperty[propertyId] -= amount;
        stableToken.burn(msg.sender, amount);

        emit RwaRepaid(msg.sender, propertyId, amount);
    }

    // --- CONTROLES DE EMERGENCIA ---
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
}

