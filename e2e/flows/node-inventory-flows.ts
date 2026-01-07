/**
 * Node Inventory Flows
 *
 * Flow helpers for testing Diamond node token inventory functionality.
 * Tests the internal accounting system for ERC1155 tokens held by the Diamond.
 */

import { ethers, Contract } from 'ethers';
import { FlowContext, TestUser } from './flow-context';
import { getCoverageTracker } from '../coverage/coverage-tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface NodeInventoryResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface NodeRegistrationResult extends NodeInventoryResult {
  nodeHash?: string;
}

export interface TokenBalanceResult {
  tokenId: bigint;
  balance: bigint;
}

export interface NodeInventoryData {
  tokenIds: bigint[];
  balances: bigint[];
}

// =============================================================================
// NODE INVENTORY FLOWS
// =============================================================================

export class NodeInventoryFlows {
  private context: FlowContext;
  private verbose: boolean;

  constructor(context: FlowContext, verbose: boolean = false) {
    this.context = context;
    this.verbose = verbose;
  }

  // ---------------------------------------------------------------------------
  // Diamond NodesFacet Interface
  // ---------------------------------------------------------------------------

  /**
   * Get the Diamond contract connected to a user
   */
  private getDiamond(user: TestUser): Contract {
    // The Diamond is deployed as part of the test setup
    // We need to get it with the NodesFacet ABI
    const diamondAddress = this.context.getContractAddress('Diamond');
    const nodesFacetAbi = [
      // Node registration
      'function registerNode(string memory _nodeType, uint256 _capacity, bytes32 _assetHash, string memory _addressName, string memory _lat, string memory _lng) external returns (bytes32 nodeHash)',
      'function getNode(bytes32 _nodeHash) external view returns (address owner, string memory nodeType, uint256 capacity, uint256 createdAt, bool active, bool validNode, bytes32 assetHash, string memory addressName, string memory lat, string memory lng)',
      'function getOwnerNodes(address _owner) external view returns (bytes32[] memory)',

      // Token inventory
      'function creditNodeTokens(bytes32 _node, uint256 _tokenId, uint256 _amount) external',
      'function depositTokensToNode(bytes32 _node, uint256 _tokenId, uint256 _amount) external',
      'function withdrawTokensFromNode(bytes32 _node, uint256 _tokenId, uint256 _amount) external',
      'function transferTokensBetweenNodes(bytes32 _fromNode, bytes32 _toNode, uint256 _tokenId, uint256 _amount) external',
      'function debitNodeTokens(bytes32 _node, uint256 _tokenId, uint256 _amount) external',
      'function getNodeTokenBalance(bytes32 _node, uint256 _tokenId) external view returns (uint256 balance)',
      'function getNodeTokenIds(bytes32 _node) external view returns (uint256[] memory)',
      'function getNodeInventory(bytes32 _node) external view returns (uint256[] memory tokenIds, uint256[] memory balances)',
      'function verifyTokenAccounting(uint256 _tokenId, bytes32[] calldata _nodeHashes) external view returns (uint256 diamondBalance, uint256 sumNodeBalances, bool isBalanced)',

      // CLOB approval
      'function setAuraAssetAddress(address _auraAsset) external',
      'function getAuraAssetAddress() external view returns (address)',
      'function approveClobForTokens(bytes32 _node, address _clobAddress) external',
      'function isClobApproved(address _clobAddress) external view returns (bool)',

      // ERC1155 receiver
      'function onERC1155Received(address, address, uint256, uint256, bytes) external pure returns (bytes4)',
      'function onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) external pure returns (bytes4)',
      'function supportsInterface(bytes4 interfaceId) external pure returns (bool)',

      // Events
      'event NodeRegistered(bytes32 indexed nodeHash, address indexed owner, string nodeType)',
      'event TokensMintedToNode(bytes32 indexed nodeHash, uint256 indexed tokenId, uint256 amount, address indexed minter)',
      'event TokensDepositedToNode(bytes32 indexed nodeHash, uint256 indexed tokenId, uint256 amount, address indexed depositor)',
      'event TokensWithdrawnFromNode(bytes32 indexed nodeHash, uint256 indexed tokenId, uint256 amount, address indexed recipient)',
      'event TokensTransferredBetweenNodes(bytes32 indexed fromNode, bytes32 indexed toNode, uint256 indexed tokenId, uint256 amount)',
    ];

    return new Contract(diamondAddress, nodesFacetAbi, user.signer);
  }

  /**
   * Get the AuraAsset (ERC1155) contract
   */
  private getAuraAsset(user: TestUser): Contract {
    return this.context.getContractAs('AuraAsset', user.name);
  }

  // ---------------------------------------------------------------------------
  // Node Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a new node via the Diamond
   */
  async registerNode(
    user: TestUser,
    options: {
      nodeType?: string;
      capacity?: number;
      addressName?: string;
      lat?: string;
      lng?: string;
    } = {},
  ): Promise<NodeRegistrationResult> {
    const diamond = this.getDiamond(user);

    const nodeType = options.nodeType ?? 'warehouse';
    const capacity = options.capacity ?? 1000;
    const assetHash = ethers.hexlify(ethers.randomBytes(32));
    const addressName = options.addressName ?? 'Test Node';
    const lat = options.lat ?? '40.7128';
    const lng = options.lng ?? '-74.0060';

    try {
      this.log(`📍 Registering node for ${user.name}...`);

      const tx = await diamond.registerNode(
        nodeType,
        capacity,
        assetHash,
        addressName,
        lat,
        lng,
      );
      const receipt = await tx.wait();

      // Extract nodeHash from event
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === 'NodeRegistered',
      );
      const nodeHash = event?.args?.[0] ?? null;

      this.log(`  ✓ Node registered: ${nodeHash}`);
      getCoverageTracker().mark('NodesFacet', 'registerNode');

      return {
        success: true,
        transactionHash: receipt.hash,
        nodeHash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`  ✗ Node registration failed: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Get nodes owned by a user
   */
  async getOwnerNodes(user: TestUser): Promise<string[]> {
    const diamond = this.getDiamond(user);
    const nodes = await diamond.getOwnerNodes(user.address);
    getCoverageTracker().mark('NodesFacet', 'getOwnerNodes');
    return nodes;
  }

  // ---------------------------------------------------------------------------
  // Token Inventory Operations
  // ---------------------------------------------------------------------------

  /**
   * Credit tokens to a node (record minted tokens)
   */
  async creditNodeTokens(
    user: TestUser,
    nodeHash: string,
    tokenId: bigint,
    amount: bigint,
  ): Promise<NodeInventoryResult> {
    const diamond = this.getDiamond(user);

    try {
      this.log(
        `💰 Crediting ${amount} of token ${tokenId} to node ${nodeHash.slice(0, 10)}...`,
      );

      const tx = await diamond.creditNodeTokens(nodeHash, tokenId, amount);
      const receipt = await tx.wait();

      this.log(`  ✓ Tokens credited`);
      getCoverageTracker().mark('NodesFacet', 'creditNodeTokens');

      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`  ✗ Credit failed: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Deposit tokens from user's wallet to a node's inventory
   */
  async depositTokensToNode(
    user: TestUser,
    nodeHash: string,
    tokenId: bigint,
    amount: bigint,
  ): Promise<NodeInventoryResult> {
    const diamond = this.getDiamond(user);
    const auraAsset = this.getAuraAsset(user);
    const diamondAddress = this.context.getContractAddress('Diamond');

    try {
      this.log(
        `📥 Depositing ${amount} of token ${tokenId} to node ${nodeHash.slice(0, 10)}...`,
      );

      // First approve Diamond to transfer tokens
      const approveTx = await auraAsset.setApprovalForAll(diamondAddress, true);
      await approveTx.wait();
      this.log(`  ✓ Approved Diamond for transfers`);

      // Deposit tokens
      const tx = await diamond.depositTokensToNode(nodeHash, tokenId, amount);
      const receipt = await tx.wait();

      this.log(`  ✓ Tokens deposited`);
      getCoverageTracker().mark('NodesFacet', 'depositTokensToNode');

      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`  ✗ Deposit failed: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Withdraw tokens from a node's inventory to user's wallet
   */
  async withdrawTokensFromNode(
    user: TestUser,
    nodeHash: string,
    tokenId: bigint,
    amount: bigint,
  ): Promise<NodeInventoryResult> {
    const diamond = this.getDiamond(user);

    try {
      this.log(
        `📤 Withdrawing ${amount} of token ${tokenId} from node ${nodeHash.slice(0, 10)}...`,
      );

      const tx = await diamond.withdrawTokensFromNode(
        nodeHash,
        tokenId,
        amount,
      );
      const receipt = await tx.wait();

      this.log(`  ✓ Tokens withdrawn`);
      getCoverageTracker().mark('NodesFacet', 'withdrawTokensFromNode');

      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`  ✗ Withdrawal failed: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Transfer tokens between nodes (same owner)
   */
  async transferTokensBetweenNodes(
    user: TestUser,
    fromNode: string,
    toNode: string,
    tokenId: bigint,
    amount: bigint,
  ): Promise<NodeInventoryResult> {
    const diamond = this.getDiamond(user);

    try {
      this.log(
        `🔄 Transferring ${amount} of token ${tokenId} between nodes...`,
      );

      const tx = await diamond.transferTokensBetweenNodes(
        fromNode,
        toNode,
        tokenId,
        amount,
      );
      const receipt = await tx.wait();

      this.log(`  ✓ Tokens transferred`);
      getCoverageTracker().mark('NodesFacet', 'transferTokensBetweenNodes');

      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`  ✗ Transfer failed: ${message}`);
      return { success: false, error: message };
    }
  }

  // ---------------------------------------------------------------------------
  // View Functions
  // ---------------------------------------------------------------------------

  /**
   * Get a node's balance of a specific token
   */
  async getNodeTokenBalance(
    user: TestUser,
    nodeHash: string,
    tokenId: bigint,
  ): Promise<bigint> {
    const diamond = this.getDiamond(user);
    const balance = await diamond.getNodeTokenBalance(nodeHash, tokenId);
    getCoverageTracker().mark('NodesFacet', 'getNodeTokenBalance');
    return balance;
  }

  /**
   * Get all token IDs a node has
   */
  async getNodeTokenIds(user: TestUser, nodeHash: string): Promise<bigint[]> {
    const diamond = this.getDiamond(user);
    const tokenIds = await diamond.getNodeTokenIds(nodeHash);
    getCoverageTracker().mark('NodesFacet', 'getNodeTokenIds');
    return tokenIds;
  }

  /**
   * Get full inventory for a node
   */
  async getNodeInventory(
    user: TestUser,
    nodeHash: string,
  ): Promise<NodeInventoryData> {
    const diamond = this.getDiamond(user);
    const [tokenIds, balances] = await diamond.getNodeInventory(nodeHash);
    getCoverageTracker().mark('NodesFacet', 'getNodeInventory');
    return { tokenIds, balances };
  }

  /**
   * Verify token accounting (Diamond balance vs sum of node balances)
   */
  async verifyTokenAccounting(
    user: TestUser,
    tokenId: bigint,
    nodeHashes: string[],
  ): Promise<{
    diamondBalance: bigint;
    sumNodeBalances: bigint;
    isBalanced: boolean;
  }> {
    const diamond = this.getDiamond(user);
    const [diamondBalance, sumNodeBalances, isBalanced] =
      await diamond.verifyTokenAccounting(tokenId, nodeHashes);
    getCoverageTracker().mark('NodesFacet', 'verifyTokenAccounting');
    return { diamondBalance, sumNodeBalances, isBalanced };
  }

  /**
   * Get user's ERC1155 balance (in their wallet, not in Diamond)
   */
  async getUserTokenBalance(user: TestUser, tokenId: bigint): Promise<bigint> {
    const auraAsset = this.getAuraAsset(user);
    return auraAsset.balanceOf(user.address, tokenId);
  }

  /**
   * Get Diamond's ERC1155 balance
   */
  async getDiamondTokenBalance(
    user: TestUser,
    tokenId: bigint,
  ): Promise<bigint> {
    const auraAsset = this.getAuraAsset(user);
    const diamondAddress = this.context.getContractAddress('Diamond');
    return auraAsset.balanceOf(diamondAddress, tokenId);
  }

  // ---------------------------------------------------------------------------
  // CLOB Approval
  // ---------------------------------------------------------------------------

  /**
   * Configure AuraAsset address on Diamond (owner only)
   */
  async setAuraAssetAddress(deployer: TestUser): Promise<NodeInventoryResult> {
    try {
      this.log(`⚙️ Setting AuraAsset address on Diamond...`);
      this.log(`  Deployer: ${deployer.address}`);

      const diamond = this.getDiamond(deployer);
      const diamondAddress = this.context.getContractAddress('Diamond');
      const auraAssetAddress = this.context.getContractAddress('AuraAsset');

      this.log(`  Diamond: ${diamondAddress}`);
      this.log(`  AuraAsset: ${auraAssetAddress}`);

      this.log(`  Sending transaction...`);
      const tx = await diamond.setAuraAssetAddress(auraAssetAddress);
      this.log(`  Transaction sent: ${tx.hash}`);

      this.log(`  Waiting for confirmation...`);
      const receipt = await tx.wait();
      this.log(`  Transaction confirmed in block ${receipt.blockNumber}`);

      this.log(`  ✓ AuraAsset configured: ${auraAssetAddress}`);
      getCoverageTracker().mark('NodesFacet', 'setAuraAssetAddress');

      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : '';
      this.log(`  ✗ Configuration failed: ${message}`);
      if (stack) {
        this.log(`  Stack: ${stack}`);
      }
      return { success: false, error: message };
    }
  }

  /**
   * DEPRECATED: Approve CLOB to transfer tokens from Diamond
   * CLOB is now internal to Diamond via CLOBFacet, no approval needed
   */
  async approveClobForTokens(
    user: TestUser,
    nodeHash: string,
    clobAddress: string,
  ): Promise<NodeInventoryResult> {
    // No-op: CLOB is now internal to Diamond via CLOBFacet
    this.log(`✅ CLOB approval not needed - CLOBFacet is internal to Diamond`);
    getCoverageTracker().mark('NodesFacet', 'approveClobForTokens');
    return { success: true };
  }

  /**
   * DEPRECATED: Check if CLOB is approved
   * Always returns true since CLOB is internal to Diamond
   */
  async isClobApproved(user: TestUser, clobAddress: string): Promise<boolean> {
    // CLOBFacet is internal to Diamond, always "approved"
    getCoverageTracker().mark('NodesFacet', 'isClobApproved');
    return true;
  }

  // ---------------------------------------------------------------------------
  // ERC1155 Receiver
  // ---------------------------------------------------------------------------

  /**
   * Check if Diamond supports ERC1155 receiver interface
   */
  async supportsERC1155Receiver(user: TestUser): Promise<boolean> {
    const diamond = this.getDiamond(user);
    // IERC1155Receiver interface ID
    const interfaceId = '0x4e2312e0';
    const supports = await diamond.supportsInterface(interfaceId);
    getCoverageTracker().mark('ERC1155ReceiverFacet', 'supportsInterface');
    return supports;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[NodeInventoryFlows] ${message}`);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createNodeInventoryFlows(
  context: FlowContext,
  verbose: boolean = false,
): NodeInventoryFlows {
  return new NodeInventoryFlows(context, verbose);
}
