import { gql } from 'graphql-request';

export const INACTIVE = 0;
export const ACTIVE = 1;
export const COMPLETE = 2;
export const PAID = 3;

// GraphQL Queries with variables
// Updated for Ponder API: uses String! instead of Bytes, items wrapper, correct field names
export const STAKED_EVENTS_QUERY = gql`
  query GetStakedEvents($operationId: String!) {
    stakedEventss(
      where: { stakedOperationId: $operationId }
      limit: 100
      orderBy: "blockTimestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        user
        amount
        stakedOperationId
        token
        time
        blockTimestamp
        transactionHash
      }
    }
  }
`;

export const STAKED_EVENTS_BY_USER_QUERY = gql`
  query GetStakedEventsByUser($user: String!) {
    stakedEventss(
      where: { user: $user }
      limit: 100
      orderBy: "blockTimestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        user
        amount
        stakedOperationId
        token
        time
        blockTimestamp
        transactionHash
      }
    }
  }
`;

export const OPERATION_CREATED_QUERY = gql`
  query GetOperations($limit: Int = 100, $after: String) {
    operationCreatedEventss(
      limit: $limit
      after: $after
      orderBy: "blockTimestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        opCreatedOperationId
        name
        token
        blockTimestamp
        transactionHash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const OPERATION_CREATED_BY_TOKEN_QUERY = gql`
  query GetOperationsByToken($token: String!, $limit: Int = 100) {
    operationCreatedEventss(
      where: { token: $token }
      limit: $limit
      orderBy: "blockTimestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        opCreatedOperationId
        name
        token
        blockTimestamp
        transactionHash
      }
    }
  }
`;
