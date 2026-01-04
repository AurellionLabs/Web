/**
 * Coverage Validator - Validates and reports interface coverage
 *
 * Provides validation utilities and beautiful console reporting
 * for interface coverage in E2E tests.
 */

import {
  CoverageTracker,
  CoverageReport,
  InterfaceCoverage,
  getCoverageTracker,
} from './coverage-tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  passed: boolean;
  report: CoverageReport;
  errors: string[];
  warnings: string[];
}

export interface ValidatorOptions {
  /** Minimum coverage percentage required */
  minCoverage?: number;
  /** Require 100% coverage */
  requireFullCoverage?: boolean;
  /** Print report to console */
  printReport?: boolean;
  /** Throw error on failure */
  throwOnFailure?: boolean;
  /** Interfaces that are allowed to have partial coverage */
  partialCoverageAllowed?: string[];
}

// =============================================================================
// ANSI COLOR CODES
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// =============================================================================
// COVERAGE VALIDATOR CLASS
// =============================================================================

export class CoverageValidator {
  private tracker: CoverageTracker;
  private options: Required<ValidatorOptions>;

  constructor(tracker?: CoverageTracker, options: ValidatorOptions = {}) {
    this.tracker = tracker ?? getCoverageTracker();
    this.options = {
      minCoverage: options.minCoverage ?? 100,
      requireFullCoverage: options.requireFullCoverage ?? true,
      printReport: options.printReport ?? true,
      throwOnFailure: options.throwOnFailure ?? true,
      partialCoverageAllowed: options.partialCoverageAllowed ?? [],
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Validate coverage and optionally throw on failure
   */
  validate(): ValidationResult {
    const report = this.tracker.generateReport();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check overall coverage
    if (report.overallCoverage < this.options.minCoverage) {
      errors.push(
        `Overall coverage ${report.overallCoverage.toFixed(1)}% is below minimum ${this.options.minCoverage}%`,
      );
    }

    // Check for uncovered methods
    if (this.options.requireFullCoverage) {
      for (const method of report.uncoveredMethods) {
        const isAllowed = this.options.partialCoverageAllowed.includes(
          method.interfaceName,
        );
        if (isAllowed) {
          warnings.push(
            `${method.interfaceName}.${method.methodName} is not covered (allowed)`,
          );
        } else {
          errors.push(
            `${method.interfaceName}.${method.methodName} is not covered`,
          );
        }
      }
    }

    // Check individual interface coverage
    for (const iface of report.interfaces) {
      if (
        iface.coveragePercentage < 100 &&
        !this.options.partialCoverageAllowed.includes(iface.interfaceName)
      ) {
        if (iface.coveragePercentage < 50) {
          errors.push(
            `${iface.interfaceName} has critically low coverage: ${iface.coveragePercentage.toFixed(1)}%`,
          );
        } else if (iface.coveragePercentage < this.options.minCoverage) {
          warnings.push(
            `${iface.interfaceName} coverage: ${iface.coveragePercentage.toFixed(1)}%`,
          );
        }
      }
    }

    const passed = errors.length === 0;

    const result: ValidationResult = {
      passed,
      report,
      errors,
      warnings,
    };

    if (this.options.printReport) {
      this.printReport(result);
    }

    if (!passed && this.options.throwOnFailure) {
      throw new Error(
        `Interface coverage validation failed:\n${errors.join('\n')}`,
      );
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /**
   * Print a beautiful coverage report to the console
   */
  printReport(result: ValidationResult): void {
    const { report } = result;

    console.log('\n');
    this.printHeader(result.passed);
    this.printSummary(report);
    this.printInterfaceTable(report.interfaces);

    if (report.uncoveredMethods.length > 0) {
      this.printUncoveredMethods(report);
    }

    if (result.warnings.length > 0) {
      this.printWarnings(result.warnings);
    }

    if (result.errors.length > 0) {
      this.printErrors(result.errors);
    }

    this.printFooter(result.passed, report);
  }

  private printHeader(passed: boolean): void {
    const status = passed
      ? `${colors.bgGreen}${colors.white} PASS ${colors.reset}`
      : `${colors.bgRed}${colors.white} FAIL ${colors.reset}`;

    console.log('┌' + '─'.repeat(70) + '┐');
    console.log(
      '│' +
        ' '.repeat(20) +
        `${status} Interface Coverage Report` +
        ' '.repeat(12) +
        '│',
    );
    console.log('└' + '─'.repeat(70) + '┘');
  }

  private printSummary(report: CoverageReport): void {
    const coverageColor = this.getCoverageColor(report.overallCoverage);

    console.log('\n📊 Summary');
    console.log('─'.repeat(40));
    console.log(`   Interfaces:    ${report.totalInterfaces}`);
    console.log(`   Total Methods: ${report.totalMethods}`);
    console.log(`   Covered:       ${report.coveredMethods}`);
    console.log(
      `   Coverage:      ${coverageColor}${report.overallCoverage.toFixed(1)}%${colors.reset}`,
    );
  }

  private printInterfaceTable(interfaces: InterfaceCoverage[]): void {
    console.log('\n📋 Interface Coverage');
    console.log(
      '┌' + '─'.repeat(25) + '┬' + '─'.repeat(10) + '┬' + '─'.repeat(30) + '┐',
    );
    console.log(
      '│ ' +
        'Interface'.padEnd(23) +
        ' │ ' +
        'Coverage'.padEnd(8) +
        ' │ ' +
        'Missing Methods'.padEnd(28) +
        ' │',
    );
    console.log(
      '├' + '─'.repeat(25) + '┼' + '─'.repeat(10) + '┼' + '─'.repeat(30) + '┤',
    );

    // Sort by coverage (lowest first)
    const sorted = [...interfaces].sort(
      (a, b) => a.coveragePercentage - b.coveragePercentage,
    );

    for (const iface of sorted) {
      const coverageStr = `${iface.coveragePercentage.toFixed(0)}%`;
      const coverageColor = this.getCoverageColor(iface.coveragePercentage);

      const uncovered = iface.methods
        .filter((m) => !m.covered)
        .map((m) => m.methodName);
      const missingStr =
        uncovered.length === 0
          ? `${colors.green}✓${colors.reset}`
          : uncovered.slice(0, 2).join(', ') +
            (uncovered.length > 2 ? '...' : '');

      const icon = iface.category === 'repository' ? '📖' : '⚡';

      console.log(
        '│ ' +
          `${icon} ${iface.interfaceName}`.padEnd(23).slice(0, 23) +
          ' │ ' +
          `${coverageColor}${coverageStr.padEnd(8)}${colors.reset}` +
          ' │ ' +
          missingStr.padEnd(28).slice(0, 28) +
          ' │',
      );
    }

    console.log(
      '└' + '─'.repeat(25) + '┴' + '─'.repeat(10) + '┴' + '─'.repeat(30) + '┘',
    );
  }

  private printUncoveredMethods(report: CoverageReport): void {
    console.log(
      `\n${colors.yellow}⚠️  Uncovered Methods (${report.uncoveredMethods.length})${colors.reset}`,
    );
    console.log('─'.repeat(50));

    // Group by interface
    const grouped = new Map<string, string[]>();
    for (const method of report.uncoveredMethods) {
      const methods = grouped.get(method.interfaceName) ?? [];
      methods.push(method.methodName);
      grouped.set(method.interfaceName, methods);
    }

    for (const [interfaceName, methods] of grouped) {
      console.log(`\n   ${colors.cyan}${interfaceName}${colors.reset}`);
      for (const method of methods) {
        console.log(`      ${colors.dim}○${colors.reset} ${method}`);
      }
    }
  }

  private printWarnings(warnings: string[]): void {
    console.log(
      `\n${colors.yellow}⚠️  Warnings (${warnings.length})${colors.reset}`,
    );
    console.log('─'.repeat(50));
    for (const warning of warnings) {
      console.log(`   ${colors.yellow}!${colors.reset} ${warning}`);
    }
  }

  private printErrors(errors: string[]): void {
    console.log(`\n${colors.red}❌ Errors (${errors.length})${colors.reset}`);
    console.log('─'.repeat(50));
    for (const error of errors) {
      console.log(`   ${colors.red}✗${colors.reset} ${error}`);
    }
  }

  private printFooter(passed: boolean, report: CoverageReport): void {
    console.log('\n' + '═'.repeat(70));

    if (passed) {
      console.log(
        `${colors.green}✅ All interface methods are covered!${colors.reset}`,
      );
    } else {
      console.log(
        `${colors.red}❌ Coverage validation failed. ${report.uncoveredMethods.length} methods need tests.${colors.reset}`,
      );
    }

    console.log('═'.repeat(70) + '\n');
  }

  private getCoverageColor(percentage: number): string {
    if (percentage >= 100) return colors.green;
    if (percentage >= 80) return colors.yellow;
    if (percentage >= 50) return colors.magenta;
    return colors.red;
  }
}

// =============================================================================
// FACTORY & HELPERS
// =============================================================================

/**
 * Create a coverage validator
 */
export function createValidator(options?: ValidatorOptions): CoverageValidator {
  return new CoverageValidator(undefined, options);
}

/**
 * Validate coverage with the global tracker
 */
export function validateCoverage(options?: ValidatorOptions): ValidationResult {
  const validator = new CoverageValidator(undefined, options);
  return validator.validate();
}

/**
 * Assert full coverage (throws on failure)
 */
export function assertFullCoverage(): void {
  const validator = new CoverageValidator(undefined, {
    requireFullCoverage: true,
    throwOnFailure: true,
    printReport: true,
  });
  validator.validate();
}

/**
 * Print coverage report without validation
 */
export function printCoverageReport(): void {
  const tracker = getCoverageTracker();
  const report = tracker.generateReport();
  const validator = new CoverageValidator(tracker, {
    throwOnFailure: false,
    printReport: true,
  });
  validator.printReport({
    passed: report.passed,
    report,
    errors: [],
    warnings: [],
  });
}
