#!/usr/bin/env -S tsx

import {
  UsageError,
  formatUsage,
  parseArgs,
  runCommand,
} from '../src/testing/public-api-smoke.js';

async function main(): Promise<number> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await runCommand(args);

    if (args.json) {
      console.log(JSON.stringify(result.summary, null, 2));
    }

    return result.exitCode;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      return 1;
    }

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    return 1;
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  });
