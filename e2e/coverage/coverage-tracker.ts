/**
 * Coverage Tracker - Track which interface methods have been tested
 *
 * Provides runtime tracking of method coverage with automatic
 * validation and reporting.
 */

import {
  InterfaceDefinition,
  getInterfaceRegistry,
} from './interface-registry';

// =============================================================================
// TYPES
// =============================================================================

export interface MethodCoverage {
  interfaceName: string;
  methodName: string;
  covered: boolean;
  coveredAt?: number;
  testName?: string;
  callCount: number;
}

export interface InterfaceCoverage {
  interfaceName: string;
  domain: string;
  category: 'repository' | 'service';
  totalMethods: number;
  coveredMethods: number;
  coveragePercentage: number;
  methods: MethodCoverage[];
}

export interface CoverageReport {
  timestamp: number;
  totalInterfaces: number;
  totalMethods: number;
  coveredMethods: number;
  overallCoverage: number;
  interfaces: InterfaceCoverage[];
  uncoveredMethods: MethodCoverage[];
  passed: boolean;
}

export interface CoverageTrackerOptions {
  /** Minimum coverage percentage required (0-100) */
  minCoverage?: number;
  /** Fail on any uncovered methods */
  requireFullCoverage?: boolean;
  /** Interfaces to exclude from coverage */
  excludeInterfaces?: string[];
  /** Methods to exclude from coverage */
  excludeMethods?: { interface: string; method: string }[];
}

// =============================================================================
// COVERAGE TRACKER CLASS
// =============================================================================

export class CoverageTracker {
  private coverage: Map<string, Map<string, MethodCoverage>> = new Map();
  private options: Required<CoverageTrackerOptions>;
  private currentTest: string | null = null;

  constructor(options: CoverageTrackerOptions = {}) {
    this.options = {
      minCoverage: options.minCoverage ?? 100,
      requireFullCoverage: options.requireFullCoverage ?? true,
      excludeInterfaces: options.excludeInterfaces ?? [],
      excludeMethods: options.excludeMethods ?? [],
    };

    this.initializeFromRegistry();
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize coverage tracking from the interface registry
   */
  private initializeFromRegistry(): void {
    const registry = getInterfaceRegistry();
    const interfaces = registry.getAll();

    for (const iface of interfaces) {
      if (this.options.excludeInterfaces.includes(iface.name)) {
        continue;
      }

      const methodMap = new Map<string, MethodCoverage>();

      for (const method of iface.methods) {
        const isExcluded = this.options.excludeMethods.some(
          (ex) => ex.interface === iface.name && ex.method === method,
        );

        if (!isExcluded) {
          methodMap.set(method, {
            interfaceName: iface.name,
            methodName: method,
            covered: false,
            callCount: 0,
          });
        }
      }

      this.coverage.set(iface.name, methodMap);
    }
  }

  // ---------------------------------------------------------------------------
  // Coverage Marking
  // ---------------------------------------------------------------------------

  /**
   * Mark a method as covered
   */
  mark(interfaceName: string, methodName: string): void {
    const interfaceCoverage = this.coverage.get(interfaceName);
    if (!interfaceCoverage) {
      console.warn(`⚠️  Unknown interface: ${interfaceName}`);
      return;
    }

    const methodCoverage = interfaceCoverage.get(methodName);
    if (!methodCoverage) {
      console.warn(`⚠️  Unknown method: ${interfaceName}.${methodName}`);
      return;
    }

    methodCoverage.covered = true;
    methodCoverage.coveredAt = Date.now();
    methodCoverage.testName = this.currentTest ?? undefined;
    methodCoverage.callCount++;
  }

  /**
   * Mark multiple methods as covered
   */
  markMany(interfaceName: string, methodNames: string[]): void {
    for (const method of methodNames) {
      this.mark(interfaceName, method);
    }
  }

  /**
   * Mark all methods in an interface as covered
   */
  markAll(interfaceName: string): void {
    const interfaceCoverage = this.coverage.get(interfaceName);
    if (!interfaceCoverage) {
      console.warn(`⚠️  Unknown interface: ${interfaceName}`);
      return;
    }

    for (const methodName of interfaceCoverage.keys()) {
      this.mark(interfaceName, methodName);
    }
  }

  /**
   * Set the current test name for tracking
   */
  setCurrentTest(testName: string | null): void {
    this.currentTest = testName;
  }

  // ---------------------------------------------------------------------------
  // Coverage Queries
  // ---------------------------------------------------------------------------

  /**
   * Check if a method is covered
   */
  isCovered(interfaceName: string, methodName: string): boolean {
    const methodCoverage = this.coverage.get(interfaceName)?.get(methodName);
    return methodCoverage?.covered ?? false;
  }

  /**
   * Get coverage for a specific interface
   */
  getInterfaceCoverage(interfaceName: string): InterfaceCoverage | null {
    const interfaceCoverage = this.coverage.get(interfaceName);
    if (!interfaceCoverage) {
      return null;
    }

    const registry = getInterfaceRegistry();
    const definition = registry.get(interfaceName);
    if (!definition) {
      return null;
    }

    const methods = Array.from(interfaceCoverage.values());
    const coveredCount = methods.filter((m) => m.covered).length;

    return {
      interfaceName,
      domain: definition.domain,
      category: definition.category,
      totalMethods: methods.length,
      coveredMethods: coveredCount,
      coveragePercentage:
        methods.length > 0 ? (coveredCount / methods.length) * 100 : 100,
      methods,
    };
  }

  /**
   * Get all uncovered methods
   */
  getUncoveredMethods(): MethodCoverage[] {
    const uncovered: MethodCoverage[] = [];

    for (const interfaceCoverage of this.coverage.values()) {
      for (const methodCoverage of interfaceCoverage.values()) {
        if (!methodCoverage.covered) {
          uncovered.push(methodCoverage);
        }
      }
    }

    return uncovered;
  }

  /**
   * Get coverage percentage for an interface
   */
  getCoveragePercentage(interfaceName: string): number {
    const coverage = this.getInterfaceCoverage(interfaceName);
    return coverage?.coveragePercentage ?? 0;
  }

  /**
   * Get overall coverage percentage
   */
  getOverallCoverage(): number {
    let totalMethods = 0;
    let coveredMethods = 0;

    for (const interfaceCoverage of this.coverage.values()) {
      for (const methodCoverage of interfaceCoverage.values()) {
        totalMethods++;
        if (methodCoverage.covered) {
          coveredMethods++;
        }
      }
    }

    return totalMethods > 0 ? (coveredMethods / totalMethods) * 100 : 100;
  }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /**
   * Generate a full coverage report
   */
  generateReport(): CoverageReport {
    const interfaces: InterfaceCoverage[] = [];
    let totalMethods = 0;
    let coveredMethods = 0;

    for (const interfaceName of this.coverage.keys()) {
      const coverage = this.getInterfaceCoverage(interfaceName);
      if (coverage) {
        interfaces.push(coverage);
        totalMethods += coverage.totalMethods;
        coveredMethods += coverage.coveredMethods;
      }
    }

    const overallCoverage =
      totalMethods > 0 ? (coveredMethods / totalMethods) * 100 : 100;
    const uncoveredMethods = this.getUncoveredMethods();

    const passed = this.options.requireFullCoverage
      ? uncoveredMethods.length === 0
      : overallCoverage >= this.options.minCoverage;

    return {
      timestamp: Date.now(),
      totalInterfaces: interfaces.length,
      totalMethods,
      coveredMethods,
      overallCoverage,
      interfaces,
      uncoveredMethods,
      passed,
    };
  }

  /**
   * Validate coverage and throw if requirements not met
   */
  validate(): void {
    const report = this.generateReport();

    if (!report.passed) {
      const uncoveredList = report.uncoveredMethods
        .map((m) => `  - ${m.interfaceName}.${m.methodName}`)
        .join('\n');

      throw new Error(
        `Interface coverage validation failed!\n\n` +
          `Coverage: ${report.overallCoverage.toFixed(1)}% (required: ${this.options.minCoverage}%)\n` +
          `Uncovered methods (${report.uncoveredMethods.length}):\n${uncoveredList}`,
      );
    }
  }

  /**
   * Reset all coverage data
   */
  reset(): void {
    for (const interfaceCoverage of this.coverage.values()) {
      for (const methodCoverage of interfaceCoverage.values()) {
        methodCoverage.covered = false;
        methodCoverage.coveredAt = undefined;
        methodCoverage.testName = undefined;
        methodCoverage.callCount = 0;
      }
    }
    this.currentTest = null;
  }
}

// =============================================================================
// SINGLETON & FACTORY
// =============================================================================

let globalTracker: CoverageTracker | null = null;

/**
 * Get or create the global coverage tracker
 */
export function getCoverageTracker(
  options?: CoverageTrackerOptions,
): CoverageTracker {
  if (!globalTracker) {
    globalTracker = new CoverageTracker(options);
  }
  return globalTracker;
}

/**
 * Create a new coverage tracker
 */
export function createCoverageTracker(
  options?: CoverageTrackerOptions,
): CoverageTracker {
  return new CoverageTracker(options);
}

/**
 * Reset the global coverage tracker
 */
export function resetGlobalTracker(): void {
  globalTracker?.reset();
}

// =============================================================================
// DECORATOR HELPERS
// =============================================================================

/**
 * Create a proxy that automatically tracks coverage
 */
export function createCoverageProxy<T extends object>(
  target: T,
  interfaceName: string,
  tracker: CoverageTracker = getCoverageTracker(),
): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value = (obj as any)[prop];

      if (typeof value === 'function') {
        return function (...args: any[]) {
          tracker.mark(interfaceName, String(prop));
          return value.apply(obj, args);
        };
      }

      return value;
    },
  });
}

/**
 * Higher-order function to wrap a method with coverage tracking
 */
export function withCoverage<T extends (...args: any[]) => any>(
  fn: T,
  interfaceName: string,
  methodName: string,
  tracker: CoverageTracker = getCoverageTracker(),
): T {
  return ((...args: Parameters<T>) => {
    tracker.mark(interfaceName, methodName);
    return fn(...args);
  }) as T;
}
