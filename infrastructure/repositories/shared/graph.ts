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
    console.log('graph variables', graphqlEndpoint, query, variables, headers);
    const response = await request<T>(
      graphqlEndpoint,
      query,
      variables,
      headers,
    );
    console.log('response for the Graph:', response);
    return response;
  } catch (e) {
    throw new Error('error when querying GraphQl', { cause: e as Error });
  }
};
