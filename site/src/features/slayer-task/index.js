/**
 * Slayer Task Feature
 * 
 * This module exports all components for the Slayer Task feature
 */

import SlayerTask from './SlayerTask';
import SlayerTaskService from './slayer-task-service';
import slayerTaskData from './slayer-task-data';
import { useSlayerTask } from './use-slayer-task-hook';

export {
  SlayerTask,
  SlayerTaskService,
  slayerTaskData,
  useSlayerTask
};

// Default export is the main component
export default SlayerTask;
