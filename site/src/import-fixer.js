/**
 * Import Path Resolver
 * 
 * This is a utility module that helps standardize imports across the codebase,
 * particularly for files that have been migrated from client to site.
 */

// Define common path mappings that will be used in ESBuild aliases
export const PATH_ALIASES = {
  '@': './src',
  '@features': './src/features',
  '@contexts': './src/contexts',
  '@utils': './src/react-utils',
  '@services': './src/services',
  '@store': './src/store'
};

// Map of old paths to new paths for imports
export const IMPORT_PATH_MAP = {
  // Core app paths
  '../../config': '@/config',
  '../base-element/base-element.js': '@/base-element/base-element.js',
  '../router.js': '@/router.js',
  '../react-utils/react-to-html.js': '@utils/react-to-html.js',
  
  // Service paths
  '../../services/event-bus': '@services/event-bus',
  '../../services/api': '@services/api',
  
  // Store paths
  '../../store/store': '@store/store',
  '../../store/actions/notificationActions': '@store/actions/notificationActions',
  
  // Context paths
  '../../contexts/GroupContext': '@contexts/GroupContext',
  '../../contexts/SyncContext': '@contexts/SyncContext',
  '../contexts/GroupContext': '@contexts/GroupContext',
  '../contexts/SyncContext': '@contexts/SyncContext',
  
  // Feature paths
  '../data-sync/data-sync-service': '@features/data-sync/data-sync-service',
  '../wiki-integration/wiki-service': '@features/wiki-integration/wiki-service'
};

// Define path resolution functions
export function resolveSrcPath(path) {
  return path.startsWith('./') ? path : `./src/${path}`;
}

/**
 * Resolves an import path using the mapping above
 * @param {string} importPath - The original import path
 * @returns {string} - The resolved import path
 */
export function resolveImport(importPath) {
  // If there's a direct mapping, use it
  if (IMPORT_PATH_MAP[importPath]) {
    return IMPORT_PATH_MAP[importPath];
  }
  
  // Otherwise try to intelligently resolve it
  if (importPath.startsWith('../')) {
    // Attempting to go up one directory
    const pathParts = importPath.split('/');
    const featureName = pathParts[1];
    const fileName = pathParts[2];
    
    if (featureName && fileName) {
      return `@features/${featureName}/${fileName}`;
    }
  } else if (importPath.startsWith('../../')) {
    // Attempting to go up two directories
    const pathParts = importPath.split('/');
    const dirName = pathParts[2];
    const subDir = pathParts[3];
    const fileName = pathParts[4];
    
    if (dirName === 'features' && subDir && fileName) {
      return `@features/${subDir}/${fileName}`;
    } else if (dirName && subDir && fileName) {
      return `@/${dirName}/${subDir}/${fileName}`;
    } else if (dirName && subDir) {
      return `@/${dirName}/${subDir}`;
    }
  }
  
  // If no resolution was possible, return the original
  return importPath;
}
