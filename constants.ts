import { gql } from 'graphql-request';

export const INACTIVE = 0;
export const ACTIVE = 1;
export const COMPLETE = 2;
export const PAID = 3;

// GraphQL Queries with variables
export const STAKED_EVENTS_QUERY = gql`
  query GetStakedEvents($operationId: Bytes) {
    stakeds(
      where: { operationId: $operationId }
      orderBy: time
      orderDirection: desc
    ) {
      id
      user
      amount
      operationId
      token
      time
      blockTimestamp
      transactionHash
    }
  }
`;

export const STAKED_EVENTS_BY_USER_QUERY = gql`
  query GetStakedEventsByUser($user: Bytes!) {
    stakeds(where: { user: $user }, orderBy: time, orderDirection: desc) {
      id
      user
      amount
      operationId
      token
      time
      blockTimestamp
      transactionHash
    }
  }
`;

export const OPERATION_CREATED_QUERY = gql`
  query GetOperations {
    operationCreateds(orderBy: blockTimestamp, orderDirection: desc) {
      id
      operationId
      name
      token
      blockTimestamp
      transactionHash
    }
  }
`;

export const OPERATION_CREATED_BY_TOKEN_QUERY = gql`
  query GetOperationsByToken($token: Bytes!) {
    operationCreateds(
      where: { token: $token }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      operationId
      name
      token
      blockTimestamp
      transactionHash
    }
  }
`;
