/**
 * Group Milestones Service
 * 
 * Handles business logic for group milestones feature
 */

import * as groupMilestonesApi from './group-milestones-api';

/**
 * Milestone Types with display names and descriptions
 */
export const MILESTONE_TYPES = {
  SKILL_TOTAL: {
    id: 'skill_total',
    name: 'Skill Total',
    description: 'Track collective skill total level progress',
    icon: 'skill-icon.png'
  },
  BOSS_KC: {
    id: 'boss_kc',
    name: 'Boss Kill Count',
    description: 'Track group boss kills',
    icon: 'boss-icon.png'
  },
  COLLECTION_LOG: {
    id: 'collection_log',
    name: 'Collection Log',
    description: 'Track collection log completion goals',
    icon: 'collection-icon.png'
  },
  QUEST_COMPLETION: {
    id: 'quest_completion',
    name: 'Quest Completion',
    description: 'Track group quest completion progress',
    icon: 'quest-icon.png'
  },
  ACHIEVEMENT_DIARY: {
    id: 'achievement_diary',
    name: 'Achievement Diary',
    description: 'Track achievement diary completion',
    icon: 'diary-icon.png'
  },
  CUSTOM: {
    id: 'custom',
    name: 'Custom',
    description: 'Create custom group milestones',
    icon: 'custom-icon.png'
  }
};

/**
 * Get all group milestones with optional filters
 * 
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Filtered and formatted milestones
 */
export const getGroupMilestones = async (filters = {}) => {
  try {
    const milestones = await groupMilestonesApi.fetchGroupMilestones(filters);
    
    // Format and enhance the milestone data
    return milestones.map(milestone => ({
      ...milestone,
      typeName: MILESTONE_TYPES[milestone.milestone.milestone_type.toUpperCase()]?.name || 'Unknown',
      typeIcon: MILESTONE_TYPES[milestone.milestone.milestone_type.toUpperCase()]?.icon || 'default-icon.png',
      formattedStartDate: new Date(milestone.milestone.start_date).toLocaleDateString(),
      formattedEndDate: milestone.milestone.end_date 
        ? new Date(milestone.milestone.end_date).toLocaleDateString() 
        : 'No end date',
      formattedCompletedDate: milestone.milestone.completed_at 
        ? new Date(milestone.milestone.completed_at).toLocaleDateString() 
        : null,
      progressColor: getProgressColor(milestone.group_progress)
    }));
  } catch (error) {
    console.error('Error in getGroupMilestones service:', error);
    throw error;
  }
};

/**
 * Get progress color based on completion percentage
 * 
 * @param {number} progress - Progress percentage (0-100)
 * @returns {string} - CSS color class
 */
const getProgressColor = (progress) => {
  if (progress >= 100) return 'progress-complete';
  if (progress >= 75) return 'progress-high';
  if (progress >= 50) return 'progress-medium';
  if (progress >= 25) return 'progress-low';
  return 'progress-start';
};

/**
 * Create a new group milestone
 * 
 * @param {Object} milestoneData - The milestone data
 * @returns {Promise<Object>} - The created milestone
 */
export const createMilestone = async (milestoneData) => {
  try {
    // Format the milestone data for the API
    const apiMilestone = {
      title: milestoneData.title,
      description: milestoneData.description,
      milestone_type: milestoneData.type,
      target_data: milestoneData.targetData || {},
      completion_criteria: milestoneData.completionCriteria || null,
      end_date: milestoneData.endDate || null
    };
    
    return await groupMilestonesApi.createGroupMilestone(apiMilestone);
  } catch (error) {
    console.error('Error in createMilestone service:', error);
    throw error;
  }
};

/**
 * Toggle a milestone's completion status
 * 
 * @param {number} milestoneId - The milestone ID
 * @param {boolean} currentStatus - The current completion status
 * @returns {Promise<Object>} - The updated milestone
 */
export const toggleMilestoneCompletion = async (milestoneId, currentStatus) => {
  try {
    return await groupMilestonesApi.updateMilestoneStatus(milestoneId, !currentStatus);
  } catch (error) {
    console.error('Error in toggleMilestoneCompletion service:', error);
    throw error;
  }
};

/**
 * Update a member's progress on a milestone
 * 
 * @param {number} milestoneId - The milestone ID
 * @param {string} memberName - The member's name
 * @param {Object} progressData - Progress data to update
 * @returns {Promise<Object>} - The update result
 */
export const updateProgress = async (milestoneId, memberName, progressData) => {
  try {
    const progress = {
      current_progress: progressData.currentProgress || {},
      percent_complete: progressData.percentComplete || 0
    };
    
    return await groupMilestonesApi.updateMemberProgress(milestoneId, memberName, progress);
  } catch (error) {
    console.error('Error in updateProgress service:', error);
    throw error;
  }
};

/**
 * Remove a milestone
 * 
 * @param {number} milestoneId - The milestone ID to delete
 * @returns {Promise<Object>} - The deletion result
 */
export const removeMilestone = async (milestoneId) => {
  try {
    return await groupMilestonesApi.deleteGroupMilestone(milestoneId);
  } catch (error) {
    console.error('Error in removeMilestone service:', error);
    throw error;
  }
};

/**
 * Generate milestone templates based on the selected type
 * 
 * @param {string} type - The milestone type
 * @returns {Object} - A template milestone with default values
 */
export const generateMilestoneTemplate = (type) => {
  const templates = {
    skill_total: {
      title: 'Group Total Level Goal',
      description: 'Reach a combined total level across all group members',
      targetData: { totalLevel: 500 },
      completionCriteria: { type: 'total_sum', threshold: 500 }
    },
    boss_kc: {
      title: 'Boss Kill Count Challenge',
      description: 'Defeat a specific boss a number of times as a group',
      targetData: { bossName: 'General Graardor', killCount: 50 },
      completionCriteria: { type: 'kill_count', threshold: 50 }
    },
    collection_log: {
      title: 'Collection Log Challenge',
      description: 'Complete a specific collection log as a group',
      targetData: { collectionName: 'Barrows Equipment', itemIds: [] },
      completionCriteria: { type: 'collection_complete', collectionName: 'Barrows Equipment' }
    },
    quest_completion: {
      title: 'Quest Completion Challenge',
      description: 'Complete a specific set of quests as a group',
      targetData: { questList: ['Dragon Slayer', 'Monkey Madness'] },
      completionCriteria: { type: 'all_quests_complete', quests: ['Dragon Slayer', 'Monkey Madness'] }
    },
    achievement_diary: {
      title: 'Achievement Diary Challenge',
      description: 'Complete a specific achievement diary as a group',
      targetData: { diaryName: 'Lumbridge & Draynor', difficulty: 'Hard' },
      completionCriteria: { type: 'achievement_complete', diary: 'Lumbridge & Draynor', difficulty: 'Hard' }
    },
    custom: {
      title: 'Custom Group Challenge',
      description: 'Create a custom challenge for your group',
      targetData: {},
      completionCriteria: null
    }
  };
  
  return templates[type] || templates.custom;
};
