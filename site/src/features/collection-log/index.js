/**
 * Collection Log Feature
 * 
 * This module exports all components for the Collection Log feature
 */

import CollectionLogPanel from './CollectionLogPanel';
import * as collectionLogService from './collection-log-service';

export {
  CollectionLogPanel,
  collectionLogService
};

// Default export is the main component
export default CollectionLogPanel;
