/**
 * SlayerTaskData
 * 
 * Data management class for the slayer task feature
 * Handles loading, caching, and organizing slayer task data
 */

import SlayerTaskService from './slayer-task-service';
import { EventBus } from '../../services/event-bus.js';

class SlayerTaskData {
  constructor() {
    this.memberTasks = {};
    this.loading = false;
    this.error = null;
    
    // Subscribe to relevant events
    EventBus.on('player-data-updated', this.refreshData.bind(this));
    EventBus.on('custom-plugin-data-received', this.handlePluginData.bind(this));
  }
  
  /**
   * Load the slayer task for a specific member
   * @param {string} memberName - The member's name
   * @returns {Promise<Object>} - The member's slayer task data
   */
  async loadMemberTask(memberName) {
    try {
      this.loading = true;
      this.error = null;
      
      const taskData = await SlayerTaskService.getSlayerTask(memberName);
      
      // Update cache
      this.memberTasks[memberName] = taskData;
      
      // Notify subscribers
      EventBus.publish('slayer-task-loaded', { memberName, taskData });
      
      return taskData;
    } catch (err) {
      console.error('Error loading slayer task:', err);
      this.error = 'Failed to load slayer task data. Please try again later.';
      EventBus.publish('slayer-task-error', this.error);
      throw err;
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Submit a new slayer task for a member
   * @param {Object} taskData - The slayer task data
   * @returns {Promise<Object>} - API response
   */
  async submitTask(taskData) {
    try {
      const response = await SlayerTaskService.submitSlayerTask(taskData);
      
      // Refresh task data
      await this.loadMemberTask(taskData.memberName);
      
      // Notify subscribers
      EventBus.publish('slayer-task-submitted', { memberName: taskData.memberName });
      
      return response;
    } catch (err) {
      console.error('Error submitting slayer task:', err);
      this.error = 'Failed to submit the slayer task. Please try again later.';
      EventBus.publish('slayer-task-error', this.error);
      throw err;
    }
  }
  
  /**
   * Update the progress of a slayer task
   * @param {string} memberName - The member's name
   * @param {number} completedAmount - The amount of the task completed
   * @returns {Promise<Object>} - API response
   */
  async updateProgress(memberName, completedAmount) {
    try {
      const response = await SlayerTaskService.updateTaskProgress(memberName, completedAmount);
      
      // Refresh task data
      await this.loadMemberTask(memberName);
      
      // Notify subscribers
      EventBus.publish('slayer-task-updated', { memberName });
      
      return response;
    } catch (err) {
      console.error('Error updating slayer task progress:', err);
      this.error = 'Failed to update the slayer task progress. Please try again later.';
      EventBus.publish('slayer-task-error', this.error);
      throw err;
    }
  }
  
  /**
   * Mark a slayer task as completed
   * @param {string} memberName - The member's name
   * @returns {Promise<Object>} - API response
   */
  async completeTask(memberName) {
    try {
      const response = await SlayerTaskService.completeTask(memberName);
      
      // Refresh task data
      await this.loadMemberTask(memberName);
      
      // Notify subscribers
      EventBus.publish('slayer-task-completed', { memberName });
      
      return response;
    } catch (err) {
      console.error('Error completing slayer task:', err);
      this.error = 'Failed to complete the slayer task. Please try again later.';
      EventBus.publish('slayer-task-error', this.error);
      throw err;
    }
  }
  
  /**
   * Get cached task data for a member
   * @param {string} memberName - The member's name
   * @returns {Object|null} - The cached task data or null if not found
   */
  getCachedTask(memberName) {
    return this.memberTasks[memberName] || null;
  }
  
  /**
   * Refresh data when player data is updated
   * This will only refresh data that was previously loaded
   */
  async refreshData() {
    const members = Object.keys(this.memberTasks);
    
    // Only refresh data for members that were already loaded
    if (members.length > 0) {
      for (const memberName of members) {
        await this.loadMemberTask(memberName);
      }
    }
  }
  
  /**
   * Handle plugin data related to slayer tasks
   * @param {Object} pluginData - Custom plugin data
   */
  async handlePluginData(pluginData) {
    // If the plugin sends slayer task related data, refresh our data
    if (pluginData?.type === 'slayer-task' && pluginData?.memberName) {
      await this.loadMemberTask(pluginData.memberName);
    }
  }
  
  /**
   * Create a singleton instance
   * @returns {SlayerTaskData} - Singleton instance
   */
  static getInstance() {
    if (!SlayerTaskData.instance) {
      SlayerTaskData.instance = new SlayerTaskData();
    }
    return SlayerTaskData.instance;
  }
}

// Export as a singleton
export default SlayerTaskData.getInstance();
