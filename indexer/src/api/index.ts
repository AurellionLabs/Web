/**
 * Ponder API Endpoints
 *
 * This file defines the API endpoints for the Ponder indexer.
 * Required in Ponder 0.9+ - GraphQL is no longer served by default.
 *
 * @see https://ponder.sh/docs/query/api-endpoints
 */

import { db } from 'ponder:api';
import schema from 'ponder:schema';
import { Hono } from 'hono';
import { graphql } from 'ponder';

const app = new Hono();

// Serve GraphQL API at root and /graphql
app.use('/', graphql({ db, schema }));
app.use('/graphql', graphql({ db, schema }));

export default app;
