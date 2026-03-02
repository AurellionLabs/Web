import { request } from 'graphql-request';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function graphqlRequest<T = any>(
  graphqlEndpoint: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.NEXT_PUBLIC_THEGRAPH_API_KEY;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };
  try {
    const response = await request<T>(
      graphqlEndpoint,
      query,
      variables,
      headers,
    );

    return response;
  } catch (e) {
    console.error('GraphQL Request Error:', {
      endpoint: graphqlEndpoint,
      query: query.substring(0, 100) + '...',
      variables,
      error: e,
    });
    throw new Error('error when querying GraphQl', { cause: e as Error });
  }
}
