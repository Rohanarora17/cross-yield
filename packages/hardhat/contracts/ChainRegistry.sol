// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract ChainRegistry is Initializable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant PROTOCOL_MANAGER_ROLE = keccak256("PROTOCOL_MANAGER_ROLE");
    
    // Protocol management
    mapping(string => address) public protocolAdapters;
    mapping(string => ProtocolInfo) public protocolInfo;
    mapping(uint256 => string[]) public chainProtocols; // chainId => protocols
    string[] public protocols;
    
    // Chain management
    mapping(uint256 => ChainInfo) public chainInfo;
    uint256[] public supportedChains;
    
    struct ProtocolInfo {
        address adapter;
        uint256 chainId;
        uint256 riskScore; // 0-100, lower is safer
        uint256 minAPY; // Minimum expected APY in basis points
        uint256 maxAPY; // Maximum expected APY in basis points
        bool isActive;
        uint256 tvl; // Total Value Locked
        uint256 lastUpdate;
    }
    
    struct ChainInfo {
        string name;
        address nativeToken; // USDC address on this chain
        uint256 gasPrice; // Average gas price
        bool isActive;
        uint256 bridgeCost; // Cost to bridge to this chain
    }
    
    event ProtocolAdded(string indexed protocol, address adapter, uint256 chainId, uint256 riskScore);
    event ProtocolUpdated(string indexed protocol, uint256 riskScore, uint256 minAPY, uint256 maxAPY);
    event ChainAdded(uint256 indexed chainId, string name, address nativeToken);
    event ProtocolDeactivated(string indexed protocol);

    function initialize(address admin) public initializer {
        __AccessControl_init();
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PROTOCOL_MANAGER_ROLE, admin);
    }

    function addProtocol(
        string calldata name,
        address adapter,
        uint256 chainId,
        uint256 riskScore,
        uint256 minAPY,
        uint256 maxAPY
    ) external onlyRole(PROTOCOL_MANAGER_ROLE) {
        require(adapter != address(0), "Invalid adapter");
        require(riskScore <= 100, "Risk score too high");
        require(minAPY <= maxAPY, "Invalid APY range");
        
        protocolAdapters[name] = adapter;
        protocolInfo[name] = ProtocolInfo({
            adapter: adapter,
            chainId: chainId,
            riskScore: riskScore,
            minAPY: minAPY,
            maxAPY: maxAPY,
            isActive: true,
            tvl: 0,
            lastUpdate: block.timestamp
        });
        
        protocols.push(name);
        chainProtocols[chainId].push(name);
        
        emit ProtocolAdded(name, adapter, chainId, riskScore);
    }
    
    function updateProtocolInfo(
        string calldata name,
        uint256 riskScore,
        uint256 minAPY,
        uint256 maxAPY,
        uint256 tvl
    ) external onlyRole(PROTOCOL_MANAGER_ROLE) {
        require(protocolAdapters[name] != address(0), "Protocol not found");
        require(riskScore <= 100, "Risk score too high");
        require(minAPY <= maxAPY, "Invalid APY range");
        
        ProtocolInfo storage info = protocolInfo[name];
        info.riskScore = riskScore;
        info.minAPY = minAPY;
        info.maxAPY = maxAPY;
        info.tvl = tvl;
        info.lastUpdate = block.timestamp;
        
        emit ProtocolUpdated(name, riskScore, minAPY, maxAPY);
    }
    
    function deactivateProtocol(string calldata name) external onlyRole(PROTOCOL_MANAGER_ROLE) {
        require(protocolAdapters[name] != address(0), "Protocol not found");
        protocolInfo[name].isActive = false;
        emit ProtocolDeactivated(name);
    }
    
    function addChain(
        uint256 chainId,
        string calldata name,
        address nativeToken,
        uint256 gasPrice,
        uint256 bridgeCost
    ) external onlyRole(ADMIN_ROLE) {
        require(nativeToken != address(0), "Invalid native token");
        
        chainInfo[chainId] = ChainInfo({
            name: name,
            nativeToken: nativeToken,
            gasPrice: gasPrice,
            isActive: true,
            bridgeCost: bridgeCost
        });
        
        supportedChains.push(chainId);
        emit ChainAdded(chainId, name, nativeToken);
    }
    
    function getAdapter(string calldata name) public view returns (address) {
        return protocolAdapters[name];
    }
    
    function getProtocolInfo(string calldata name) external view returns (ProtocolInfo memory) {
        return protocolInfo[name];
    }
    
    function getAllProtocols() external view returns (string[] memory) {
        return protocols;
    }
    
    function getChainProtocols(uint256 chainId) external view returns (string[] memory) {
        return chainProtocols[chainId];
    }
    
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }
    
    function getChainInfo(uint256 chainId) external view returns (ChainInfo memory) {
        return chainInfo[chainId];
    }
    
    // AI optimization helpers
    function getOptimalProtocols(
        uint256 minAPY,
        uint256 maxRiskScore,
        uint256 chainId
    ) external view returns (string[] memory optimalProtocols) {
        string[] memory chainProtocolsList = chainProtocols[chainId];
        uint256 count = 0;
        
        // Count optimal protocols
        for (uint256 i = 0; i < chainProtocolsList.length; i++) {
            ProtocolInfo memory info = protocolInfo[chainProtocolsList[i]];
            if (info.isActive && info.minAPY >= minAPY && info.riskScore <= maxRiskScore) {
                count++;
            }
        }
        
        // Create result array
        optimalProtocols = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < chainProtocolsList.length; i++) {
            ProtocolInfo memory info = protocolInfo[chainProtocolsList[i]];
            if (info.isActive && info.minAPY >= minAPY && info.riskScore <= maxRiskScore) {
                optimalProtocols[index] = chainProtocolsList[i];
                index++;
            }
        }
    }
    
    function getProtocolsByRiskScore(uint256 maxRiskScore) external view returns (string[] memory) {
        uint256 count = 0;
        
        // Count protocols within risk limit
        for (uint256 i = 0; i < protocols.length; i++) {
            if (protocolInfo[protocols[i]].riskScore <= maxRiskScore && protocolInfo[protocols[i]].isActive) {
                count++;
            }
        }
        
        string[] memory result = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < protocols.length; i++) {
            if (protocolInfo[protocols[i]].riskScore <= maxRiskScore && protocolInfo[protocols[i]].isActive) {
                result[index] = protocols[i];
                index++;
            }
        }
        
        return result;
    }
    
    function getCrossChainOpportunities(
        uint256 sourceChainId,
        uint256 targetChainId,
        uint256 minAPYImprovement
    ) external view returns (string[] memory opportunities) {
        string[] memory sourceProtocols = chainProtocols[sourceChainId];
        string[] memory targetProtocols = chainProtocols[targetChainId];
        
        uint256 count = 0;
        
        // Count opportunities
        for (uint256 i = 0; i < sourceProtocols.length; i++) {
            for (uint256 j = 0; j < targetProtocols.length; j++) {
                ProtocolInfo memory sourceInfo = protocolInfo[sourceProtocols[i]];
                ProtocolInfo memory targetInfo = protocolInfo[targetProtocols[j]];
                
                if (sourceInfo.isActive && targetInfo.isActive && 
                    targetInfo.minAPY > sourceInfo.maxAPY + minAPYImprovement) {
                    count++;
                }
            }
        }
        
        opportunities = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < sourceProtocols.length; i++) {
            for (uint256 j = 0; j < targetProtocols.length; j++) {
                ProtocolInfo memory sourceInfo = protocolInfo[sourceProtocols[i]];
                ProtocolInfo memory targetInfo = protocolInfo[targetProtocols[j]];
                
                if (sourceInfo.isActive && targetInfo.isActive && 
                    targetInfo.minAPY > sourceInfo.maxAPY + minAPYImprovement) {
                    opportunities[index] = targetProtocols[j];
                    index++;
                }
            }
        }
    }
}
