/**
 * Application Configuration
 * 
 * This file contains all the configuration settings for the application,
 * including API endpoints, feature flags, and other environment-specific settings.
 */

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ACTIVITIES: true,
  ENABLE_SLAYER_TASKS: true,
  ENABLE_VALUABLE_DROPS: true,
  ENABLE_GROUP_CHALLENGES: true,
  ENABLE_GROUP_MILESTONES: true,
  ENABLE_BOSS_STRATEGIES: true,
  ENABLE_DPS_CALCULATOR: true,
  ENABLE_SHARED_CALENDAR: true,
};

// Default Pagination Settings
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZES: [10, 25, 50, 100],
};

// Date/Time Formatting
export const DATE_FORMATS = {
  DATE: 'MMM d, yyyy',
  TIME: 'h:mm a',
  DATETIME: 'MMM d, yyyy h:mm a',
  ISO: 'yyyy-MM-dd',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  LAST_VISITED_GROUP: 'last_visited_group',
};

// Default Settings
export const DEFAULTS = {
  THEME: 'light',
  TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,
  CURRENCY: 'gp',
};

// Export all configurations as a single object for easy importing
export default {
  API_BASE_URL,
  FEATURE_FLAGS,
  PAGINATION,
  DATE_FORMATS,
  STORAGE_KEYS,
  DEFAULTS,
};
