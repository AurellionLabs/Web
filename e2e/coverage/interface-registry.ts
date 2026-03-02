/**
 * Interface Registry - Extracts and registers interface methods for coverage tracking
 *
 * This module provides utilities to extract method names from TypeScript interfaces
 * and register them for coverage validation.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface InterfaceDefinition {
  name: string;
  methods: string[];
  category: 'repository' | 'service';
  domain: string;
}

export interface RegisteredInterface {
  definition: InterfaceDefinition;
  registeredAt: number;
}

// =============================================================================
// INTERFACE DEFINITIONS
// =============================================================================

/**
 * Manually defined interface methods
 *
 * These are extracted from the domain interfaces. In a production system,
 * you could use TypeScript's compiler API to extract these automatically.
 */
export const INTERFACE_DEFINITIONS: InterfaceDefinition[] = [
  // RWY Domain
  {
    name: 'IRWYRepository',
    category: 'repository',
    domain: 'rwy',
    methods: [
      'getOpportunityById',
      'getAllOpportunities',
      'getOpportunitiesByOperator',
      'getOpportunitiesByStatus',
      'getActiveOpportunities',
      'getStake',
      'getStakerOpportunities',
      'getOpportunityStakers',
      'getOperatorStats',
      'isApprovedOperator',
      'calculateExpectedProfit',
      'getOpportunityWithDynamicData',
      'getAllOpportunitiesWithDynamicData',
    ],
  },
  {
    name: 'IRWYService',
    category: 'service',
    domain: 'rwy',
    methods: [
      'createOpportunity',
      'stake',
      'unstake',
      'startDelivery',
      'confirmDelivery',
      'completeProcessing',
      'claimProfits',
      'emergencyClaim',
      'cancelOpportunity',
      'approveTokensForStaking',
      'isApprovedForStaking',
    ],
  },

  // Pool Domain
  {
    name: 'IPoolRepository',
    category: 'repository',
    domain: 'pool',
    methods: [
      'getPoolById',
      'getPoolStakeHistory',
      'findPoolsByInvestor',
      'findPoolsByProvider',
      'getAllPools',
      'getPoolWithDynamicData',
      'getAllPoolsWithDynamicData',
      'getUserPoolsWithDynamicData',
      'getProviderPoolsWithDynamicData',
      'getGroupedStakeHistory',
      'calculatePoolDynamicData',
    ],
  },
  {
    name: 'IPoolService',
    category: 'service',
    domain: 'pool',
    methods: [
      'createPool',
      'closePool',
      'stake',
      'claimReward',
      'unlockReward',
    ],
  },

  // Order Domain
  {
    name: 'IOrderRepository',
    category: 'repository',
    domain: 'orders',
    methods: [
      'getJourneyById',
      'getOrderById',
      'getOrdersByCustomer',
      'getOrdersByNode',
      'getJourneysByDriver',
      'getPendingJourneys',
      'getActiveJourneys',
      'getCompletedJourneys',
    ],
  },
  {
    name: 'IOrderService',
    category: 'service',
    domain: 'orders',
    methods: [
      'jobCreation',
      'customerSignPackage',
      'createOrder',
      'addReceiverToOrder',
      'createOrderJourney',
    ],
  },

  // Driver Domain
  {
    name: 'IDriverRepository',
    category: 'repository',
    domain: 'driver',
    methods: ['getMyDeliveries'],
  },
  {
    name: 'IDriverService',
    category: 'service',
    domain: 'driver',
    methods: [
      'acceptDelivery',
      'confirmPickup',
      'packageSign',
      'completeDelivery',
    ],
  },

  // AuStake Domain
  {
    name: 'IAuStakeRepository',
    category: 'repository',
    domain: 'austake',
    methods: [
      'getOperationById',
      'getAllOperations',
      'getOperationsByProvider',
      'getStakeHistory',
    ],
  },
  {
    name: 'IAuStakeService',
    category: 'service',
    domain: 'austake',
    methods: [
      'createOperation',
      'closeOperation',
      'stake',
      'triggerReward',
      'unlockReward',
    ],
  },

  // Node Domain
  {
    name: 'NodeRepository',
    category: 'repository',
    domain: 'node',
    methods: [
      'registerNode',
      'getAllNodes',
      'getNodeByAddress',
      'getNodesByOwner',
      'getNodeAssets',
      'getAssetBalance',
    ],
  },
  {
    name: 'INodeAssetService',
    category: 'service',
    domain: 'node',
    methods: [
      'mintAsset',
      'burnAsset',
      'transferAsset',
      'getAssetMetadata',
      'listNodeAssets',
      'updateNodeAssetPrice',
    ],
  },
];

// =============================================================================
// REGISTRY CLASS
// =============================================================================

export class InterfaceRegistry {
  private interfaces: Map<string, RegisteredInterface> = new Map();
  private static instance: InterfaceRegistry | null = null;

  private constructor() {
    // Register all known interfaces
    for (const definition of INTERFACE_DEFINITIONS) {
      this.register(definition);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): InterfaceRegistry {
    if (!InterfaceRegistry.instance) {
      InterfaceRegistry.instance = new InterfaceRegistry();
    }
    return InterfaceRegistry.instance;
  }

  /**
   * Register an interface definition
   */
  register(definition: InterfaceDefinition): void {
    this.interfaces.set(definition.name, {
      definition,
      registeredAt: Date.now(),
    });
  }

  /**
   * Get an interface by name
   */
  get(name: string): InterfaceDefinition | undefined {
    return this.interfaces.get(name)?.definition;
  }

  /**
   * Get all interfaces
   */
  getAll(): InterfaceDefinition[] {
    return Array.from(this.interfaces.values()).map((r) => r.definition);
  }

  /**
   * Get interfaces by domain
   */
  getByDomain(domain: string): InterfaceDefinition[] {
    return this.getAll().filter((def) => def.domain === domain);
  }

  /**
   * Get interfaces by category
   */
  getByCategory(category: 'repository' | 'service'): InterfaceDefinition[] {
    return this.getAll().filter((def) => def.category === category);
  }

  /**
   * Get all method names for an interface
   */
  getMethods(interfaceName: string): string[] {
    const def = this.get(interfaceName);
    return def?.methods ?? [];
  }

  /**
   * Check if a method exists in an interface
   */
  hasMethod(interfaceName: string, methodName: string): boolean {
    const methods = this.getMethods(interfaceName);
    return methods.includes(methodName);
  }

  /**
   * Get all domains
   */
  getDomains(): string[] {
    const domains = new Set(this.getAll().map((def) => def.domain));
    return Array.from(domains);
  }

  /**
   * Get total method count
   */
  getTotalMethodCount(): number {
    return this.getAll().reduce((sum, def) => sum + def.methods.length, 0);
  }

  /**
   * Get interface count
   */
  getInterfaceCount(): number {
    return this.interfaces.size;
  }

  /**
   * Print registry summary
   */
  printSummary(): void {
    console.log('\n📚 Interface Registry Summary');
    console.log('═'.repeat(50));

    const domains = this.getDomains();
    for (const domain of domains) {
      const interfaces = this.getByDomain(domain);
      console.log(`\n📁 ${domain.toUpperCase()}`);

      for (const iface of interfaces) {
        const icon = iface.category === 'repository' ? '📖' : '⚡';
        console.log(
          `   ${icon} ${iface.name} (${iface.methods.length} methods)`,
        );
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(
      `Total: ${this.getInterfaceCount()} interfaces, ${this.getTotalMethodCount()} methods`,
    );
    console.log('═'.repeat(50) + '\n');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the interface registry instance
 */
export function getInterfaceRegistry(): InterfaceRegistry {
  return InterfaceRegistry.getInstance();
}

/**
 * Get all interface names
 */
export function getAllInterfaceNames(): string[] {
  return getInterfaceRegistry()
    .getAll()
    .map((def) => def.name);
}

/**
 * Get all methods for a domain
 */
export function getDomainMethods(domain: string): Map<string, string[]> {
  const registry = getInterfaceRegistry();
  const interfaces = registry.getByDomain(domain);
  const methodMap = new Map<string, string[]>();

  for (const iface of interfaces) {
    methodMap.set(iface.name, iface.methods);
  }

  return methodMap;
}

/**
 * Validate that an interface exists
 */
export function validateInterface(name: string): boolean {
  return getInterfaceRegistry().get(name) !== undefined;
}

/**
 * Validate that a method exists in an interface
 */
export function validateMethod(
  interfaceName: string,
  methodName: string,
): boolean {
  return getInterfaceRegistry().hasMethod(interfaceName, methodName);
}
