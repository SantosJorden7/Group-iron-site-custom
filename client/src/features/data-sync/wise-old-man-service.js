/**
 * Wise Old Man API Service
 * Handles API interactions with the Wise Old Man OSRS tracking platform
 * https://wiseoldman.net/
 */

/**
 * A class for interacting with the Wise Old Man API
 */
class WiseOldManService {
  constructor() {
    this.baseUrl = 'https://api.wiseoldman.net/v2';
    this.playerCache = new Map();
    this.groupCache = new Map();
    this.achievementsCache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes in milliseconds
  }

  /**
   * Get player data from Wise Old Man API
   * @param {string} username - OSRS player username
   * @returns {Promise<Object>} - Player data
   */
  async getPlayer(username) {
    if (!username || username.trim() === '') {
      return null;
    }

    // Check cache first
    const cacheKey = username.toLowerCase();
    const cachedData = this.playerCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheExpiry) {
      return cachedData.data;
    }

    try {
      const response = await fetch(`${this.baseUrl}/players/username/${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Player '${username}' not found on Wise Old Man`);
          return null;
        }
        throw new Error(`Wise Old Man API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.playerCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching Wise Old Man data for player '${username}':`, error);
      return null;
    }
  }

  /**
   * Get player skills data
   * @param {string} username - OSRS player username
   * @returns {Promise<Object>} - Player skills data
   */
  async getPlayerSkills(username) {
    const player = await this.getPlayer(username);
    if (!player) return null;
    
    try {
      const response = await fetch(`${this.baseUrl}/players/${player.id}/snapshots/latest`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player skills: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data.skills;
    } catch (error) {
      console.error(`Error fetching skills for '${username}':`, error);
      return null;
    }
  }

  /**
   * Get player boss KC data
   * @param {string} username - OSRS player username
   * @returns {Promise<Object>} - Player boss KC data
   */
  async getPlayerBossKCs(username) {
    const player = await this.getPlayer(username);
    if (!player) return null;
    
    try {
      const response = await fetch(`${this.baseUrl}/players/${player.id}/snapshots/latest`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player boss KCs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data.bosses;
    } catch (error) {
      console.error(`Error fetching boss KCs for '${username}':`, error);
      return null;
    }
  }

  /**
   * Get player achievements
   * @param {string} username - OSRS player username
   * @returns {Promise<Array>} - Player achievements
   */
  async getPlayerAchievements(username) {
    const player = await this.getPlayer(username);
    if (!player) return [];
    
    // Check cache first
    const cacheKey = `${player.id}_achievements`;
    const cachedData = this.achievementsCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheExpiry) {
      return cachedData.data;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/players/${player.id}/achievements`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player achievements: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.achievementsCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching achievements for '${username}':`, error);
      return [];
    }
  }

  /**
   * Get or create a group
   * @param {string} groupName - Group name
   * @param {Array<string>} members - Group member usernames
   * @returns {Promise<Object>} - Group data
   */
  async getOrCreateGroup(groupName, members) {
    if (!groupName || groupName.trim() === '' || !members || members.length === 0) {
      return null;
    }
    
    // Check if group exists
    try {
      const response = await fetch(`${this.baseUrl}/groups/name/${encodeURIComponent(groupName)}`);
      
      if (response.ok) {
        const data = await response.json();
        // Cache the result
        this.groupCache.set(groupName.toLowerCase(), {
          data,
          timestamp: Date.now()
        });
        return data;
      }
      
      if (response.status !== 404) {
        throw new Error(`Wise Old Man API request failed: ${response.status} ${response.statusText}`);
      }
      
      // Group doesn't exist, create it
      const createResponse = await fetch(`${this.baseUrl}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName,
          members: members.map(username => ({ username }))
        })
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create group: ${createResponse.status} ${createResponse.statusText}`);
      }
      
      const newGroup = await createResponse.json();
      
      // Cache the result
      this.groupCache.set(groupName.toLowerCase(), {
        data: newGroup,
        timestamp: Date.now()
      });
      
      return newGroup;
    } catch (error) {
      console.error(`Error with Wise Old Man group '${groupName}':`, error);
      return null;
    }
  }

  /**
   * Get group details with members data
   * @param {string} groupName - Group name
   * @returns {Promise<Object>} - Group details with members data
   */
  async getGroupDetails(groupName) {
    if (!groupName || groupName.trim() === '') {
      return null;
    }
    
    // Check cache first
    const cacheKey = groupName.toLowerCase();
    const cachedData = this.groupCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheExpiry) {
      return cachedData.data;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/groups/name/${encodeURIComponent(groupName)}/details`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Group '${groupName}' not found on Wise Old Man`);
          return null;
        }
        throw new Error(`Wise Old Man API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.groupCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching Wise Old Man data for group '${groupName}':`, error);
      return null;
    }
  }

  /**
   * Get group hiscores (XP and KC leaderboards)
   * @param {string} groupName - Group name
   * @returns {Promise<Object>} - Group hiscores data
   */
  async getGroupHiscores(groupName) {
    const group = await this.getGroupDetails(groupName);
    if (!group) return null;
    
    try {
      const response = await fetch(`${this.baseUrl}/groups/${group.id}/hiscores`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group hiscores: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching hiscores for group '${groupName}':`, error);
      return null;
    }
  }

  /**
   * Get group competition data
   * @param {string} groupName - Group name
   * @returns {Promise<Array>} - Group competition data
   */
  async getGroupCompetitions(groupName) {
    const group = await this.getGroupDetails(groupName);
    if (!group) return [];
    
    try {
      const response = await fetch(`${this.baseUrl}/groups/${group.id}/competitions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group competitions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching competitions for group '${groupName}':`, error);
      return [];
    }
  }

  /**
   * Update a player's data on Wise Old Man
   * @param {string} username - OSRS player username
   * @returns {Promise<Object>} - Updated player data
   */
  async updatePlayer(username) {
    if (!username || username.trim() === '') {
      return null;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/players/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update player: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update cache
      const cacheKey = username.toLowerCase();
      this.playerCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`Error updating Wise Old Man data for '${username}':`, error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.playerCache.clear();
    this.groupCache.clear();
    this.achievementsCache.clear();
    console.log('Wise Old Man cache cleared');
  }
}

// Create a singleton instance
const wiseOldManService = new WiseOldManService();
export default wiseOldManService;
