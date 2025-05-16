/**
 * Features Index
 * Centralizes imports of all feature components to ensure they're loaded correctly
 * Each feature follows the 3-source data integration model:
 * 1. RuneLite Plugin (group-ironmen-tracker)
 * 2. Wise Old Man API
 * 3. OSRS Wiki (via WikiService)
 */

// Import each feature module
import './activities';
import './boss-strategy';
import './group-challenges';
import './group-milestones';
import './shared-calendar';
import './slayer-tasks';
import './valuable-drops';
import './dps-calculator';
import './collection-log';

// Support services
import './data-sync/index.js';
import './wiki-integration/index.js';
import './custom-components/index.js';

// Export features for use in other parts of the application
export const featureModules = {
  activities: require('./activities'),
  bossStrategy: require('./boss-strategy'),
  groupChallenges: require('./group-challenges'),
  groupMilestones: require('./group-milestones'),
  sharedCalendar: require('./shared-calendar'),
  slayerTasks: require('./slayer-tasks'),
  valuableDrops: require('./valuable-drops'),
  dpsCalculator: require('./dps-calculator'),
  collectionLog: require('./collection-log')
};

console.log('All feature modules loaded');
