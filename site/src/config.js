/**
 * Global Configuration Settings
 * 
 * This file contains global configuration settings used throughout the application
 */

// API base URL - defaults to local development, but can be overridden at runtime
export const API_BASE_URL = process.env.API_URL || 'http://localhost:8080/api';

// Feature flags to enable/disable certain features
export const FEATURES = {
  WIKI_INTEGRATION: true,
  DATA_SYNC: true,
  DPS_CALCULATOR: true,
  GROUP_CHALLENGES: true,
  GROUP_MILESTONES: true,
  VALUABLE_DROPS: true,
  SLAYER_TASKS: true,
  ACTIVITIES: true,
  BOSS_STRATEGY: true,
  SHARED_CALENDAR: true,
  COLLECTION_LOG: true,
};

// Default settings
export const DEFAULT_SETTINGS = {
  refreshInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
  valuableDropThreshold: 50000, // GP value for an item to be considered valuable
  maxActivityHistory: 100, // Maximum number of activities to store
};

// API endpoints
export const ENDPOINTS = {
  // Group endpoints
  GROUP: '/group',
  GROUP_CREATE: '/group/create',
  GROUP_JOIN: '/group/join',
  GROUP_LEAVE: '/group/leave',
  GROUP_SETTINGS: '/group/settings',
  
  // Player endpoints
  PLAYER: '/player',
  PLAYER_DATA: '/player/data',
  PLAYER_INVENTORY: '/player/inventory',
  PLAYER_SKILLS: '/player/skills',
  PLAYER_QUESTS: '/player/quests',
  PLAYER_EQUIPMENT: '/player/equipment',
  
  // Feature endpoints
  VALUABLE_DROPS: '/valuable-drops',
  SLAYER_TASKS: '/slayer-tasks',
  ACTIVITIES: '/activities',
  BOSS_STRATEGY: '/boss-strategy',
  GROUP_CHALLENGES: '/group-challenges',
  GROUP_MILESTONES: '/group-milestones',
  SHARED_CALENDAR: '/shared-calendar',
  COLLECTION_LOG: '/collection-log',
};

// Health check endpoint paths
export const HEALTH_CHECK_PATHS = [
  '/valuable-drops',
  '/slayer-tasks',
  '/activities', 
  '/boss-strategy',
  '/group-challenges',
  '/group-milestones',
  '/shared-calendar',
  '/collection-log',
  '/dps-calculator',
  '/wiki-integration',
  '/data-sync'
];
