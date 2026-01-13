// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';

/**
 * @dev Interface for OrderRouterFacet - SINGLE ENTRY POINT for all order operations
 * This replaces direct calls to CLOBFacet to ensure consistent V2 storage usage
 */
interface IOrderRouter {
    function placeNodeSellOrder(
        address nodeOwner,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        uint8 timeInForce,
        uint40 expiry
    ) external returns (bytes32 orderId);
}

/**
 * @dev DEPRECATED: Old interface kept for reference only
 * DO NOT USE - orders placed via this interface won't match with V2 orders
 */
interface ICLOBFacet {
    // DEPRECATED: Use IOrderRouter.placeNodeSellOrder instead
    function placeNodeSellOrder(
        address nodeOwner,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 amount
    ) external returns (bytes32 orderId);
}

/**
 * @title NodesFacet
 * @notice Business logic facet for node registration, management, and node assets
 * @dev Combines AurumNodeManager + NodeAsset functionality
 */
contract NodesFacet is Initializable {
    // Events matching original AurumNodeManager
    event NodeRegistered(
        bytes32 indexed nodeHash,
        address indexed owner,
        string nodeType
    );
    event NodeUpdated(
        bytes32 indexed nodeHash,
        string nodeType,
        uint256 capacity
    );
    event NodeDeactivated(bytes32 indexed nodeHash);
    event UpdateLocation(
        string indexed addressName,
        string lat,
        string lng,
        bytes32 indexed node
    );
    event UpdateOwner(address indexed owner, bytes32 indexed node);
    event UpdateStatus(bytes1 indexed status, bytes32 indexed node);
    event NodeCapacityUpdated(bytes32 indexed nodeHash, uint256[] quantities);
    event SupportedAssetAdded(
        bytes32 indexed nodeHash,
        address token,
        uint256 tokenId,
        uint256 price,
        uint256 capacity
    );
    event SupportedAssetsUpdated(
        bytes32 indexed nodeHash,
        uint256 count
    );
    // DEPRECATED: These events are no longer used since CLOB is internal to Diamond
    event ClobApprovalGranted(bytes32 indexed nodeHash, address indexed clobAddress);
    event ClobApprovalRevoked(bytes32 indexed nodeHash, address indexed clobAddress);
    
    // Token inventory events
    event TokensMintedToNode(
        bytes32 indexed nodeHash,
        uint256 indexed tokenId,
        uint256 amount,
        address indexed minter
    );
    event TokensTransferredBetweenNodes(
        bytes32 indexed fromNode,
        bytes32 indexed toNode,
        uint256 indexed tokenId,
        uint256 amount
    );
    event TokensWithdrawnFromNode(
        bytes32 indexed nodeHash,
        uint256 indexed tokenId,
        uint256 amount,
        address indexed recipient
    );
    event TokensDepositedToNode(
        bytes32 indexed nodeHash,
        uint256 indexed tokenId,
        uint256 amount,
        address indexed depositor
    );

    function initialize() public initializer {}

    // ======= ADMIN FUNCTIONS =======

    /**
     * @notice Set the CLOB contract address (DEPRECATED - CLOB is now internal to Diamond)
     * @dev Kept for backward compatibility. New code should not use external CLOB.
     * @param _clobAddress The CLOB contract address (unused)
     * 
     * @custom:deprecated This function is deprecated and will be removed in v2.0.
     *                    CLOB functionality is now internal to the Diamond via CLOBFacet.
     *                    Setting this value has no effect on order placement.
     */
    function setClobAddress(address _clobAddress) external {
        LibDiamond.enforceIsContractOwner();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.clobAddress = _clobAddress;
        // DEPRECATED: CLOBFacet is now part of the Diamond.
        // This value is no longer used for order routing.
    }

    /**
     * @notice Get the CLOB contract address (DEPRECATED)
     * @dev Returns Diamond address since CLOB is now internal
     * @return The Diamond address (CLOB is internal)
     * 
     * @custom:deprecated This function is deprecated and will be removed in v2.0.
     *                    CLOB functionality is now internal to the Diamond.
     *                    Use OrderRouterFacet for all order operations.
     */
    function getClobAddress() external view returns (address) {
        // DEPRECATED: CLOB functionality is now internal to Diamond via CLOBFacet
        // All orders should go through OrderRouterFacet
        return address(this);
    }

    function registerNode(
        string memory _nodeType,
        uint256 _capacity,
        bytes32 _assetHash,
        string memory _addressName,
        string memory _lat,
        string memory _lng
    ) external returns (bytes32 nodeHash) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        nodeHash = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, s.totalNodes)
        );

        s.nodes[nodeHash] = DiamondStorage.Node({
            owner: msg.sender,
            nodeType: _nodeType,
            capacity: _capacity,
            createdAt: block.timestamp,
            active: true,
            validNode: true,
            assetHash: _assetHash,
            addressName: _addressName,
            lat: _lat,
            lng: _lng
        });

        s.ownerNodes[msg.sender].push(nodeHash);
        s.nodeList.push(address(uint160(uint256(nodeHash))));
        s.totalNodes++;

        emit NodeRegistered(nodeHash, msg.sender, _nodeType);

        return nodeHash;
    }

    function updateNode(
        bytes32 _nodeHash,
        string memory _nodeType,
        uint256 _capacity
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_nodeHash].owner == msg.sender, 'Not node owner');

        s.nodes[_nodeHash].nodeType = _nodeType;
        s.nodes[_nodeHash].capacity = _capacity;

        emit NodeUpdated(_nodeHash, _nodeType, _capacity);
    }

    function deactivateNode(bytes32 _nodeHash) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_nodeHash].owner == msg.sender, 'Not node owner');
        s.nodes[_nodeHash].active = false;
        emit NodeDeactivated(_nodeHash);
    }

    function updateNodeLocation(
        string memory _addressName,
        string memory _lat,
        string memory _lng,
        bytes32 _node
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        s.nodes[_node].addressName = _addressName;
        s.nodes[_node].lat = _lat;
        s.nodes[_node].lng = _lng;

        emit UpdateLocation(_addressName, _lat, _lng, _node);
    }

    function updateNodeOwner(address _owner, bytes32 _node) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        address oldOwner = s.nodes[_node].owner;
        s.nodes[_node].owner = _owner;

        // Update owner nodes mapping
        bytes32[] storage oldOwnerNodes = s.ownerNodes[oldOwner];
        for (uint256 i = 0; i < oldOwnerNodes.length; i++) {
            if (oldOwnerNodes[i] == _node) {
                oldOwnerNodes[i] = oldOwnerNodes[oldOwnerNodes.length - 1];
                oldOwnerNodes.pop();
                break;
            }
        }
        s.ownerNodes[_owner].push(_node);

        emit UpdateOwner(_owner, _node);
    }

    function updateNodeStatus(bytes1 _status, bytes32 _node) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        s.nodes[_node].active = (_status == bytes1(0x01));
        s.nodes[_node].validNode = (_status == bytes1(0x01));

        emit UpdateStatus(_status, _node);
    }

    function updateNodeCapacity(bytes32 _node, uint256[] memory _quantities) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        uint256 newCapacity = 0;
        for (uint256 i = 0; i < _quantities.length; i++) {
            newCapacity += _quantities[i];
        }
        s.nodes[_node].capacity = newCapacity;

        emit NodeCapacityUpdated(_node, _quantities);
    }

    function addSupportedAsset(
        bytes32 _node,
        address _token,
        uint256 _tokenId,
        uint256 _price,
        uint256 _capacity
    ) external returns (uint256 assetId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        assetId = s.totalNodeAssets[_node];
        s.totalNodeAssets[_node]++;

        s.nodeAssets[_node][assetId] = DiamondStorage.NodeAsset({
            token: _token,
            tokenId: _tokenId,
            price: _price,
            capacity: _capacity,
            createdAt: block.timestamp,
            active: true
        });

        s.nodeAssetIds[_node].push(assetId);

        emit SupportedAssetAdded(_node, _token, _tokenId, _price, _capacity);

        return assetId;
    }

    function updateSupportedAssets(
        bytes32 _node,
        address[] memory _tokens,
        uint256[] memory _tokenIds,
        uint256[] memory _prices,
        uint256[] memory _capacities
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        require(
            _tokens.length == _tokenIds.length &&
            _tokenIds.length == _prices.length &&
            _prices.length == _capacities.length,
            'Array length mismatch'
        );

        delete s.nodeAssetIds[_node];
        s.totalNodeAssets[_node] = 0;

        for (uint256 i = 0; i < _tokens.length; i++) {
            s.nodeAssets[_node][i] = DiamondStorage.NodeAsset({
                token: _tokens[i],
                tokenId: _tokenIds[i],
                price: _prices[i],
                capacity: _capacities[i],
                createdAt: block.timestamp,
                active: true
            });
            s.nodeAssetIds[_node].push(i);
        }

        s.totalNodeAssets[_node] = _tokens.length;

        emit SupportedAssetsUpdated(_node, _tokens.length);
    }

    function getNode(bytes32 _nodeHash)
        external
        view
        returns (
            address owner,
            string memory nodeType,
            uint256 capacity,
            uint256 createdAt,
            bool active,
            bool validNode,
            bytes32 assetHash,
            string memory addressName,
            string memory lat,
            string memory lng
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Node storage node = s.nodes[_nodeHash];
        return (
            node.owner,
            node.nodeType,
            node.capacity,
            node.createdAt,
            node.active,
            node.validNode,
            node.assetHash,
            node.addressName,
            node.lat,
            node.lng
        );
    }

    function getOwnerNodes(address _owner)
        external
        view
        returns (bytes32[] memory)
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ownerNodes[_owner];
    }

    function getNodeAssets(bytes32 _node)
        external
        view
        returns (DiamondStorage.NodeAsset[] memory)
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 count = s.nodeAssetIds[_node].length;
        DiamondStorage.NodeAsset[] memory assets = new DiamondStorage.NodeAsset[](count);
        for (uint256 i = 0; i < count; i++) {
            assets[i] = s.nodeAssets[_node][s.nodeAssetIds[_node][i]];
        }
        return assets;
    }

    function getTotalNodes() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalNodes;
    }

    function getTotalNodeAssets(bytes32 _node) external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalNodeAssets[_node];
    }

    // ======= AURA ASSET COMPATIBILITY =======

    /**
     * @notice Get node status for an address - compatible with AuraAsset's IAurumNodeManager interface
     * @dev Returns bytes1(1) for active nodes. Validates:
     *      1. Diamond address itself (always valid)
     *      2. Node owner wallet addresses (if they own an active node)
     * @param _node The address to check (Diamond address or node owner wallet)
     * @return status bytes1(1) if valid/active, bytes1(0) otherwise
     */
    function getNodeStatus(address _node) external view returns (bytes1) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Diamond itself is always a valid node
        if (_node == address(this)) {
            return bytes1(uint8(1));
        }
        
        // Check if this address is a node owner with an active node
        // ownerNodes maps wallet address => array of node hashes they own
        bytes32[] storage ownerNodes = s.ownerNodes[_node];
        for (uint256 i = 0; i < ownerNodes.length; i++) {
            if (s.nodes[ownerNodes[i]].active && s.nodes[ownerNodes[i]].validNode) {
                return bytes1(uint8(1));
            }
        }
        
        return bytes1(uint8(0));
    }

    // ======= TOKEN APPROVAL FUNCTIONS =======

    function setAuraAssetAddress(address _auraAsset) external {
        LibDiamond.enforceIsContractOwner();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.auraAssetAddress = _auraAsset;
    }

    function getAuraAssetAddress() external view returns (address) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.auraAssetAddress;
    }

    /**
     * @notice DEPRECATED - CLOB is now internal to Diamond, no external approval needed
     * @dev Kept for backward compatibility. Does nothing since Diamond holds tokens internally.
     * 
     * @custom:deprecated This function is deprecated and will be removed in v2.0.
     *                    CLOB is now internal to the Diamond - no external approval needed.
     *                    Tokens deposited to a node are automatically available for trading.
     *                    Use depositTokensToNode() to add tokens, then placeSellOrderFromNode()
     *                    or OrderRouterFacet.placeOrder() to trade.
     */
    function approveClobForTokens(bytes32 _node, address _clobAddress) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        // DEPRECATED NO-OP: CLOB is internal to Diamond, tokens are already held by Diamond
        // Emit event for backward compatibility with frontends that may be listening
        emit ClobApprovalGranted(_node, _clobAddress);
    }

    /**
     * @notice DEPRECATED - CLOB is now internal to Diamond
     * @dev Kept for backward compatibility. Does nothing since Diamond holds tokens internally.
     * 
     * @custom:deprecated This function is deprecated and will be removed in v2.0.
     *                    CLOB is now internal to the Diamond - no external approval needed.
     *                    To prevent a node from trading, use withdrawTokensFromNode() instead.
     */
    function revokeClobApproval(bytes32 _node, address _clobAddress) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        // DEPRECATED NO-OP: CLOB is internal to Diamond
        // Emit event for backward compatibility with frontends that may be listening
        emit ClobApprovalRevoked(_node, _clobAddress);
    }

    /**
     * @notice DEPRECATED - CLOB is now internal to Diamond
     * @dev Always returns true since Diamond holds tokens and CLOBFacet is internal
     * 
     * @custom:deprecated This function is deprecated and will be removed in v2.0.
     *                    CLOB is now internal to the Diamond - always "approved".
     *                    This check is no longer meaningful.
     */
    function isClobApproved(address /* _clobAddress */) external pure returns (bool) {
        // DEPRECATED: CLOB is internal to Diamond, always "approved"
        return true;
    }

    /**
     * @notice Place a sell order on the Diamond CLOB from node's inventory
     * @dev Uses Diamond's internal CLOBFacet - no external contract calls
     * @param _node The node hash whose inventory to sell from
     * @param _tokenId The ERC1155 token ID to sell
     * @param _quoteToken The payment token (USDC, etc.)
     * @param _price Price per unit in quote token
     * @param _amount Amount to sell
     * @return orderId The CLOB order ID
     */
    function placeSellOrderFromNode(
        bytes32 _node,
        uint256 _tokenId,
        address _quoteToken,
        uint256 _price,
        uint256 _amount
    ) external returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        require(s.auraAssetAddress != address(0), 'AuraAsset not set');
        require(_amount > 0, 'Amount must be positive');
        require(s.nodeTokenBalances[_node][_tokenId] >= _amount, 'Insufficient node balance - deposit tokens first');

        // Debit node's internal balance
        s.nodeTokenBalances[_node][_tokenId] -= _amount;

        // Route through OrderRouterFacet - SINGLE ENTRY POINT for all orders
        // This ensures consistent V2 storage usage and proper order matching
        orderId = IOrderRouter(address(this)).placeNodeSellOrder(
            msg.sender,           // nodeOwner receives proceeds
            s.auraAssetAddress,   // baseToken
            _tokenId,             // baseTokenId
            _quoteToken,          // quoteToken
            uint96(_price),       // price (cast to uint96)
            uint96(_amount),      // amount (cast to uint96)
            0,                    // timeInForce: GTC (Good Till Cancel)
            0                     // expiry: 0 = no expiry
        );

        emit NodeSellOrderPlaced(_node, _tokenId, _quoteToken, _price, _amount, orderId);
    }

    // Event for sell order placement
    event NodeSellOrderPlaced(
        bytes32 indexed nodeHash,
        uint256 indexed tokenId,
        address quoteToken,
        uint256 price,
        uint256 amount,
        bytes32 orderId
    );

    // ======= NODE TOKEN INVENTORY FUNCTIONS =======

    /**
     * @notice Record tokens minted to a node (called after minting to Diamond)
     * @dev This updates internal accounting. Actual ERC1155 mint happens externally.
     * @param _node The node hash to credit
     * @param _tokenId The ERC1155 token ID
     * @param _amount The amount minted
     */
    function creditNodeTokens(
        bytes32 _node,
        uint256 _tokenId,
        uint256 _amount
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        require(_amount > 0, 'Amount must be positive');
        
        // Update balance
        s.nodeTokenBalances[_node][_tokenId] += _amount;
        
        // Track token ID if new
        if (!s.nodeHasToken[_node][_tokenId]) {
            s.nodeHasToken[_node][_tokenId] = true;
            s.nodeTokenIds[_node].push(_tokenId);
        }
        
        emit TokensMintedToNode(_node, _tokenId, _amount, msg.sender);
    }

    /**
     * @notice Deposit tokens from caller's wallet to a node's inventory
     * @dev Transfers ERC1155 from caller to Diamond and credits node
     * @param _node The node hash to credit
     * @param _tokenId The ERC1155 token ID
     * @param _amount The amount to deposit
     */
    function depositTokensToNode(
        bytes32 _node,
        uint256 _tokenId,
        uint256 _amount
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        require(s.auraAssetAddress != address(0), 'AuraAsset not set');
        require(_amount > 0, 'Amount must be positive');
        
        // Transfer tokens from caller to Diamond
        IERC1155(s.auraAssetAddress).safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId,
            _amount,
            ""
        );
        
        // Update internal balance
        s.nodeTokenBalances[_node][_tokenId] += _amount;
        
        // Track token ID if new
        if (!s.nodeHasToken[_node][_tokenId]) {
            s.nodeHasToken[_node][_tokenId] = true;
            s.nodeTokenIds[_node].push(_tokenId);
        }
        
        emit TokensDepositedToNode(_node, _tokenId, _amount, msg.sender);
    }

    /**
     * @notice Withdraw tokens from a node's inventory to caller's wallet
     * @dev Transfers ERC1155 from Diamond to caller and debits node
     * @param _node The node hash to debit
     * @param _tokenId The ERC1155 token ID
     * @param _amount The amount to withdraw
     */
    function withdrawTokensFromNode(
        bytes32 _node,
        uint256 _tokenId,
        uint256 _amount
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        require(s.auraAssetAddress != address(0), 'AuraAsset not set');
        require(_amount > 0, 'Amount must be positive');
        require(s.nodeTokenBalances[_node][_tokenId] >= _amount, 'Insufficient node balance');
        
        // Update internal balance first (checks-effects-interactions)
        s.nodeTokenBalances[_node][_tokenId] -= _amount;
        
        // Transfer tokens from Diamond to caller
        IERC1155(s.auraAssetAddress).safeTransferFrom(
            address(this),
            msg.sender,
            _tokenId,
            _amount,
            ""
        );
        
        emit TokensWithdrawnFromNode(_node, _tokenId, _amount, msg.sender);
    }

    /**
     * @notice Transfer tokens between nodes (internal accounting only)
     * @dev Both nodes must be owned by caller. No ERC1155 transfer needed.
     * @param _fromNode Source node hash
     * @param _toNode Destination node hash
     * @param _tokenId The ERC1155 token ID
     * @param _amount The amount to transfer
     */
    function transferTokensBetweenNodes(
        bytes32 _fromNode,
        bytes32 _toNode,
        uint256 _tokenId,
        uint256 _amount
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_fromNode].owner == msg.sender, 'Not source node owner');
        require(s.nodes[_toNode].owner == msg.sender, 'Not dest node owner');
        require(_amount > 0, 'Amount must be positive');
        require(s.nodeTokenBalances[_fromNode][_tokenId] >= _amount, 'Insufficient source balance');
        
        // Update balances
        s.nodeTokenBalances[_fromNode][_tokenId] -= _amount;
        s.nodeTokenBalances[_toNode][_tokenId] += _amount;
        
        // Track token ID on destination if new
        if (!s.nodeHasToken[_toNode][_tokenId]) {
            s.nodeHasToken[_toNode][_tokenId] = true;
            s.nodeTokenIds[_toNode].push(_tokenId);
        }
        
        emit TokensTransferredBetweenNodes(_fromNode, _toNode, _tokenId, _amount);
    }

    /**
     * @notice Debit tokens from a node (for sales/transfers out)
     * @dev Called by node owner or internal Diamond facets when tokens are sold
     * @param _node The node hash to debit
     * @param _tokenId The ERC1155 token ID
     * @param _amount The amount to debit
     */
    function debitNodeTokens(
        bytes32 _node,
        uint256 _tokenId,
        uint256 _amount
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        // Only node owner or Diamond itself (internal facet calls) can debit
        require(
            s.nodes[_node].owner == msg.sender || msg.sender == address(this),
            'Not authorized'
        );
        require(_amount > 0, 'Amount must be positive');
        require(s.nodeTokenBalances[_node][_tokenId] >= _amount, 'Insufficient node balance');
        
        s.nodeTokenBalances[_node][_tokenId] -= _amount;
    }

    // ======= NODE TOKEN INVENTORY VIEW FUNCTIONS =======

    /**
     * @notice Get a node's balance of a specific token
     * @param _node The node hash
     * @param _tokenId The ERC1155 token ID
     * @return balance The node's internal balance
     */
    function getNodeTokenBalance(
        bytes32 _node,
        uint256 _tokenId
    ) external view returns (uint256 balance) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.nodeTokenBalances[_node][_tokenId];
    }

    /**
     * @notice Get all token IDs a node has ever held
     * @param _node The node hash
     * @return tokenIds Array of token IDs
     */
    function getNodeTokenIds(bytes32 _node) external view returns (uint256[] memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.nodeTokenIds[_node];
    }

    /**
     * @notice Get all token balances for a node
     * @param _node The node hash
     * @return tokenIds Array of token IDs
     * @return balances Array of corresponding balances
     */
    function getNodeInventory(bytes32 _node) 
        external 
        view 
        returns (uint256[] memory tokenIds, uint256[] memory balances) 
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256[] memory ids = s.nodeTokenIds[_node];
        uint256[] memory bals = new uint256[](ids.length);
        
        for (uint256 i = 0; i < ids.length; i++) {
            bals[i] = s.nodeTokenBalances[_node][ids[i]];
        }
        
        return (ids, bals);
    }

    /**
     * @notice Check if Diamond's actual ERC1155 balance matches sum of all node balances
     * @dev Useful for auditing/verification
     * @param _tokenId The ERC1155 token ID to check
     * @param _nodeHashes Array of node hashes to sum
     * @return diamondBalance The Diamond's actual ERC1155 balance
     * @return sumNodeBalances Sum of all specified nodes' internal balances
     * @return isBalanced Whether they match
     */
    function verifyTokenAccounting(
        uint256 _tokenId,
        bytes32[] calldata _nodeHashes
    ) external view returns (
        uint256 diamondBalance,
        uint256 sumNodeBalances,
        bool isBalanced
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.auraAssetAddress != address(0), 'AuraAsset not set');
        
        diamondBalance = IERC1155(s.auraAssetAddress).balanceOf(address(this), _tokenId);
        
        for (uint256 i = 0; i < _nodeHashes.length; i++) {
            sumNodeBalances += s.nodeTokenBalances[_nodeHashes[i]][_tokenId];
        }
        
        isBalanced = (diamondBalance >= sumNodeBalances);
        
        return (diamondBalance, sumNodeBalances, isBalanced);
    }

    // ======= UNIFIED INVENTORY VIEW (METADATA + BALANCE) =======

    /**
     * @notice Struct combining asset metadata with actual tradable balance
     * @dev This struct clarifies the distinction between:
     *      - capacity: The MAXIMUM amount a node can hold (from nodeAssets, set by node owner)
     *      - balance: The ACTUAL amount currently in the node's inventory (from nodeTokenBalances)
     *      
     *      The 'balance' is what matters for trading - it's what the CLOB checks when
     *      executing sell orders. The 'capacity' is metadata/configuration.
     */
    struct AssetWithBalance {
        address token;        // ERC1155 token contract address
        uint256 tokenId;      // Token ID
        uint256 price;        // Price per unit (set by node owner)
        uint256 capacity;     // Maximum capacity (metadata, set by node owner)
        uint256 balance;      // Actual tradable balance (from nodeTokenBalances)
        uint256 createdAt;    // When the asset was added
        bool active;          // Whether the asset is active
    }

    /**
     * @notice Get all assets for a node with both metadata AND actual balances
     * @dev This function combines data from two sources:
     *      1. nodeAssets (metadata): token, tokenId, price, capacity, createdAt, active
     *      2. nodeTokenBalances: actual tradable inventory
     *      
     *      Use this function when you need to display sellable assets with correct quantities.
     *      The 'balance' field shows what can actually be sold, while 'capacity' shows the
     *      configured maximum.
     *      
     * @param _node The node hash
     * @return assets Array of assets with both metadata and actual balances
     */
    function getNodeInventoryWithMetadata(bytes32 _node) 
        external 
        view 
        returns (AssetWithBalance[] memory assets) 
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 count = s.nodeAssetIds[_node].length;
        assets = new AssetWithBalance[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 assetId = s.nodeAssetIds[_node][i];
            DiamondStorage.NodeAsset storage nodeAsset = s.nodeAssets[_node][assetId];
            
            assets[i] = AssetWithBalance({
                token: nodeAsset.token,
                tokenId: nodeAsset.tokenId,
                price: nodeAsset.price,
                capacity: nodeAsset.capacity,
                // Get ACTUAL tradable balance from nodeTokenBalances
                balance: s.nodeTokenBalances[_node][nodeAsset.tokenId],
                createdAt: nodeAsset.createdAt,
                active: nodeAsset.active
            });
        }
        
        return assets;
    }

    /**
     * @notice Get sellable assets for a node (assets with balance > 0)
     * @dev Convenience function that filters to only assets that can actually be sold.
     *      This is what the frontend should use for displaying sellable inventory.
     * @param _node The node hash
     * @return assets Array of assets with balance > 0
     * @return count Number of sellable assets
     */
    function getNodeSellableAssets(bytes32 _node) 
        external 
        view 
        returns (AssetWithBalance[] memory assets, uint256 count) 
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 totalAssets = s.nodeAssetIds[_node].length;
        
        // First pass: count sellable assets
        count = 0;
        for (uint256 i = 0; i < totalAssets; i++) {
            uint256 assetId = s.nodeAssetIds[_node][i];
            DiamondStorage.NodeAsset storage nodeAsset = s.nodeAssets[_node][assetId];
            uint256 balance = s.nodeTokenBalances[_node][nodeAsset.tokenId];
            if (balance > 0 && nodeAsset.active) {
                count++;
            }
        }
        
        // Second pass: populate array
        assets = new AssetWithBalance[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < totalAssets; i++) {
            uint256 assetId = s.nodeAssetIds[_node][i];
            DiamondStorage.NodeAsset storage nodeAsset = s.nodeAssets[_node][assetId];
            uint256 balance = s.nodeTokenBalances[_node][nodeAsset.tokenId];
            
            if (balance > 0 && nodeAsset.active) {
                assets[idx] = AssetWithBalance({
                    token: nodeAsset.token,
                    tokenId: nodeAsset.tokenId,
                    price: nodeAsset.price,
                    capacity: nodeAsset.capacity,
                    balance: balance,
                    createdAt: nodeAsset.createdAt,
                    active: nodeAsset.active
                });
                idx++;
            }
        }
        
        return (assets, count);
    }
}
