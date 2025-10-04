import { request } from 'graphql-request';

export const graphqlRequest = async <T>(
  graphqlEndpoint: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const apiKey = process.env.NEXT_PUBLIC_THEGRAPH_API_KEY;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };
  try {
    console.log('GraphQL Request:', {
      endpoint: graphqlEndpoint,
      query: query.substring(0, 100) + '...', // Log first 100 chars of query
      variables,
      hasApiKey: !!apiKey,
    });

    const response = await request<T>(
      graphqlEndpoint,
      query,
      variables,
      headers,
    );

    console.log('GraphQL Response:', {
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : 'null/undefined',
      responseType: typeof response,
    });

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
};
