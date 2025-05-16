/**
 * Activities Feature
 * 
 * This module exports all components for the Activities feature
 */

import ActivitiesPanel from './ActivitiesPanel';
import * as activitiesService from './activities-service';

export {
  ActivitiesPanel,
  activitiesService
};

// Default export is the main component
export default ActivitiesPanel;
