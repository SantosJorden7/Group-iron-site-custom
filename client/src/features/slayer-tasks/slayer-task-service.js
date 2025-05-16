/**
 * Slayer Task Business Logic
 * Contains all the business logic for the Slayer Task feature
 */
import * as slayerTaskApi from './slayer-task-api';

/**
 * Get the current slayer task and history for a specified member
 * @param {string} memberName - The name of the group member
 * @returns {Promise} - Promise with formatted slayer task data
 */
export const getSlayerTaskInfo = async (memberName) => {
  try {
    const slayerData = await slayerTaskApi.fetchSlayerTask(memberName);
    
    // Format remaining kills if there's a current task
    if (slayerData.current_task) {
      slayerData.current_task.remaining = slayerData.current_task.quantity;
      slayerData.current_task.formatted_date = new Date(slayerData.current_task.assigned_at)
        .toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
    }
    
    // Format dates and additional info for task history
    if (slayerData.task_history && slayerData.task_history.length > 0) {
      slayerData.task_history = slayerData.task_history.map(task => ({
        ...task,
        formatted_assigned_date: new Date(task.assigned_at)
          .toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
        formatted_completed_date: task.completed_at ? new Date(task.completed_at)
          .toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : 'N/A'
      }));
    }
    
    return slayerData;
  } catch (error) {
    console.error('Failed to get slayer task info:', error);
    throw error;
  }
};

/**
 * Create a new slayer task for a member
 * @param {string} memberName - The name of the group member
 * @param {object} taskData - The slayer task data
 * @returns {Promise} - Promise with the created task
 */
export const createSlayerTask = async (memberName, taskData) => {
  try {
    // Validate task data
    if (!taskData.monster_name || !taskData.quantity || !taskData.slayer_master) {
      throw new Error('Missing required task information');
    }
    
    const result = await slayerTaskApi.submitSlayerTask(memberName, taskData);
    return result;
  } catch (error) {
    console.error('Failed to create slayer task:', error);
    throw error;
  }
};

/**
 * Get group slayer statistics
 * @returns {Promise} - Promise with formatted group slayer statistics
 */
export const getGroupSlayerStats = async () => {
  try {
    const groupStats = await slayerTaskApi.fetchGroupSlayerStats();
    
    // Add additional calculated stats
    if (groupStats.members && groupStats.members.length > 0) {
      groupStats.total_points = groupStats.members.reduce(
        (total, member) => total + (member.slayer_points || 0), 0
      );
      
      groupStats.total_tasks_completed = groupStats.members.reduce(
        (total, member) => total + (member.tasks_completed || 0), 0
      );
      
      groupStats.highest_streak = Math.max(
        ...groupStats.members.map(member => member.task_streak || 0)
      );
    }
    
    return groupStats;
  } catch (error) {
    console.error('Failed to get group slayer stats:', error);
    throw error;
  }
};
