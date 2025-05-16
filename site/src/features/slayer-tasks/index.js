/**
 * Slayer Tasks Feature
 * 
 * This module exports all components for the Slayer Tasks feature
 */

import SlayerTaskPanel from './SlayerTaskPanel';
import * as slayerTaskService from './slayer-task-service';

export {
  SlayerTaskPanel,
  slayerTaskService
};

// Default export is the main component
export default SlayerTaskPanel;
