import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let userConfig = undefined;
try {
  userConfig = await import('./v0-user-next.config');
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // These parallel build features are currently causing incomplete route
    // manifests during production builds in this app.
    webpackBuildWorker: false,
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
  },
  webpack: (config, { isServer, webpack }) => {
    // Force-inline NEXT_PUBLIC_* vars so they work even with webpackBuildWorker
    // (the worker thread doesn't always inherit process.env correctly)
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_E2E_TEST_MODE': JSON.stringify(
          process.env.NEXT_PUBLIC_E2E_TEST_MODE ?? 'false',
        ),
        'process.env.NEXT_PUBLIC_RPC_URL_84532': JSON.stringify(
          process.env.NEXT_PUBLIC_RPC_URL_84532 ?? '',
        ),
        'process.env.NEXT_PUBLIC_RPC_URL_42161': JSON.stringify(
          process.env.NEXT_PUBLIC_RPC_URL_42161 ?? '',
        ),
        'process.env.NEXT_PUBLIC_RPC_URL_8453': JSON.stringify(
          process.env.NEXT_PUBLIC_RPC_URL_8453 ?? '',
        ),
      }),
    );
    // Add a rule to handle typechain-types
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/typechain-types': resolve(__dirname, './typechain-types'),
    };
    // Use no-op cache stub for client builds (ioredis uses Node.js 'net' which isn't in browser)
    if (!isServer) {
      const cacheStub = resolve(__dirname, 'infrastructure/cache/client-stub.ts');
      config.resolve.alias['@/infrastructure/cache'] = cacheStub;
      config.resolve.alias['@/infrastructure/cache/index'] = cacheStub;
      // Replace redis-cache module so ioredis is never loaded in client bundle
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /infrastructure[\\/]cache[\\/]redis-cache\.ts$/,
          cacheStub,
        ),
      );
    }
    return config;
  },
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return;
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

export default nextConfig;
