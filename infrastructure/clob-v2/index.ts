/**
 * @module infrastructure/clob-v2
 * @description CLOB V2 Infrastructure Module
 *
 * Unified exports for CLOB V2 repository and service.
 * Provides a clean interface between frontend and backend.
 */

// Repository (read operations)
export {
  clobV2Repository,
  CLOBV2Repository,
} from '../repositories/clob-v2-repository';

// Service (write operations)
export { clobV2Service, CLOBV2Service } from '../services/clob-v2-service';

// Re-export domain types for convenience
export * from '@/domain/clob/clob';
