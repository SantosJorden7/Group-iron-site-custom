/**
 * Group Challenges Service
 * Handles business logic for the Group Challenges feature
 */
import * as challengesApi from './group-challenges-api';

class GroupChallengesService {
  constructor() {
    this.activeChallenges = [];
    this.completedChallenges = [];
    this.challengeTypes = [];
    this.currentGroupId = null;
    this.challengesCache = new Map();
  }

  /**
   * Initialize the service with a group ID
   * @param {string} groupId - The group ID
   */
  initialize(groupId) {
    this.currentGroupId = groupId;
    this.challengesCache.clear();
    
    // Load challenge types on initialization
    this.loadChallengeTypes();
  }

  /**
   * Load available challenge types/templates
   * @returns {Promise<Array>} - Challenge types
   */
  async loadChallengeTypes() {
    try {
      this.challengeTypes = await challengesApi.fetchChallengeTypes();
      return this.challengeTypes;
    } catch (error) {
      console.error('Failed to load challenge types:', error);
      return [];
    }
  }

  /**
   * Get active challenges for the current group
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Active challenges
   */
  async getActiveChallenges(forceRefresh = false) {
    if (!this.currentGroupId) {
      throw new Error('Group ID not set. Call initialize() first.');
    }

    if (forceRefresh || this.activeChallenges.length === 0) {
      try {
        this.activeChallenges = await challengesApi.fetchActiveChallenges(this.currentGroupId);
      } catch (error) {
        console.error('Failed to get active challenges:', error);
        return [];
      }
    }

    return this.activeChallenges;
  }

  /**
   * Get completed challenges for the current group
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Completed challenges
   */
  async getCompletedChallenges(forceRefresh = false) {
    if (!this.currentGroupId) {
      throw new Error('Group ID not set. Call initialize() first.');
    }

    if (forceRefresh || this.completedChallenges.length === 0) {
      try {
        this.completedChallenges = await challengesApi.fetchCompletedChallenges(this.currentGroupId);
      } catch (error) {
        console.error('Failed to get completed challenges:', error);
        return [];
      }
    }

    return this.completedChallenges;
  }

  /**
   * Get detailed information about a specific challenge, including member contributions
   * @param {string} challengeId - The challenge ID
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Object>} - Challenge details
   */
  async getChallengeDetails(challengeId, forceRefresh = false) {
    if (!challengeId) {
      throw new Error('Challenge ID is required');
    }

    if (forceRefresh || !this.challengesCache.has(challengeId)) {
      try {
        const details = await challengesApi.fetchChallengeDetails(challengeId);
        this.challengesCache.set(challengeId, details);
      } catch (error) {
        console.error(`Failed to get details for challenge ${challengeId}:`, error);
        throw error;
      }
    }

    return this.challengesCache.get(challengeId);
  }

  /**
   * Create a new challenge
   * @param {Object} challengeData - The challenge data
   * @returns {Promise<Object>} - Newly created challenge
   */
  async createChallenge(challengeData) {
    if (!this.currentGroupId) {
      throw new Error('Group ID not set. Call initialize() first.');
    }

    try {
      const newChallenge = await challengesApi.createChallenge(this.currentGroupId, challengeData);
      // Update the active challenges list
      this.activeChallenges = [newChallenge, ...this.activeChallenges];
      return newChallenge;
    } catch (error) {
      console.error('Failed to create challenge:', error);
      throw error;
    }
  }

  /**
   * Update an existing challenge
   * @param {string} challengeId - The challenge ID
   * @param {Object} updatedData - The updated challenge data
   * @returns {Promise<Object>} - Updated challenge
   */
  async updateChallenge(challengeId, updatedData) {
    try {
      const updatedChallenge = await challengesApi.updateChallenge(challengeId, updatedData);
      
      // Update cache and lists
      this.challengesCache.set(challengeId, updatedChallenge);
      
      // Update in active challenges list if present
      this.activeChallenges = this.activeChallenges.map(challenge => 
        challenge.id === challengeId ? updatedChallenge : challenge
      );
      
      return updatedChallenge;
    } catch (error) {
      console.error(`Failed to update challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a challenge
   * @param {string} challengeId - The challenge ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deleteChallenge(challengeId) {
    try {
      await challengesApi.deleteChallenge(challengeId);
      
      // Remove from cache and lists
      this.challengesCache.delete(challengeId);
      this.activeChallenges = this.activeChallenges.filter(c => c.id !== challengeId);
      this.completedChallenges = this.completedChallenges.filter(c => c.id !== challengeId);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Update a member's contribution to a challenge
   * @param {string} challengeId - The challenge ID
   * @param {string} memberName - The member's name
   * @param {Object} contributionData - The contribution data
   * @returns {Promise<Object>} - Updated challenge with contributions
   */
  async updateMemberContribution(challengeId, memberName, contributionData) {
    try {
      await challengesApi.updateContribution(challengeId, memberName, contributionData);
      
      // Refresh the challenge details in the cache
      const updatedDetails = await challengesApi.fetchChallengeDetails(challengeId);
      this.challengesCache.set(challengeId, updatedDetails);
      
      return updatedDetails;
    } catch (error) {
      console.error(`Failed to update ${memberName}'s contribution for challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a challenge as completed
   * @param {string} challengeId - The challenge ID
   * @returns {Promise<Object>} - Completed challenge
   */
  async completeChallenge(challengeId) {
    try {
      const completedChallenge = await challengesApi.completeChallenge(challengeId);
      
      // Update cache
      this.challengesCache.set(challengeId, completedChallenge);
      
      // Move from active to completed list
      this.activeChallenges = this.activeChallenges.filter(c => c.id !== challengeId);
      this.completedChallenges = [completedChallenge, ...this.completedChallenges];
      
      return completedChallenge;
    } catch (error) {
      console.error(`Failed to complete challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate overall progress for a challenge
   * @param {Object} challenge - The challenge object with member contributions
   * @returns {number} - Progress percentage (0-100)
   */
  calculateChallengeProgress(challenge) {
    if (!challenge || !challenge.contributions || !challenge.target) {
      return 0;
    }

    // Sum up all member contributions
    const totalContribution = Object.values(challenge.contributions)
      .reduce((sum, contribution) => sum + contribution, 0);
    
    // Calculate percentage, capped at 100%
    return Math.min(Math.round((totalContribution / challenge.target) * 100), 100);
  }

  /**
   * Get challenge status text
   * @param {Object} challenge - The challenge object
   * @returns {string} - Status text
   */
  getChallengeStatusText(challenge) {
    if (!challenge) return 'Unknown';
    
    if (challenge.completed) {
      return 'Completed';
    }
    
    const now = new Date();
    const endDate = new Date(challenge.endDate);
    
    if (endDate < now) {
      return 'Expired';
    }
    
    const progress = this.calculateChallengeProgress(challenge);
    if (progress >= 100) {
      return 'Ready to Complete';
    }
    
    return 'In Progress';
  }

  /**
   * Check if a challenge is overdue
   * @param {Object} challenge - The challenge object
   * @returns {boolean} - Whether the challenge is overdue
   */
  isChallengeOverdue(challenge) {
    if (!challenge || challenge.completed) return false;
    
    const now = new Date();
    const endDate = new Date(challenge.endDate);
    
    return endDate < now;
  }

  /**
   * Get upcoming challenges (ending soon but not overdue)
   * @param {number} daysThreshold - Number of days to consider "upcoming"
   * @returns {Promise<Array>} - Upcoming challenges
   */
  async getUpcomingChallenges(daysThreshold = 3) {
    const activeChallenges = await this.getActiveChallenges();
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return activeChallenges.filter(challenge => {
      const endDate = new Date(challenge.endDate);
      return endDate > now && endDate <= thresholdDate;
    });
  }

  /**
   * Auto-update challenge progress based on RuneLite plugin data
   * This syncs the player's in-game progress with challenge requirements
   * 
   * @param {Object} playerData - The player data from RuneLite plugin
   * @param {string} playerName - The player's name
   * @returns {Promise<Array>} - Updated challenges that were affected
   */
  async autoUpdateChallengeProgress(playerData, playerName) {
    if (!playerData || !playerName) {
      console.error('Player data or name missing for auto update');
      return [];
    }
    
    try {
      // Fetch all active challenges for this group
      const activeChallenges = await this.getActiveChallenges(true);
      const updatedChallenges = [];
      
      for (const challenge of activeChallenges) {
        // Determine if this challenge can be automatically tracked
        const {shouldUpdate, contributionData} = this.calculateContributionFromPlayerData(
          challenge,
          playerData,
          playerName
        );
        
        if (shouldUpdate) {
          try {
            // Update the contribution through the API
            await this.updateMemberContribution(challenge.id, playerName, contributionData);
            updatedChallenges.push(challenge.id);
          } catch (err) {
            console.error(`Failed to auto-update challenge ${challenge.id} for ${playerName}:`, err);
          }
        }
      }
      
      return updatedChallenges;
    } catch (error) {
      console.error('Error in autoUpdateChallengeProgress:', error);
      return [];
    }
  }
  
  /**
   * Calculate contribution data from player stats/data
   * 
   * @param {Object} challenge - The challenge object
   * @param {Object} playerData - Player data from RuneLite plugin
   * @param {string} playerName - The player's name
   * @returns {Object} - { shouldUpdate, contributionData }
   */
  calculateContributionFromPlayerData(challenge, playerData, playerName) {
    // Default response - no update needed
    const defaultResponse = {
      shouldUpdate: false,
      contributionData: {}
    };
    
    // Skip if no challenge type info
    if (!challenge || !challenge.type) {
      return defaultResponse;
    }
    
    const contributionData = {
      amount: 0,
      lastUpdated: new Date().toISOString(),
      details: {}
    };
    
    switch (challenge.type) {
      case 'SKILL_TRAINING': {
        // Extract skill data from playerData
        if (!playerData.skills) return defaultResponse;
        
        try {
          const skillsData = JSON.parse(playerData.skills || '{}');
          const targetSkill = challenge.config?.skillName?.toLowerCase();
          
          if (targetSkill && skillsData[targetSkill]) {
            const currentXp = skillsData[targetSkill].xp || 0;
            contributionData.amount = currentXp;
            contributionData.details = {
              level: skillsData[targetSkill].level || 1,
              xp: currentXp
            };
            return { shouldUpdate: true, contributionData };
          }
        } catch (e) {
          console.error('Error parsing skills data:', e);
        }
        break;
      }
      
      case 'BOSS_KILLS': {
        // Extract boss KC from stats
        if (!playerData.stats) return defaultResponse;
        
        try {
          const statsData = JSON.parse(playerData.stats || '{}');
          const bossName = challenge.config?.bossName?.toLowerCase().replace(' ', '_');
          
          if (bossName) {
            const kcKey = `${bossName}_kc`;
            if (statsData[kcKey] !== undefined) {
              contributionData.amount = statsData[kcKey];
              contributionData.details = {
                killCount: statsData[kcKey],
                bossName: challenge.config?.bossName
              };
              return { shouldUpdate: true, contributionData };
            }
          }
        } catch (e) {
          console.error('Error parsing stats data:', e);
        }
        break;
      }
      
      case 'COLLECTION_LOG': {
        // Extract collection log data
        if (!playerData.collection_log) return defaultResponse;
        
        try {
          const collectionData = JSON.parse(playerData.collection_log || '{}');
          const collectionName = challenge.config?.collectionName;
          
          if (collectionName && collectionData[collectionName]) {
            const obtainedCount = collectionData[collectionName].obtained_count || 0;
            const totalCount = collectionData[collectionName].total_count || 1;
            
            contributionData.amount = obtainedCount;
            contributionData.details = {
              obtainedCount,
              totalCount,
              percentage: Math.round((obtainedCount / totalCount) * 100)
            };
            return { shouldUpdate: true, contributionData };
          }
        } catch (e) {
          console.error('Error parsing collection log data:', e);
        }
        break;
      }
      
      case 'ITEM_ACQUISITION': {
        // This requires integration with recent valuable drops
        // We just check for the items in the bank
        if (!playerData.bank) return defaultResponse;
        
        try {
          const bankData = JSON.parse(playerData.bank || '[]');
          const targetItemId = challenge.config?.itemId;
          
          if (targetItemId) {
            const bankItem = bankData.find(item => item.id === targetItemId);
            if (bankItem) {
              contributionData.amount = bankItem.quantity || 0;
              contributionData.details = {
                itemName: bankItem.name || 'Unknown Item',
                quantity: bankItem.quantity || 0
              };
              return { shouldUpdate: true, contributionData };
            }
          }
        } catch (e) {
          console.error('Error parsing bank data:', e);
        }
        break;
      }
      
      case 'QUEST_COMPLETION': {
        // Check quest completion status
        if (!playerData.quests) return defaultResponse;
        
        try {
          const questsData = JSON.parse(playerData.quests || '{}');
          const targetQuest = challenge.config?.questName;
          
          if (targetQuest && questsData[targetQuest]) {
            const isCompleted = questsData[targetQuest] === 'FINISHED';
            contributionData.amount = isCompleted ? 1 : 0;
            contributionData.details = {
              questStatus: questsData[targetQuest],
              completed: isCompleted
            };
            return { shouldUpdate: true, contributionData };
          }
        } catch (e) {
          console.error('Error parsing quests data:', e);
        }
        break;
      }
      
      case 'PVP_KILLS':
      case 'SLAYER_TASKS':
      case 'CUSTOM': 
      default:
        // These types require manual tracking or more specific integration
        return defaultResponse;
    }
    
    return defaultResponse;
  }

  /**
   * Connect valuable drops to relevant challenges
   * Updates challenge progress when valuable drops are received
   * 
   * @param {Object} dropData - The valuable drop data
   * @param {string} playerName - The player who received the drop
   * @returns {Promise<Array>} - Updated challenges
   */
  async processValuableDrop(dropData, playerName) {
    if (!dropData || !playerName) {
      return [];
    }
    
    try {
      const activeChallenges = await this.getActiveChallenges(true);
      const updatedChallenges = [];
      
      for (const challenge of activeChallenges) {
        // Check if this drop is relevant to the challenge
        if (challenge.type === 'ITEM_ACQUISITION') {
          const targetItemId = challenge.config?.itemId;
          
          if (targetItemId && dropData.item_id === targetItemId) {
            // This drop matches a challenge requirement
            const challengeDetails = await this.getChallengeDetails(challenge.id, true);
            const currentContribution = challengeDetails.memberContributions?.[playerName]?.amount || 0;
            
            // Update the contribution
            const contributionData = {
              amount: currentContribution + dropData.item_quantity,
              lastUpdated: new Date().toISOString(),
              details: {
                itemName: dropData.item_name,
                source: dropData.source_name,
                lastDropQuantity: dropData.item_quantity,
                lastDropValue: dropData.item_value,
                lastDropTime: dropData.timestamp
              }
            };
            
            await this.updateMemberContribution(challenge.id, playerName, contributionData);
            updatedChallenges.push(challenge.id);
          }
        } else if (challenge.type === 'BOSS_KILLS' && dropData.source_name) {
          // Match boss name (approximate)
          const challengeBoss = challenge.config?.bossName?.toLowerCase();
          const dropSource = dropData.source_name.toLowerCase();
          
          if (challengeBoss && dropSource.includes(challengeBoss)) {
            // This drop is from the challenge boss
            const challengeDetails = await this.getChallengeDetails(challenge.id, true);
            const currentContribution = challengeDetails.memberContributions?.[playerName]?.amount || 0;
            
            // Increment kill count by 1 (assumption: 1 drop = 1 kill)
            const contributionData = {
              amount: currentContribution + 1,
              lastUpdated: new Date().toISOString(),
              details: {
                bossName: dropData.source_name,
                lastDropItem: dropData.item_name,
                lastDropValue: dropData.item_value
              }
            };
            
            await this.updateMemberContribution(challenge.id, playerName, contributionData);
            updatedChallenges.push(challenge.id);
          }
        }
      }
      
      return updatedChallenges;
    } catch (error) {
      console.error('Error processing valuable drop for challenges:', error);
      return [];
    }
  }
}

// Create a singleton instance
const groupChallengesService = new GroupChallengesService();

export default groupChallengesService;
