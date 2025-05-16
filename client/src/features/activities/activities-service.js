/**
 * Activities Service
 * Contains all the business logic for the Activities feature
 */
import * as activitiesApi from './activities-api';

/**
 * Get all activities for a group with formatting and additional information
 * @param {string} groupId - The group ID
 * @returns {Promise} - Promise with formatted activities data
 */
export const getGroupActivities = async (groupId) => {
  try {
    const activitiesData = await activitiesApi.fetchGroupActivities(groupId);
    
    // Process and format the activities data
    return processActivitiesData(activitiesData);
  } catch (error) {
    console.error('Failed to get group activities:', error);
    throw error;
  }
};

/**
 * Get activities for a specific member with formatting and additional information
 * @param {string} memberName - The name of the group member
 * @returns {Promise} - Promise with formatted member activities data
 */
export const getMemberActivities = async (memberName) => {
  try {
    const activitiesData = await activitiesApi.fetchMemberActivities(memberName);
    
    // Process and format the activities data
    return processActivitiesData(activitiesData);
  } catch (error) {
    console.error(`Failed to get activities for ${memberName}:`, error);
    throw error;
  }
};

/**
 * Create a new activity for a member
 * @param {string} memberName - The name of the group member
 * @param {Object} activityData - The activity data to submit
 * @returns {Promise} - Promise with the created and formatted activity
 */
export const createActivity = async (memberName, activityData) => {
  try {
    // Validate the activity data
    validateActivityData(activityData);
    
    // Format date to ISO string if it's a Date object
    if (activityData.timestamp instanceof Date) {
      activityData.timestamp = activityData.timestamp.toISOString();
    }
    
    const createdActivity = await activitiesApi.submitActivity(memberName, activityData);
    
    // Process and format the created activity
    return {
      ...createdActivity,
      formatted_date: formatDate(createdActivity.timestamp),
      category_label: getCategoryLabel(createdActivity.category)
    };
  } catch (error) {
    console.error('Failed to create activity:', error);
    throw error;
  }
};

/**
 * Add proof to an activity
 * @param {string} activityId - The ID of the activity
 * @param {File} imageFile - The image file to upload
 * @returns {Promise} - Promise with the updated and formatted activity
 */
export const addActivityProof = async (activityId, imageFile) => {
  try {
    // Validate the image file
    validateImageFile(imageFile);
    
    const updatedActivity = await activitiesApi.uploadActivityProof(activityId, imageFile);
    
    // Process and format the updated activity
    return {
      ...updatedActivity,
      formatted_date: formatDate(updatedActivity.timestamp),
      category_label: getCategoryLabel(updatedActivity.category)
    };
  } catch (error) {
    console.error('Failed to add activity proof:', error);
    throw error;
  }
};

/**
 * Remove an activity
 * @param {string} activityId - The ID of the activity to delete
 * @returns {Promise} - Promise with deletion confirmation
 */
export const removeActivity = async (activityId) => {
  try {
    return await activitiesApi.deleteActivity(activityId);
  } catch (error) {
    console.error('Failed to remove activity:', error);
    throw error;
  }
};

/**
 * Get all activity categories
 * @returns {Promise} - Promise with formatted categories data
 */
export const getActivityCategories = async () => {
  try {
    const categories = await activitiesApi.fetchActivityCategories();
    
    // Sort categories alphabetically
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Failed to get activity categories:', error);
    throw error;
  }
};

/**
 * Filter activities by category
 * @param {Array} activities - List of activities
 * @param {string} category - Category to filter by
 * @returns {Array} - Filtered activities
 */
export const filterActivitiesByCategory = (activities, category) => {
  if (!category || category === 'all') {
    return activities;
  }
  
  return activities.filter(activity => activity.category === category);
};

/**
 * Sort activities by timestamp
 * @param {Array} activities - List of activities
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} - Sorted activities
 */
export const sortActivitiesByTimestamp = (activities, order = 'desc') => {
  return [...activities].sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

// Helper functions

/**
 * Process and format activities data
 * @param {Object} activitiesData - Raw activities data from API
 * @returns {Object} - Processed and formatted activities data
 */
const processActivitiesData = (activitiesData) => {
  if (!activitiesData || !activitiesData.activities) {
    return { activities: [], totalCount: 0 };
  }
  
  // Format each activity
  const formattedActivities = activitiesData.activities.map(activity => ({
    ...activity,
    formatted_date: formatDate(activity.timestamp),
    category_label: getCategoryLabel(activity.category)
  }));
  
  return {
    activities: formattedActivities,
    totalCount: activitiesData.totalCount || formattedActivities.length
  };
};

/**
 * Format date to a readable string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown Date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Get category label from category ID
 * @param {string} categoryId - Category ID
 * @returns {string} - Category label
 */
const getCategoryLabel = (categoryId) => {
  // This would normally be a lookup from the categories list
  // For now, just format the category ID
  if (!categoryId) return 'Uncategorized';
  
  return categoryId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Validate activity data before submission
 * @param {Object} activityData - Activity data to validate
 * @throws {Error} - If data is invalid
 */
const validateActivityData = (activityData) => {
  if (!activityData) {
    throw new Error('Activity data is required');
  }
  
  if (!activityData.title || activityData.title.trim() === '') {
    throw new Error('Activity title is required');
  }
  
  if (!activityData.category) {
    throw new Error('Activity category is required');
  }
  
  // If no timestamp is provided, one will be generated on the server
};

/**
 * Validate image file before upload
 * @param {File} imageFile - Image file to validate
 * @throws {Error} - If file is invalid
 */
const validateImageFile = (imageFile) => {
  if (!imageFile) {
    throw new Error('Image file is required');
  }
  
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validTypes.includes(imageFile.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.');
  }
  
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (imageFile.size > maxSize) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }
};
