// Export all event handlers
// Ponder will automatically discover and register these

import './ausys';
import './aurum';
import './aurum-diamond';
import './aura-asset';
import './austake';
// CLOB handlers removed - all CLOB events now come from Diamond CLOBFacet
// See aurum-diamond.ts for Diamond:OrderPlacedWithTokens handler
// import './clob';
import './rwy-vault';

// Export for TypeScript module resolution
export {};
