import { request } from 'graphql-request';
export const graphqlRequest = async <T>(
  graphqlEndpoint: string,
  query: string,
  variables?: any,
): Promise<T> => {
  const apiKey = process.env.NEXT_PUBLIC_THEGRAPH_API_KEY;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };
  try {
    return await request<T>(graphqlEndpoint, query, variables, headers);
  } catch (e) {
    throw new Error('error when querying GraphQl');
  }
};
