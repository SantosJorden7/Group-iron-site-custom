import { useState, useEffect } from 'react';
import slayerTaskData from './slayer-task-data';
import { EventBus } from '../../services/event-bus';

/**
 * Custom hook for accessing slayer task data in React components
 * @param {string} memberName - Optional member name to load data for initially
 * @returns {Object} Slayer task state and actions
 */
export function useSlayerTask(memberName = null) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load task data for a member
  const loadTask = async (name) => {
    if (!name) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const taskData = await slayerTaskData.loadMemberTask(name);
      setTask(taskData);
    } catch (err) {
      setError('Failed to load slayer task data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Submit a new task
  const submitTask = async (taskData) => {
    setLoading(true);
    setError(null);
    
    try {
      await slayerTaskData.submitTask(taskData);
      await loadTask(taskData.memberName);
    } catch (err) {
      setError('Failed to submit slayer task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Update task progress
  const updateProgress = async (name, completedAmount) => {
    setLoading(true);
    setError(null);
    
    try {
      await slayerTaskData.updateProgress(name, completedAmount);
      await loadTask(name);
    } catch (err) {
      setError('Failed to update slayer task progress');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Complete a task
  const completeTask = async (name) => {
    setLoading(true);
    setError(null);
    
    try {
      await slayerTaskData.completeTask(name);
      await loadTask(name);
    } catch (err) {
      setError('Failed to complete slayer task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Subscribe to slayer task events
  useEffect(() => {
    const taskLoadedHandler = (data) => {
      if (data.memberName === memberName) {
        setTask(data.taskData);
      }
    };
    
    const taskErrorHandler = (errorMsg) => {
      setError(errorMsg);
    };
    
    // Subscribe to events
    EventBus.subscribe('slayer-task-loaded', taskLoadedHandler);
    EventBus.subscribe('slayer-task-error', taskErrorHandler);
    
    // Initial load if member name is provided
    if (memberName) {
      loadTask(memberName);
    }
    
    // Cleanup subscriptions
    return () => {
      EventBus.unsubscribe('slayer-task-loaded', taskLoadedHandler);
      EventBus.unsubscribe('slayer-task-error', taskErrorHandler);
    };
  }, [memberName]);
  
  return {
    task,
    loading,
    error,
    loadTask,
    submitTask,
    updateProgress,
    completeTask
  };
}
