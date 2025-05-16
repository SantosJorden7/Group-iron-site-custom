/**
 * Boss Strategy Service
 * 
 * Handles data retrieval and business logic for the Boss Strategy feature
 */
import { API_BASE_URL } from '../../config';

/**
 * Fetch the list of all bosses from the API
 * @returns {Promise<Array>} - List of bosses with their information
 */
export const getBossList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/boss-list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch boss list: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching boss list:', error);
    // Fallback to mock data in case of error
    return getMockBossList();
  }
};

/**
 * Get player stats for a specified member
 * @param {string} memberName - The name of the group member
 * @returns {Promise<Object>} - Player stats information
 */
export const getPlayerStats = async (memberName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/player-stats/${memberName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch player stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching stats for ${memberName}:`, error);
    // Fallback to mock data
    return getMockPlayerStats(memberName);
  }
};

/**
 * Get bank items for a specified member
 * @param {string} memberName - The name of the group member
 * @returns {Promise<Array>} - List of items in the player's bank
 */
export const getBankItems = async (memberName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/bank-items/${memberName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bank items: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching bank items for ${memberName}:`, error);
    // Fallback to mock data
    return getMockBankItems(memberName);
  }
};

/**
 * Get optimal gear setups for a boss based on player stats and available items
 * @param {string} bossName - The name of the boss
 * @param {Object} playerStats - Player's skill levels and equipment
 * @param {Array} bankItems - Items available in the player's bank
 * @returns {Promise<Object>} - Object containing optimal gear setups
 */
export const getOptimalGearSetups = async (bossName, playerStats, bankItems) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/gear-setups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bossName,
        playerStats,
        bankItems
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch gear setups: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching gear setups for ${bossName}:`, error);
    // Fallback to mock data
    return getMockGearSetups(bossName, playerStats);
  }
};

/**
 * Get slayer task recommendations for bosses based on player slayer tasks
 * @param {Array<string>} memberNames - List of group member names
 * @returns {Promise<Array>} - List of recommendations for each member
 */
export const getSlayerTaskRecommendations = async (memberNames) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/slayer-boss-recommendations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memberNames })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch slayer recommendations: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching slayer recommendations:', error);
    // Fallback to mock data
    return getMockSlayerRecommendations(memberNames);
  }
};

/**
 * Save a gear setup for future use
 * @param {string} memberName - The name of the group member
 * @param {string} bossName - The name of the boss
 * @param {Object} setupData - The gear setup data to save
 * @returns {Promise<Object>} - The saved setup with ID
 */
export const saveGearSetup = async (memberName, bossName, setupData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/gear-setups/${memberName}/${bossName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(setupData)
    });

    if (!response.ok) {
      throw new Error(`Failed to save gear setup: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving gear setup:', error);
    throw error;
  }
};

// Mock data functions for fallback purposes

/**
 * Get mock boss list
 * @returns {Array} - Mock list of bosses
 */
const getMockBossList = () => {
  return [
    { id: 1, name: 'Zulrah', isSlayerMonster: false, combatLevel: 725, recommendedCombatLevel: 90 },
    { id: 2, name: 'Vorkath', isSlayerMonster: false, combatLevel: 732, recommendedCombatLevel: 100 },
    { id: 3, name: 'Kraken', isSlayerMonster: true, combatLevel: 291, recommendedCombatLevel: 85 },
    { id: 4, name: 'Abyssal Sire', isSlayerMonster: true, combatLevel: 350, recommendedCombatLevel: 85 },
    { id: 5, name: 'Cerberus', isSlayerMonster: true, combatLevel: 318, recommendedCombatLevel: 90 },
    { id: 6, name: 'General Graardor', isSlayerMonster: false, combatLevel: 624, recommendedCombatLevel: 80 },
    { id: 7, name: 'Kree\'arra', isSlayerMonster: false, combatLevel: 580, recommendedCombatLevel: 90 },
    { id: 8, name: 'Commander Zilyana', isSlayerMonster: false, combatLevel: 596, recommendedCombatLevel: 85 },
    { id: 9, name: 'K\'ril Tsutsaroth', isSlayerMonster: false, combatLevel: 650, recommendedCombatLevel: 85 },
    { id: 10, name: 'King Black Dragon', isSlayerMonster: false, combatLevel: 276, recommendedCombatLevel: 70 }
  ];
};

/**
 * Get mock player stats for testing
 * @param {string} memberName - The name of the group member
 * @returns {Object} - Mock player stats
 */
const getMockPlayerStats = (memberName) => {
  return {
    attack: 80,
    strength: 85,
    defence: 75,
    ranged: 90,
    magic: 88,
    hitpoints: 85,
    prayer: 70,
    slayer: 78,
    combatLevel: 105,
    username: memberName
  };
};

/**
 * Get mock bank items for testing
 * @param {string} memberName - The name of the group member
 * @returns {Array} - Mock bank items
 */
const getMockBankItems = (memberName) => {
  return [
    { id: 11802, name: 'Armadyl godsword', quantity: 1 },
    { id: 11834, name: 'Bandos chestplate', quantity: 1 },
    { id: 11836, name: 'Bandos tassets', quantity: 1 },
    { id: 4151, name: 'Abyssal whip', quantity: 1 },
    { id: 11283, name: 'Dragonfire shield', quantity: 1 },
    { id: 11785, name: 'Armadyl chestplate', quantity: 1 },
    { id: 11787, name: 'Armadyl chainskirt', quantity: 1 },
    { id: 11826, name: 'Armadyl helmet', quantity: 1 },
    { id: 21012, name: 'Dragon hunter crossbow', quantity: 1 },
    { id: 12924, name: 'Toxic blowpipe', quantity: 1 },
    { id: 12002, name: 'Occult necklace', quantity: 1 },
    { id: 12006, name: 'Abyssal tentacle', quantity: 1 },
    { id: 11791, name: 'Staff of the dead', quantity: 1 },
    { id: 11770, name: 'Seers ring (i)', quantity: 1 },
    { id: 11771, name: 'Archers ring (i)', quantity: 1 }
  ];
};

/**
 * Get mock gear setups for testing
 * @param {string} bossName - The name of the boss
 * @param {Object} playerStats - Player's stats
 * @returns {Object} - Mock gear setups
 */
const getMockGearSetups = (bossName, playerStats) => {
  const setups = {
    'Melee': {
      name: 'Melee',
      dps: 12.5,
      accuracy: 85.2,
      maxHit: 45,
      effectiveness: 92
    },
    'Ranged': {
      name: 'Ranged',
      dps: 10.8,
      accuracy: 78.5,
      maxHit: 41,
      effectiveness: 85
    },
    'Magic': {
      name: 'Magic',
      dps: 11.2,
      accuracy: 90.1,
      maxHit: 38,
      effectiveness: 88
    }
  };

  // Adjust for boss type
  if (bossName === 'Zulrah' || bossName === 'Kraken') {
    setups.Magic.effectiveness = 95;
    setups.Magic.dps = 14.5;
  } else if (bossName === 'Vorkath') {
    setups.Ranged.effectiveness = 98;
    setups.Ranged.dps = 15.2;
  } else if (bossName === 'General Graardor' || bossName === 'Cerberus') {
    setups.Melee.effectiveness = 97;
    setups.Melee.dps = 16.1;
  }

  return setups;
};

/**
 * Get mock boss wiki info for testing
 * @param {string} bossName - The name of the boss
 * @returns {Object} - Mock wiki information
 */
const getMockBossWikiInfo = (bossName) => {
  const bossInfo = {
    'Zulrah': {
      combatLevel: 725,
      hitpoints: 500,
      weakness: 'Ranged (Teal phase), Magic (Crimson phase)',
      attackStyles: ['Magic', 'Ranged', 'Melee'],
      mechanics: '<p>Zulrah is a complex boss with multiple phases. During the fight, Zulrah will periodically submerge into the swamp and resurface in one of four possible positions, changing its color and attack style.</p><ul><li><strong>Green form:</strong> Uses ranged attacks</li><li><strong>Blue form:</strong> Uses magic attacks</li><li><strong>Red form:</strong> Uses melee attacks</li><li><strong>Jad phase:</strong> Alternates between magic and ranged attacks</li></ul>'
    },
    'Vorkath': {
      combatLevel: 732,
      hitpoints: 750,
      weakness: 'Stab, Ranged with Dragon Hunter Crossbow',
      attackStyles: ['Magic', 'Ranged', 'Dragonfire'],
      mechanics: '<p>Vorkath uses a variety of attacks including:</p><ul><li><strong>Dragonfire:</strong> Can be blocked with an anti-dragon shield or dragonfire shield</li><li><strong>Acid phase:</strong> Covers the area in acid pools you must avoid</li><li><strong>Zombie spawn:</strong> Summons a zombie that must be killed quickly</li><li><strong>Rapid fireball attack:</strong> Fires multiple fireballs in quick succession</li></ul>'
    },
    'Kraken': {
      combatLevel: 291,
      hitpoints: 255,
      weakness: 'Magic',
      attackStyles: ['Magic'],
      mechanics: '<p>The Kraken is a relatively simple boss, primarily using magic attacks. It will remain in a whirlpool state until all four tentacles are attacked.</p>'
    }
  };

  // Return specific boss info or a generic fallback
  return bossInfo[bossName] || {
    combatLevel: 300,
    hitpoints: 300,
    weakness: 'Unknown',
    attackStyles: ['Unknown'],
    mechanics: '<p>No detailed mechanics information available for this boss.</p>'
  };
};

/**
 * Get mock slayer recommendations for testing
 * @param {Array<string>} memberNames - List of group member names
 * @returns {Array} - Mock slayer recommendations
 */
const getMockSlayerRecommendations = (memberNames) => {
  return memberNames.map(name => {
    const randomTask = Math.random() > 0.3;
    return {
      memberName: name,
      currentTask: randomTask ? {
        monster_name: ['Abyssal demons', 'Greater demons', 'Hellhounds', 'Black dragons', 'Kalphites'][Math.floor(Math.random() * 5)],
        quantity: Math.floor(Math.random() * 150) + 50,
        is_boss_task: Math.random() > 0.7
      } : null,
      bossRecommendations: randomTask ? [
        {
          name: ['Abyssal Sire', 'K\'ril Tsutsaroth', 'Cerberus', 'King Black Dragon', 'Kalphite Queen'][Math.floor(Math.random() * 5)],
          estimatedDps: Math.random() * 10 + 5
        },
        {
          name: ['Zulrah', 'Vorkath', 'Kraken', 'General Graardor'][Math.floor(Math.random() * 4)],
          estimatedDps: Math.random() * 10 + 5
        }
      ] : []
    };
  });
};
