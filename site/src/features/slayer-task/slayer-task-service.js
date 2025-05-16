/**
 * Slayer Task Service
 * Handles API interactions for the slayer task feature
 */

import ApiClient from '../../services/api-client';

class SlayerTaskService {
  /**
   * Get the current slayer task for a member
   * 
   * @param {string} memberName - The name of the member
   * @returns {Promise<Object>} - The slayer task data
   */
  static async getSlayerTask(memberName) {
    return ApiClient.get(`/custom/slayer-task/${encodeURIComponent(memberName)}`);
  }

  /**
   * Submit a new slayer task for a member
   * 
   * @param {Object} taskData - The slayer task data
   * @param {string} taskData.memberName - Member name
   * @param {string} taskData.taskMonster - Monster to slay
   * @param {number} taskData.taskAmount - Amount to slay
   * @param {string} taskData.taskMaster - Slayer master who assigned the task
   * @param {number} [taskData.taskPoints=0] - Slayer points for the task
   * @param {string} [taskData.taskLocation=''] - Location of the task
   * @returns {Promise<Object>} - API response
   */
  static async submitSlayerTask(taskData) {
    return ApiClient.post(`/custom/slayer-task/${encodeURIComponent(taskData.memberName)}`, {
      task_monster: taskData.taskMonster,
      task_amount: taskData.taskAmount,
      task_master: taskData.taskMaster,
      task_points: taskData.taskPoints || 0,
      task_location: taskData.taskLocation || ''
    });
  }

  /**
   * Update the completed amount for a slayer task
   * 
   * @param {string} memberName - The name of the member
   * @param {number} completedAmount - The amount of monsters completed
   * @returns {Promise<Object>} - API response
   */
  static async updateTaskProgress(memberName, completedAmount) {
    return ApiClient.put(`/custom/slayer-task/${encodeURIComponent(memberName)}/progress`, {
      completed_amount: completedAmount
    });
  }

  /**
   * Mark a slayer task as completed
   * 
   * @param {string} memberName - The name of the member
   * @returns {Promise<Object>} - API response
   */
  static async completeTask(memberName) {
    return ApiClient.put(`/custom/slayer-task/${encodeURIComponent(memberName)}/complete`, {});
  }
}

export default SlayerTaskService;
