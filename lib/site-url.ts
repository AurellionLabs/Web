const DEFAULT_SITE_URL = 'https://aurellionlabs.com';

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return DEFAULT_SITE_URL;
  }

  const withProtocol = trimmedUrl.startsWith('http')
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return withProtocol.endsWith('/')
    ? withProtocol.slice(0, -1)
    : withProtocol;
}

export function getSiteUrl() {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      DEFAULT_SITE_URL,
  );
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}
