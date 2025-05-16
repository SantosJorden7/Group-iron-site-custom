/**
 * Shared Calendar Feature
 * 
 * This module exports all components for the Shared Calendar feature
 */

import SharedCalendarPanel from './SharedCalendarPanel';
import * as sharedCalendarService from './shared-calendar-service';

export {
  SharedCalendarPanel,
  sharedCalendarService
};

// Default export is the main component
export default SharedCalendarPanel;
