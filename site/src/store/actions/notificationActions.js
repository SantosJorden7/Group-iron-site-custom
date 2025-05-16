/**
 * Notification Actions
 * 
 * Action creators for managing notifications in the application
 */

import { ACTION_TYPES } from '../store';

/**
 * Generate a unique ID for notifications
 * @returns {string} Unique ID
 */
const generateId = () => `notification_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

/**
 * Add a notification to the store
 * @param {Object} notification - Notification object 
 * @param {string} notification.type - Type of notification (info, success, error, warning)
 * @param {string} notification.message - Notification message
 * @param {number} notification.duration - Duration in milliseconds (default: 5000)
 * @returns {Object} Action object
 */
export const addNotification = ({ type = 'info', message, duration = 5000 }) => {
  const notification = {
    id: generateId(),
    type,
    message,
    duration,
    timestamp: Date.now()
  };

  return {
    type: ACTION_TYPES.ADD_NOTIFICATION,
    payload: notification
  };
};

/**
 * Remove a notification from the store
 * @param {string} id - Notification ID 
 * @returns {Object} Action object
 */
export const removeNotification = (id) => ({
  type: ACTION_TYPES.REMOVE_NOTIFICATION,
  payload: id
});

/**
 * Add a success notification
 * @param {string} message - Notification message 
 * @param {number} duration - Duration in milliseconds (default: 5000)
 * @returns {Object} Action object
 */
export const addSuccessNotification = (message, duration = 5000) => 
  addNotification({ type: 'success', message, duration });

/**
 * Add an error notification
 * @param {string} message - Notification message 
 * @param {number} duration - Duration in milliseconds (default: 7000)
 * @returns {Object} Action object
 */
export const addErrorNotification = (message, duration = 7000) => 
  addNotification({ type: 'error', message, duration });

/**
 * Add a warning notification
 * @param {string} message - Notification message 
 * @param {number} duration - Duration in milliseconds (default: 6000)
 * @returns {Object} Action object
 */
export const addWarningNotification = (message, duration = 6000) => 
  addNotification({ type: 'warning', message, duration });

/**
 * Add an info notification
 * @param {string} message - Notification message 
 * @param {number} duration - Duration in milliseconds (default: 5000)
 * @returns {Object} Action object
 */
export const addInfoNotification = (message, duration = 5000) => 
  addNotification({ type: 'info', message, duration });
