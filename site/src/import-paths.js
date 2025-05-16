/**
 * Path mapping utility for consistent imports across the application
 */

// Base paths to project directories
export const PATHS = {
  // Core paths
  BASE: '.',
  SRC: './src',
  
  // Feature paths
  FEATURES: './src/features',
  ACTIVITIES: './src/features/activities',
  BOSS_STRATEGY: './src/features/boss-strategy',
  COLLECTION_LOG: './src/features/collection-log',
  DATA_SYNC: './src/features/data-sync',
  DPS_CALCULATOR: './src/features/dps-calculator',
  GROUP_CHALLENGES: './src/features/group-challenges',
  GROUP_MILESTONES: './src/features/group-milestones',
  SHARED_CALENDAR: './src/features/shared-calendar',
  SLAYER_TASKS: './src/features/slayer-tasks',
  VALUABLE_DROPS: './src/features/valuable-drops',
  WIKI_INTEGRATION: './src/features/wiki-integration',
  
  // Core app paths
  CONTEXTS: './src/contexts',
  HOOKS: './src/hooks',
  SERVICES: './src/services',
  STORE: './src/store',
  UTILS: './src/react-utils',
  BASE_ELEMENT: './src/base-element',
  ROUTER: './src/router.js',
  CONFIG: './src/config.js'
};

/**
 * Get the correct relative import path from one file to another
 * @param {string} fromPath - Path of the file importing
 * @param {string} toPath - Path of the file being imported
 * @returns {string} Relative import path
 */
export function getRelativeImportPath(fromPath, toPath) {
  // Convert Windows-style paths to Unix-style for consistency
  fromPath = fromPath.replace(/\\/g, '/');
  toPath = toPath.replace(/\\/g, '/');
  
  // Split paths into components
  const fromParts = fromPath.split('/');
  const toParts = toPath.split('/');
  
  // Remove file name from source path
  fromParts.pop();
  
  // Find common prefix
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }
  
  // Build relative path
  const goUp = fromParts.length - i;
  const relativePath = 
    (goUp > 0 ? Array(goUp).fill('..').join('/') : '.') + 
    (toParts.slice(i).length > 0 ? '/' + toParts.slice(i).join('/') : '');
  
  return relativePath;
}

/**
 * Maps for common imports
 * These help standardize import paths across the application
 */
export const IMPORT_MAPS = {
  // Core app imports
  'router': './src/router.js',
  'config': './src/config.js', 
  'store': './src/store/store.js',
  'event-bus': './src/services/event-bus.js',
  'base-element': './src/base-element/base-element.js',
  'react-to-html': './src/react-utils/react-to-html.js',
  
  // Context imports
  'GroupContext': './src/contexts/GroupContext.js',
  'SyncContext': './src/contexts/SyncContext.js',
  'ReactProviders': './src/contexts/ReactProviders.js',
  
  // Service imports
  'data-sync-service': './src/features/data-sync/data-sync-service.js',
  'wiki-service': './src/features/wiki-integration/wiki-service.js',
  
  // Store imports
  'notificationActions': './src/store/actions/notificationActions.js',
  
  // Utility imports
  'merge-data': './src/react-utils/merge-data.js'
};
