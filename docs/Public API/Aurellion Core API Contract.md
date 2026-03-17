---
tags: [reference, api, aurellion-core, integration, railway]
---

# Aurellion Core API Contract

[[🏠 Home]] > Public API > Aurellion Core API Contract

HTTP contract for the `aurellion-core` read API that exposes public order and node detail endpoints.

> **Production base URL:** `https://prod-aurellion-core.up.railway.app`
>
> **Source of truth:** `aurellion-core/src/public-api/` in the monorepo.

---

## Overview

The public API is a small Fastify service deployed separately from the frontend and indexer. It provides:

- health and readiness probes
- public order detail by `orderId`
- public node detail by `nodeId`

All order and node identifiers must be `bytes32` hex strings:

```text
^0x[a-fA-F0-9]{64}$
```

---

## Base URL

| Environment | URL                                          |
| ----------- | -------------------------------------------- |
| Production  | `https://prod-aurellion-core.up.railway.app` |

---

## Authentication

By default, the API is public.

If API key mode is enabled, clients must send:

```http
x-api-key: <key>
```

Auth mode is controlled by runtime environment variables:

```env
PUBLIC_API_AUTH_MODE=public
# or
PUBLIC_API_AUTH_MODE=api_key

PUBLIC_API_KEYS=key-1,key-2
# fallback supported:
API_KEYS=key-1,key-2
```

### Auth Error Contract

| Status | Code                     | Message                                              |
| ------ | ------------------------ | ---------------------------------------------------- |
| `401`  | `API_KEY_REQUIRED`       | `Missing API key`                                    |
| `403`  | `API_KEY_INVALID`        | `Invalid API key`                                    |
| `500`  | `API_AUTH_MISCONFIGURED` | `API key auth is enabled but no keys are configured` |

---

## Rate Limiting

Each endpoint is rate-limited per client IP.

| Property           | Value                               |
| ------------------ | ----------------------------------- |
| Default limit      | `60 requests / minute`              |
| Client ID priority | `x-forwarded-for`, then `x-real-ip` |
| Header variance    | `vary: x-api-key`                   |

Every response includes:

```http
x-rate-limit-limit: <number>
x-rate-limit-remaining: <number>
x-rate-limit-reset: <unix-seconds>
vary: x-api-key
```

Rate-limit errors:

| Status | Code           | Message             |
| ------ | -------------- | ------------------- |
| `429`  | `RATE_LIMITED` | `Too many requests` |

---

## Endpoints

### `GET /health`

Health probe for Railway and external uptime checks.

#### Response

```json
{
  "status": "ok"
}
```

### `GET /ready`

Readiness probe.

#### Response

```json
{
  "status": "ready"
}
```

### `GET /api/v1/orders/:orderId`

Fetches a public order view with expanded journey data.

#### Path Parameters

| Name      | Type     | Notes              |
| --------- | -------- | ------------------ |
| `orderId` | `string` | `bytes32` hex only |

#### Success Response

Cache policy:

```http
cache-control: public, max-age=10, s-maxage=10, stale-while-revalidate=30
```

Body:

```json
{
  "data": {
    "orderId": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "orderSource": "unified",
    "token": "0x1111111111111111111111111111111111111111",
    "tokenId": "123",
    "tokenQuantity": "5",
    "price": "1000",
    "txFee": "10",
    "buyer": "0x2222222222222222222222222222222222222222",
    "seller": "0x3333333333333333333333333333333333333333",
    "status": "created",
    "contractualAgreement": "",
    "isP2P": false,
    "createdAt": 1234567890,
    "journeyIds": [
      "0x4444444444444444444444444444444444444444444444444444444444444444"
    ],
    "nodes": [
      "0x5555555555555555555555555555555555555555555555555555555555555555"
    ],
    "journeys": [
      {
        "journeyId": "0x4444444444444444444444444444444444444444444444444444444444444444",
        "status": "pending",
        "sender": "0x6666666666666666666666666666666666666666",
        "receiver": "0x7777777777777777777777777777777777777777",
        "driver": "0x8888888888888888888888888888888888888888",
        "journeyStart": "0",
        "journeyEnd": "0",
        "bounty": "10",
        "eta": "20",
        "parcelData": {
          "startLocation": { "lat": "0", "lng": "0" },
          "endLocation": { "lat": "1", "lng": "1" },
          "startName": "A",
          "endName": "B"
        }
      }
    ]
  }
}
```

#### Error Responses

| Status | Code                 | Message                                |
| ------ | -------------------- | -------------------------------------- |
| `400`  | `INVALID_ORDER_ID`   | `orderId must be a bytes32 hex string` |
| `404`  | `ORDER_NOT_FOUND`    | `Order not found`                      |
| `500`  | `ORDER_FETCH_FAILED` | `Failed to fetch order`                |

### `GET /api/v1/nodes/:nodeId`

Fetches a public node view including sellable and custody balances.

#### Path Parameters

| Name     | Type     | Notes              |
| -------- | -------- | ------------------ |
| `nodeId` | `string` | `bytes32` hex only |

#### Success Response

Cache policy:

```http
cache-control: public, max-age=15, s-maxage=15, stale-while-revalidate=60
```

Body:

```json
{
  "data": {
    "nodeId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "owner": "0x1111111111111111111111111111111111111111",
    "status": "Active",
    "validNode": true,
    "location": {
      "addressName": "Warehouse A",
      "lat": "12.34",
      "lng": "56.78"
    },
    "assets": [
      {
        "token": "0x2222222222222222222222222222222222222222",
        "tokenId": "12",
        "price": "1000",
        "capacity": "10",
        "sellableQuantity": "7",
        "custodyQuantity": "9"
      }
    ]
  }
}
```

#### Error Responses

| Status | Code                | Message                               |
| ------ | ------------------- | ------------------------------------- |
| `400`  | `INVALID_NODE_ID`   | `nodeId must be a bytes32 hex string` |
| `404`  | `NODE_NOT_FOUND`    | `Node not found`                      |
| `500`  | `NODE_FETCH_FAILED` | `Failed to fetch node`                |

---

## Shared Response Shapes

### Success Envelope

```json
{
  "data": {}
}
```

### Error Envelope

```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Schemas

### `PublicOrderDto`

| Field                  | Type                 | Notes                           |
| ---------------------- | -------------------- | ------------------------------- |
| `orderId`              | `string`             | bytes32 hex                     |
| `orderSource`          | `'p2p' \| 'unified'` | order origin                    |
| `token`                | `string`             | token address                   |
| `tokenId`              | `string`             | token ID                        |
| `tokenQuantity`        | `string`             | quantity as string              |
| `price`                | `string`             | quoted price                    |
| `txFee`                | `string`             | fee amount                      |
| `buyer`                | `string`             | address                         |
| `seller`               | `string`             | address                         |
| `status`               | `string`             | current order status            |
| `contractualAgreement` | `string`             | legal or commercial reference   |
| `isP2P`                | `boolean`            | `true` for P2P orders           |
| `createdAt`            | `number?`            | optional timestamp              |
| `journeyIds`           | `string[]`           | journey IDs                     |
| `nodes`                | `string[]`           | node IDs                        |
| `locationData`         | `object?`            | optional delivery location info |
| `journeys`             | `PublicJourneyDto[]` | expanded journeys               |

### `PublicJourneyDto`

| Field          | Type     |
| -------------- | -------- |
| `journeyId`    | `string` |
| `status`       | `string` |
| `sender`       | `string` |
| `receiver`     | `string` |
| `driver`       | `string` |
| `journeyStart` | `string` |
| `journeyEnd`   | `string` |
| `bounty`       | `string` |
| `eta`          | `string` |
| `parcelData`   | `object` |

### `PublicNodeDto`

| Field       | Type                     | Notes                      |
| ----------- | ------------------------ | -------------------------- |
| `nodeId`    | `string`                 | bytes32 hex                |
| `owner`     | `string`                 | address                    |
| `status`    | `'Active' \| 'Inactive'` | node state                 |
| `validNode` | `boolean`                | validation flag            |
| `location`  | `object`                 | displayable location       |
| `assets`    | `PublicNodeAssetDto[]`   | token balances and pricing |

### `PublicNodeAssetDto`

| Field              | Type     |
| ------------------ | -------- |
| `token`            | `string` |
| `tokenId`          | `string` |
| `price`            | `string` |
| `capacity`         | `string` |
| `sellableQuantity` | `string` |
| `custodyQuantity`  | `string` |

---

## Example Requests

```bash
curl https://prod-aurellion-core.up.railway.app/health
```

```bash
curl https://prod-aurellion-core.up.railway.app/api/v1/orders/<orderId>
```

```bash
curl https://prod-aurellion-core.up.railway.app/api/v1/nodes/<nodeId>
```

```bash
curl \
  -H 'x-api-key: <key>' \
  https://prod-aurellion-core.up.railway.app/api/v1/orders/<orderId>
```

---

## Operational Notes

- The service binds to `PORT` automatically in Railway.
- `x-forwarded-for` is used for rate limiting when present.
- The API is read-only and intended for public integration and discovery use cases.
