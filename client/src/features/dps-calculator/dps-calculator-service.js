/**
 * DPS Calculator Service
 * Handles all DPS calculation logic and related API calls
 */
import { API_BASE_URL } from '../../config';
import wikiService from '../wiki-integration/wiki-service';

/**
 * Service class for calculating DPS and optimizing gear setups
 */
class DPSCalculatorService {
  constructor() {
    this.monsterCache = new Map();
    this.playerStatsCache = new Map();
    this.itemStatsCache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get list of available bosses/monsters for DPS calculations
   * @returns {Promise<Array>} Array of monsters with their details
   */
  async getMonsterList() {
    try {
      // Check cache first
      const cacheKey = 'monster_list';
      if (this.hasCachedData(cacheKey)) {
        return this.getCachedData(cacheKey);
      }

      const response = await fetch(`${API_BASE_URL}/custom/dps-calculator/monsters`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch monster list: ${response.status}`);
      }

      const data = await response.json();
      
      // Organize monsters by category
      const monstersByCategory = data.reduce((acc, monster) => {
        if (!acc[monster.category]) {
          acc[monster.category] = [];
        }
        acc[monster.category].push(monster);
        return acc;
      }, {});
      
      // Cache the result
      this.setCachedData(cacheKey, monstersByCategory);
      
      return monstersByCategory;
    } catch (error) {
      console.error('Error fetching monster list:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific monster
   * @param {string} monsterId - The ID or name of the monster
   * @returns {Promise<Object>} Detailed monster information
   */
  async getMonsterDetails(monsterId) {
    try {
      // Check cache first
      const cacheKey = `monster_${monsterId}`;
      if (this.hasCachedData(cacheKey)) {
        return this.getCachedData(cacheKey);
      }

      const response = await fetch(`${API_BASE_URL}/custom/dps-calculator/monsters/${monsterId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch monster details: ${response.status}`);
      }

      const monsterData = await response.json();
      
      // Enrich with wiki data if possible
      try {
        const wikiData = await wikiService.getNPCInfo(monsterData.name);
        if (wikiData) {
          monsterData.wikiInfo = {
            url: wikiData.url,
            examine: wikiData.examine,
            image: wikiData.image,
            weakness: wikiData.weakness
          };
        }
      } catch (wikiError) {
        console.warn(`Could not fetch wiki data for ${monsterData.name}:`, wikiError);
      }
      
      // Cache the result
      this.setCachedData(cacheKey, monsterData);
      
      return monsterData;
    } catch (error) {
      console.error(`Error fetching monster details for ${monsterId}:`, error);
      throw error;
    }
  }

  /**
   * Get player's combat stats
   * @param {string} playerName - The name of the player
   * @returns {Promise<Object>} Player's combat stats
   */
  async getPlayerStats(playerName) {
    try {
      // Check cache first
      const cacheKey = `player_stats_${playerName}`;
      if (this.hasCachedData(cacheKey)) {
        return this.getCachedData(cacheKey);
      }

      const response = await fetch(`${API_BASE_URL}/player/${playerName}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch player stats: ${response.status}`);
      }

      const statsData = await response.json();
      
      // Cache the result
      this.setCachedData(cacheKey, statsData);
      
      return statsData;
    } catch (error) {
      console.error(`Error fetching stats for ${playerName}:`, error);
      throw error;
    }
  }

  /**
   * Get player's available gear from bank
   * @param {string} playerName - The name of the player
   * @returns {Promise<Array>} Player's available gear items
   */
  async getPlayerGear(playerName) {
    try {
      // Check cache first
      const cacheKey = `player_gear_${playerName}`;
      if (this.hasCachedData(cacheKey)) {
        return this.getCachedData(cacheKey);
      }

      const response = await fetch(`${API_BASE_URL}/player/${playerName}/bank/gear`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch player gear: ${response.status}`);
      }

      const gearData = await response.json();
      
      // Filter for combat gear only
      const combatGear = gearData.items.filter(item => item.combat_stats);
      
      // Cache the result
      this.setCachedData(cacheKey, combatGear);
      
      return combatGear;
    } catch (error) {
      console.error(`Error fetching gear for ${playerName}:`, error);
      throw error;
    }
  }

  /**
   * Calculate DPS for a specific gear setup against a monster
   * @param {Object} playerStats - Player's combat stats
   * @param {Object} gearSetup - Gear setup with items in each slot
   * @param {Object} monster - Monster details
   * @param {Object} options - Additional calculation options
   * @returns {Object} DPS calculation results
   */
  calculateDPS(playerStats, gearSetup, monster, options = {}) {
    try {
      // Calculate base stats from player stats and gear bonuses
      const baseStats = this.calculateBaseStats(playerStats, gearSetup);
      
      // Calculate attack rolls
      const attackRolls = this.calculateAttackRolls(baseStats, monster, options);
      
      // Calculate max hits
      const maxHits = this.calculateMaxHits(baseStats, monster, options);
      
      // Calculate hit chances
      const hitChances = this.calculateHitChances(attackRolls, monster);
      
      // Calculate DPS for each combat style
      const dpsValues = this.calculateDPSValues(maxHits, hitChances, gearSetup, options);
      
      // Find the best combat style
      const bestStyle = this.findBestCombatStyle(dpsValues);
      
      return {
        baseStats,
        attackRolls,
        maxHits,
        hitChances,
        dpsValues,
        bestStyle,
        totalDPS: dpsValues[bestStyle] || 0
      };
    } catch (error) {
      console.error('Error calculating DPS:', error);
      throw error;
    }
  }

  /**
   * Find optimal gear setups for a player against a monster
   * @param {string} playerName - The name of the player
   * @param {string} monsterId - The ID or name of the monster
   * @param {Object} options - Additional calculation options
   * @returns {Promise<Array>} Sorted list of optimal gear setups
   */
  async findOptimalGearSetups(playerName, monsterId, options = {}) {
    try {
      // Get player stats
      const playerStats = await this.getPlayerStats(playerName);
      
      // Get player's available gear
      const availableGear = await this.getPlayerGear(playerName);
      
      // Get monster details
      const monster = await this.getMonsterDetails(monsterId);
      
      // Generate possible gear setups
      const possibleSetups = this.generateGearSetups(availableGear, monster);
      
      // Calculate DPS for each setup
      const setupsWithDPS = possibleSetups.map(setup => {
        const dpsResult = this.calculateDPS(playerStats, setup, monster, options);
        return {
          ...setup,
          dps: dpsResult.totalDPS,
          maxHit: dpsResult.maxHits[dpsResult.bestStyle] || 0,
          hitChance: dpsResult.hitChances[dpsResult.bestStyle] || 0,
          bestStyle: dpsResult.bestStyle,
          detailedResults: dpsResult
        };
      });
      
      // Sort by DPS (highest first)
      const sortedSetups = setupsWithDPS.sort((a, b) => b.dps - a.dps);
      
      // Return top setups
      return sortedSetups.slice(0, 5);
    } catch (error) {
      console.error('Error finding optimal gear setups:', error);
      throw error;
    }
  }

  /**
   * Compare DPS between two players against a monster
   * @param {string} player1Name - Name of the first player
   * @param {string} player2Name - Name of the second player
   * @param {string} monsterId - The ID or name of the monster
   * @param {Object} options - Additional comparison options
   * @returns {Promise<Object>} Comparison results
   */
  async compareDPS(player1Name, player2Name, monsterId, options = {}) {
    try {
      // Get optimal setups for player 1
      const player1Setups = await this.findOptimalGearSetups(player1Name, monsterId, options);
      
      // Get optimal setups for player 2
      const player2Setups = await this.findOptimalGearSetups(player2Name, monsterId, options);
      
      // Return comparison results
      return {
        player1: {
          name: player1Name,
          bestSetup: player1Setups[0] || null,
          allSetups: player1Setups
        },
        player2: {
          name: player2Name,
          bestSetup: player2Setups[0] || null,
          allSetups: player2Setups
        },
        dpsAdvantage: player1Setups[0] && player2Setups[0] 
          ? ((player1Setups[0].dps - player2Setups[0].dps) / player2Setups[0].dps * 100).toFixed(2) 
          : 0
      };
    } catch (error) {
      console.error('Error comparing DPS:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Calculate base stats from player stats and gear bonuses
   * @private
   * @param {Object} playerStats - Player's combat stats
   * @param {Object} gearSetup - Gear setup with items in each slot
   * @returns {Object} Calculated base stats
   */
  calculateBaseStats(playerStats, gearSetup) {
    // This would contain complex logic for calculating base stats
    // based on player levels and gear bonuses
    // For now, this is a simplified implementation
    
    const baseStats = {
      attack: playerStats.attack || 1,
      strength: playerStats.strength || 1,
      defence: playerStats.defence || 1,
      ranged: playerStats.ranged || 1,
      magic: playerStats.magic || 1,
      prayer: playerStats.prayer || 1,
      hitpoints: playerStats.hitpoints || 10,
      
      // Melee bonuses
      attackStab: 0,
      attackSlash: 0,
      attackCrush: 0,
      
      // Ranged bonuses
      attackRanged: 0,
      
      // Magic bonuses
      attackMagic: 0,
      
      // Defence bonuses
      defenceStab: 0,
      defenceSlash: 0,
      defenceCrush: 0,
      defenceRanged: 0,
      defenceMagic: 0,
      
      // Other bonuses
      strengthMelee: 0,
      strengthRanged: 0,
      strengthMagic: 0,
      prayerBonus: 0
    };
    
    // Add bonuses from each gear item
    Object.values(gearSetup.items || {}).forEach(item => {
      if (!item || !item.bonuses) return;
      
      // Add all bonuses
      Object.entries(item.bonuses).forEach(([stat, value]) => {
        if (baseStats.hasOwnProperty(stat)) {
          baseStats[stat] += value;
        }
      });
    });
    
    return baseStats;
  }

  /**
   * Calculate attack rolls for different combat styles
   * @private
   * @param {Object} baseStats - Player's base stats with gear
   * @param {Object} monster - Monster details
   * @param {Object} options - Additional calculation options
   * @returns {Object} Attack rolls for each combat style
   */
  calculateAttackRolls(baseStats, monster, options) {
    // Actual implementation would include complex formulas for OSRS attack rolls
    // This is a simplified placeholder
    
    const attackRolls = {
      melee: Math.floor(baseStats.attack * (1 + baseStats.attackSlash/64) * 1.4),
      ranged: Math.floor(baseStats.ranged * (1 + baseStats.attackRanged/64) * 1.5),
      magic: Math.floor(baseStats.magic * (1 + baseStats.attackMagic/64) * 1.35)
    };
    
    // Apply bonuses from options (prayers, potions, etc.)
    if (options.prayerBoosts) {
      if (options.prayerBoosts.melee) attackRolls.melee *= 1.15;
      if (options.prayerBoosts.ranged) attackRolls.ranged *= 1.15;
      if (options.prayerBoosts.magic) attackRolls.magic *= 1.15;
    }
    
    return attackRolls;
  }

  /**
   * Calculate max hits for different combat styles
   * @private
   * @param {Object} baseStats - Player's base stats with gear
   * @param {Object} monster - Monster details
   * @param {Object} options - Additional calculation options
   * @returns {Object} Max hits for each combat style
   */
  calculateMaxHits(baseStats, monster, options) {
    // Actual implementation would include complex formulas for OSRS max hit calculations
    // This is a simplified placeholder
    
    const maxHits = {
      melee: Math.floor(0.5 + baseStats.strength * (1 + baseStats.strengthMelee/64) / 10),
      ranged: Math.floor(0.5 + baseStats.ranged * (1 + baseStats.strengthRanged/64) / 10),
      magic: Math.floor(0.5 + baseStats.magic * (1 + baseStats.strengthMagic/64) / 10)
    };
    
    // Apply bonuses from options (prayers, potions, etc.)
    if (options.prayerBoosts) {
      if (options.prayerBoosts.melee) maxHits.melee *= 1.15;
      if (options.prayerBoosts.ranged) maxHits.ranged *= 1.15;
      if (options.prayerBoosts.magic) maxHits.magic *= 1.15;
    }
    
    return maxHits;
  }

  /**
   * Calculate hit chances for different combat styles
   * @private
   * @param {Object} attackRolls - Player's attack rolls
   * @param {Object} monster - Monster details
   * @returns {Object} Hit chances for each combat style
   */
  calculateHitChances(attackRolls, monster) {
    // Actual implementation would use OSRS hit chance formulas
    // This is a simplified placeholder
    
    const defenceLevel = monster.defenceLevel || 1;
    const defenceRolls = {
      melee: defenceLevel * (1 + (monster.defenceStab || 0)/64),
      ranged: defenceLevel * (1 + (monster.defenceRanged || 0)/64),
      magic: defenceLevel * (1 + (monster.defenceMagic || 0)/64)
    };
    
    const hitChances = {
      melee: Math.min(1, attackRolls.melee / (2 * defenceRolls.melee)),
      ranged: Math.min(1, attackRolls.ranged / (2 * defenceRolls.ranged)),
      magic: Math.min(1, attackRolls.magic / (2 * defenceRolls.magic))
    };
    
    return hitChances;
  }

  /**
   * Calculate DPS values for different combat styles
   * @private
   * @param {Object} maxHits - Max hits for each style
   * @param {Object} hitChances - Hit chances for each style
   * @param {Object} gearSetup - Gear setup
   * @param {Object} options - Additional calculation options
   * @returns {Object} DPS values for each combat style
   */
  calculateDPSValues(maxHits, hitChances, gearSetup, options) {
    // Simplified DPS calculation
    const attackSpeeds = {
      melee: 4, // Default to 4 ticks for melee weapons
      ranged: 4, // Default to 4 ticks for ranged weapons
      magic: 4  // Default to 4 ticks for magic spells
    };
    
    // Adjust attack speeds based on weapon
    if (gearSetup.items && gearSetup.items.weapon) {
      const weapon = gearSetup.items.weapon;
      
      if (weapon.attackSpeed) {
        // Check weapon type
        if (weapon.weaponCategory === 'melee') {
          attackSpeeds.melee = weapon.attackSpeed;
        } else if (weapon.weaponCategory === 'ranged') {
          attackSpeeds.ranged = weapon.attackSpeed;
        } else if (weapon.weaponCategory === 'magic') {
          attackSpeeds.magic = weapon.attackSpeed;
        }
      }
    }
    
    // Calculate DPS for each style
    const dpsValues = {
      melee: (maxHits.melee * hitChances.melee) / (attackSpeeds.melee * 0.6),
      ranged: (maxHits.ranged * hitChances.ranged) / (attackSpeeds.ranged * 0.6),
      magic: (maxHits.magic * hitChances.magic) / (attackSpeeds.magic * 0.6)
    };
    
    return dpsValues;
  }

  /**
   * Find the best combat style based on DPS values
   * @private
   * @param {Object} dpsValues - DPS values for each combat style
   * @returns {string} The best combat style
   */
  findBestCombatStyle(dpsValues) {
    let bestStyle = 'melee';
    let bestDPS = dpsValues.melee;
    
    if (dpsValues.ranged > bestDPS) {
      bestStyle = 'ranged';
      bestDPS = dpsValues.ranged;
    }
    
    if (dpsValues.magic > bestDPS) {
      bestStyle = 'magic';
    }
    
    return bestStyle;
  }

  /**
   * Generate possible gear setups from available items
   * @private
   * @param {Array} availableGear - Player's available gear items
   * @param {Object} monster - Monster details
   * @returns {Array} Possible gear setups
   */
  generateGearSetups(availableGear, monster) {
    // This would be a complex algorithm to generate optimal gear sets
    // For now, we'll return a simplified implementation
    
    // Group items by slot
    const itemsBySlot = availableGear.reduce((acc, item) => {
      if (!acc[item.slot]) {
        acc[item.slot] = [];
      }
      acc[item.slot].push(item);
      return acc;
    }, {});
    
    // Create weapon-focused setups (melee, ranged, magic)
    const gearSetups = [];
    
    // Add a melee setup
    if (itemsBySlot.weapon && itemsBySlot.weapon.some(w => w.weaponCategory === 'melee')) {
      const meleeWeapons = itemsBySlot.weapon.filter(w => w.weaponCategory === 'melee');
      const bestMeleeWeapon = meleeWeapons.sort((a, b) => 
        (b.bonuses?.strengthMelee || 0) - (a.bonuses?.strengthMelee || 0)
      )[0];
      
      gearSetups.push({
        name: `${bestMeleeWeapon.name} Setup`,
        type: 'melee',
        items: {
          weapon: bestMeleeWeapon,
          // Add best items for other slots
          head: this.getBestItemForSlot(itemsBySlot.head, 'melee', monster),
          cape: this.getBestItemForSlot(itemsBySlot.cape, 'melee', monster),
          neck: this.getBestItemForSlot(itemsBySlot.neck, 'melee', monster),
          body: this.getBestItemForSlot(itemsBySlot.body, 'melee', monster),
          legs: this.getBestItemForSlot(itemsBySlot.legs, 'melee', monster),
          hands: this.getBestItemForSlot(itemsBySlot.hands, 'melee', monster),
          feet: this.getBestItemForSlot(itemsBySlot.feet, 'melee', monster),
          ring: this.getBestItemForSlot(itemsBySlot.ring, 'melee', monster),
          shield: this.getBestItemForSlot(itemsBySlot.shield, 'melee', monster),
          ammo: null // No ammo for melee
        }
      });
    }
    
    // Add a ranged setup
    if (itemsBySlot.weapon && itemsBySlot.weapon.some(w => w.weaponCategory === 'ranged')) {
      const rangedWeapons = itemsBySlot.weapon.filter(w => w.weaponCategory === 'ranged');
      const bestRangedWeapon = rangedWeapons.sort((a, b) => 
        (b.bonuses?.attackRanged || 0) - (a.bonuses?.attackRanged || 0)
      )[0];
      
      gearSetups.push({
        name: `${bestRangedWeapon.name} Setup`,
        type: 'ranged',
        items: {
          weapon: bestRangedWeapon,
          // Add best items for other slots
          head: this.getBestItemForSlot(itemsBySlot.head, 'ranged', monster),
          cape: this.getBestItemForSlot(itemsBySlot.cape, 'ranged', monster),
          neck: this.getBestItemForSlot(itemsBySlot.neck, 'ranged', monster),
          body: this.getBestItemForSlot(itemsBySlot.body, 'ranged', monster),
          legs: this.getBestItemForSlot(itemsBySlot.legs, 'ranged', monster),
          hands: this.getBestItemForSlot(itemsBySlot.hands, 'ranged', monster),
          feet: this.getBestItemForSlot(itemsBySlot.feet, 'ranged', monster),
          ring: this.getBestItemForSlot(itemsBySlot.ring, 'ranged', monster),
          shield: this.getBestItemForSlot(itemsBySlot.shield, 'ranged', monster),
          ammo: this.getBestItemForSlot(itemsBySlot.ammo, 'ranged', monster)
        }
      });
    }
    
    // Add a magic setup
    if (itemsBySlot.weapon && itemsBySlot.weapon.some(w => w.weaponCategory === 'magic')) {
      const magicWeapons = itemsBySlot.weapon.filter(w => w.weaponCategory === 'magic');
      const bestMagicWeapon = magicWeapons.sort((a, b) => 
        (b.bonuses?.attackMagic || 0) - (a.bonuses?.attackMagic || 0)
      )[0];
      
      gearSetups.push({
        name: `${bestMagicWeapon.name} Setup`,
        type: 'magic',
        items: {
          weapon: bestMagicWeapon,
          // Add best items for other slots
          head: this.getBestItemForSlot(itemsBySlot.head, 'magic', monster),
          cape: this.getBestItemForSlot(itemsBySlot.cape, 'magic', monster),
          neck: this.getBestItemForSlot(itemsBySlot.neck, 'magic', monster),
          body: this.getBestItemForSlot(itemsBySlot.body, 'magic', monster),
          legs: this.getBestItemForSlot(itemsBySlot.legs, 'magic', monster),
          hands: this.getBestItemForSlot(itemsBySlot.hands, 'magic', monster),
          feet: this.getBestItemForSlot(itemsBySlot.feet, 'magic', monster),
          ring: this.getBestItemForSlot(itemsBySlot.ring, 'magic', monster),
          shield: this.getBestItemForSlot(itemsBySlot.shield, 'magic', monster),
          ammo: this.getBestItemForSlot(itemsBySlot.ammo, 'magic', monster)
        }
      });
    }
    
    return gearSetups;
  }

  /**
   * Get the best item for a specific slot based on combat style
   * @private
   * @param {Array} items - Available items for the slot
   * @param {string} combatStyle - Combat style (melee, ranged, magic)
   * @param {Object} monster - Monster details
   * @returns {Object|null} The best item or null if no items
   */
  getBestItemForSlot(items, combatStyle, monster) {
    if (!items || items.length === 0) {
      return null;
    }
    
    // Define the primary stats to sort by based on combat style
    let primaryStat = '';
    let secondaryStat = '';
    
    switch (combatStyle) {
      case 'melee':
        primaryStat = 'strengthMelee';
        secondaryStat = 'attackSlash'; // Could be stab/crush based on weapon/monster
        break;
      case 'ranged':
        primaryStat = 'strengthRanged';
        secondaryStat = 'attackRanged';
        break;
      case 'magic':
        primaryStat = 'strengthMagic';
        secondaryStat = 'attackMagic';
        break;
    }
    
    // Sort items by primary stat, then secondary stat
    return items.sort((a, b) => {
      const aPrimaryStat = (a.bonuses && a.bonuses[primaryStat]) || 0;
      const bPrimaryStat = (b.bonuses && b.bonuses[primaryStat]) || 0;
      
      // First compare by primary stat
      if (bPrimaryStat !== aPrimaryStat) {
        return bPrimaryStat - aPrimaryStat;
      }
      
      // If equal, compare by secondary stat
      const aSecondaryStat = (a.bonuses && a.bonuses[secondaryStat]) || 0;
      const bSecondaryStat = (b.bonuses && b.bonuses[secondaryStat]) || 0;
      
      return bSecondaryStat - aSecondaryStat;
    })[0];
  }

  /**
   * Check if data is cached and valid
   * @private
   * @param {string} key - Cache key
   * @returns {boolean} - True if cached data is available and valid
   */
  hasCachedData(key) {
    if (!this.cache) {
      this.cache = new Map();
    }
    
    if (!this.cache.has(key)) {
      return false;
    }
    
    const cachedItem = this.cache.get(key);
    const currentTime = new Date().getTime();
    
    return (currentTime - cachedItem.timestamp) < this.cacheTimeout;
  }
  
  /**
   * Get cached data
   * @private
   * @param {string} key - Cache key
   * @returns {*} - Cached data
   */
  getCachedData(key) {
    if (!this.hasCachedData(key)) {
      return null;
    }
    
    return this.cache.get(key).data;
  }
  
  /**
   * Set data in cache
   * @private
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  setCachedData(key, data) {
    if (!this.cache) {
      this.cache = new Map();
    }
    
    this.cache.set(key, {
      data,
      timestamp: new Date().getTime()
    });
  }
}

// Create a singleton instance
const dpsCalculatorService = new DPSCalculatorService();
export default dpsCalculatorService;
