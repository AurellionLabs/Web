import { ethers } from 'ethers';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';

const AUSYS_SETTLEMENT_ABI = [
  'function selectTokenDestination(bytes32 orderId, bytes32 nodeId, bool burn) external',
  'function getPendingTokenDestinations(address buyer) external view returns (bytes32[])',
];

const ASSETS_FACET_ABI = [
  'function getCustodyInfo(uint256 tokenId, address custodian) external view returns (uint256 amount)',
  'function getNodeCustodyInfo(uint256 tokenId, bytes32 nodeHash) external view returns (uint256 amount)',
];

const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
];

const ERC1155_APPROVAL_ABI = [
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved) external',
];

const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

export interface CustodyEntry {
  nodeAddress: string;
  nodeLocation: string;
  amount: bigint;
}

export interface CustodyBreakdown {
  inWallet: bigint;
  nodes: CustodyEntry[];
  totalBalance: bigint;
}

export class SettlementService {
  private repositoryContext: RepositoryContext;

  constructor() {
    this.repositoryContext = RepositoryContext.getInstance();
  }

  // ---------------------------------------------------------------------------
  // Token balance
  // ---------------------------------------------------------------------------

  /**
   * Returns the ERC1155 balance of `account` for `tokenId`.
   * Defaults to the main Diamond address; pass `tokenAddress` to query
   * a different ERC1155 contract (e.g. AURA asset token).
   */
  async getTokenBalance(
    account: string,
    tokenId: string,
    tokenAddress: string = NEXT_PUBLIC_DIAMOND_ADDRESS,
  ): Promise<bigint> {
    const provider = this.repositoryContext.getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC1155_ABI, provider);
    return contract.balanceOf(account, BigInt(tokenId));
  }

  // ---------------------------------------------------------------------------
  // ERC1155 approval
  // ---------------------------------------------------------------------------

  /**
   * Checks whether `operator` is approved to transfer all tokens on behalf of
   * `owner` on the given token contract. Read-only — no wallet required.
   */
  async isApprovedForAll(
    owner: string,
    tokenAddress: string,
    operator: string,
  ): Promise<boolean> {
    const provider = this.repositoryContext.getProvider();
    const contract = new ethers.Contract(
      tokenAddress,
      ERC1155_APPROVAL_ABI,
      provider,
    );
    return contract.isApprovedForAll(owner, operator);
  }

  /**
   * Approves `operator` to transfer all tokens for the signer.
   * Wallet interaction required.
   */
  async setApprovalForAll(
    tokenAddress: string,
    operator: string,
  ): Promise<void> {
    const signer = this.repositoryContext.getSigner();
    const contract = new ethers.Contract(
      tokenAddress,
      ERC1155_APPROVAL_ABI,
      signer,
    );
    const tx = await contract.setApprovalForAll(operator, true);
    await tx.wait();
  }

  // ---------------------------------------------------------------------------
  // Pending settlement
  // ---------------------------------------------------------------------------

  /**
   * Returns all order IDs where the buyer has a pending token destination choice.
   * Called on every page load to detect offline settlements.
   */
  async getPendingOrders(buyerAddress: string): Promise<string[]> {
    const provider = this.repositoryContext.getProvider();
    const contract = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      AUSYS_SETTLEMENT_ABI,
      provider,
    );

    const orderIds: string[] =
      await contract.getPendingTokenDestinations(buyerAddress);

    return orderIds.filter((id) => id !== ZERO_BYTES32);
  }

  /**
   * Selects where settled tokens should go — a node (custody) or burn (redeem).
   * Wallet interaction required.
   */
  async selectDestination(
    orderId: string,
    nodeId: string | null,
    burn: boolean,
  ): Promise<void> {
    // Validate BEFORE getting signer (avoids unnecessary blockchain call on invalid input)
    // Also reject zero bytes32 since it's the burn destination
    if (!burn && (!nodeId || nodeId === ZERO_BYTES32)) {
      throw new Error('Node ID is required when not burning');
    }
    const effectiveNodeId = burn ? ZERO_BYTES32 : nodeId;

    const signer = this.repositoryContext.getSigner();
    const contract = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      AUSYS_SETTLEMENT_ABI,
      signer,
    );

    const tx = await contract.selectTokenDestination(
      orderId,
      effectiveNodeId,
      burn,
    );
    await tx.wait();
  }

  // ---------------------------------------------------------------------------
  // On-chain custody info
  // ---------------------------------------------------------------------------

  /**
   * Queries `getCustodyInfo(tokenId, custodian)` on the Diamond (AssetsFacet).
   * Returns how much of the underlying the given custodian address is responsible for.
   */
  async getCustodyInfo(tokenId: string, custodian: string): Promise<bigint> {
    const provider = this.repositoryContext.getProvider();
    const contract = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      ASSETS_FACET_ABI,
      provider,
    );
    const amount: bigint = await contract.getCustodyInfo(
      BigInt(tokenId),
      custodian,
    );
    return amount;
  }

  /**
   * Queries `getNodeCustodyInfo(tokenId, nodeHash)` on the Diamond (AssetsFacet).
   * Returns how much of the token is custodied at a specific node (not wallet).
   */
  async getNodeCustodyInfo(tokenId: string, nodeHash: string): Promise<bigint> {
    const provider = this.repositoryContext.getProvider();
    const contract = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      ASSETS_FACET_ABI,
      provider,
    );
    const amount: bigint = await contract.getNodeCustodyInfo(
      BigInt(tokenId),
      nodeHash,
    );
    return amount;
  }

  // ---------------------------------------------------------------------------
  // Custody breakdown (legacy — wallet-balance based)
  // ---------------------------------------------------------------------------

  /**
   * Returns how much of a given tokenId is held in-wallet vs custodied
   * across a set of node addresses. Used by AssetDetailDrawer.
   */
  async getCustodyBreakdown(
    tokenId: string,
    walletBalance: bigint,
    nodes: Array<{ address: string; location: string }>,
  ): Promise<CustodyBreakdown> {
    if (nodes.length === 0) {
      return {
        inWallet: walletBalance,
        nodes: [],
        totalBalance: walletBalance,
      };
    }

    const provider = this.repositoryContext.getProvider();
    const contract = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      ERC1155_ABI,
      provider,
    );

    const tokenIdBigInt = BigInt(tokenId);
    const nodeAddresses = nodes.map((n) => n.address);
    const ids = nodeAddresses.map(() => tokenIdBigInt);

    let balances: bigint[];
    try {
      balances = await contract.balanceOfBatch(nodeAddresses, ids);
    } catch {
      balances = await Promise.all(
        nodeAddresses.map((addr) => contract.balanceOf(addr, tokenIdBigInt)),
      );
    }

    const custodyEntries: CustodyEntry[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (balances[i] > 0n) {
        custodyEntries.push({
          nodeAddress: nodes[i].address,
          nodeLocation: nodes[i].location,
          amount: balances[i],
        });
      }
    }

    const totalNodeCustody = custodyEntries.reduce(
      (sum, e) => sum + e.amount,
      0n,
    );
    const inWallet =
      walletBalance > totalNodeCustody ? walletBalance - totalNodeCustody : 0n;

    return {
      inWallet,
      nodes: custodyEntries,
      totalBalance: walletBalance,
    };
  }
}

// Singleton
let _instance: SettlementService | null = null;
export function getSettlementService(): SettlementService {
  if (!_instance) _instance = new SettlementService();
  return _instance;
}
