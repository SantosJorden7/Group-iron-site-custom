import React, { useState, useEffect } from 'react';
import { useGroupData } from '../../hooks/group-data-hook';
import SlayerTaskService from './slayer-task-service';
import './slayer-task.css';

/**
 * Slayer Task Component
 * Displays and manages slayer tasks for group members
 */
export default function SlayerTask() {
  // Group data from the context
  const { groupData } = useGroupData();
  const [memberTasks, setMemberTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [isFormVisible, setFormVisible] = useState(false);
  const [newTask, setNewTask] = useState({
    taskMonster: '',
    taskAmount: '',
    taskMaster: '',
    taskPoints: '',
    taskLocation: ''
  });
  
  // Get member names from group data
  const memberNames = groupData?.members?.map(member => member.name) || [];
  
  // Load tasks when component mounts or selected member changes
  useEffect(() => {
    if (memberNames.length > 0 && !selectedMember) {
      setSelectedMember(memberNames[0]);
    }
    
    if (selectedMember) {
      loadMemberTask(selectedMember);
    }
  }, [selectedMember, memberNames]);
  
  /**
   * Load the slayer task for a specific member
   * @param {string} memberName - The name of the member
   */
  const loadMemberTask = async (memberName) => {
    try {
      setLoading(true);
      setError(null);
      
      const taskData = await SlayerTaskService.getSlayerTask(memberName);
      
      // Update state with the task data
      setMemberTasks(prev => ({
        ...prev,
        [memberName]: taskData
      }));
      
    } catch (err) {
      console.error('Error loading slayer task:', err);
      setError('Failed to load slayer task. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Submit a new slayer task for the selected member
   * @param {Event} e - Form submission event
   */
  const submitTask = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare task data
      const taskData = {
        memberName: selectedMember,
        taskMonster: newTask.taskMonster,
        taskAmount: parseInt(newTask.taskAmount, 10),
        taskMaster: newTask.taskMaster,
        taskPoints: parseInt(newTask.taskPoints, 10) || 0,
        taskLocation: newTask.taskLocation || ''
      };
      
      // Submit the task
      await SlayerTaskService.submitSlayerTask(taskData);
      
      // Reload the task to show the update
      await loadMemberTask(selectedMember);
      
      // Reset form and hide it
      setNewTask({
        taskMonster: '',
        taskAmount: '',
        taskMaster: '',
        taskPoints: '',
        taskLocation: ''
      });
      
      setFormVisible(false);
      
    } catch (err) {
      console.error('Error submitting slayer task:', err);
      setError('Failed to submit slayer task. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle input changes for the new task form
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Format completion percentage
   * @param {number} completed - The number of monsters completed
   * @param {number} total - The total task amount
   * @returns {string} - Formatted percentage
   */
  const formatCompletion = (completed, total) => {
    if (!completed || !total) return '0%';
    const percentage = Math.min(100, Math.round((completed / total) * 100));
    return `${percentage}%`;
  };
  
  // Get the current task for the selected member
  const currentTask = memberTasks[selectedMember];
  
  return (
    <div className="slayer-task-container">
      <h1 className="feature-title">Slayer Tasks</h1>
      
      {/* Member selector */}
      <div className="member-selector">
        <label htmlFor="memberSelect">Select Member:</label>
        <select 
          id="memberSelect"
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          disabled={loading}
        >
          {memberNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        
        <button 
          className="button-primary" 
          onClick={() => setFormVisible(true)}
          disabled={loading}
        >
          New Task
        </button>
      </div>
      
      {/* Error message */}
      {error && <div className="error-message">{error}</div>}
      
      {/* Loading indicator */}
      {loading && <div className="loading-spinner">Loading...</div>}
      
      {/* Current task display */}
      {!loading && currentTask && (
        <div className="current-task">
          <h2>Current Task</h2>
          
          {currentTask.hasTask ? (
            <>
              <div className="task-header">
                <div className="monster-name">{currentTask.taskMonster}</div>
                <div className="task-master">from {currentTask.taskMaster}</div>
              </div>
              
              <div className="task-details">
                <div className="task-progress">
                  <div className="task-amount">
                    {currentTask.taskCompletedAmount} / {currentTask.taskAmount}
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: formatCompletion(currentTask.taskCompletedAmount, currentTask.taskAmount) }}
                    ></div>
                  </div>
                  <div className="completion-percentage">
                    {formatCompletion(currentTask.taskCompletedAmount, currentTask.taskAmount)}
                  </div>
                </div>
                
                {currentTask.taskLocation && (
                  <div className="task-location">
                    <span className="location-label">Location:</span> {currentTask.taskLocation}
                  </div>
                )}
                
                <div className="task-points">
                  <span className="points-label">Points:</span> {currentTask.taskPoints}
                </div>
                
                <div className="task-assigned">
                  <span className="assigned-label">Assigned:</span> {new Date(currentTask.assignedAt).toLocaleDateString()}
                </div>
              </div>
            </>
          ) : (
            <div className="no-task-message">
              No current slayer task. Click "New Task" to add one.
            </div>
          )}
        </div>
      )}
      
      {/* Task history section */}
      {!loading && currentTask && currentTask.taskHistory && currentTask.taskHistory.length > 0 && (
        <div className="task-history">
          <h2>Task History</h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>Monster</th>
                <th>Amount</th>
                <th>Master</th>
                <th>Points</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {currentTask.taskHistory.map((task, index) => (
                <tr key={index}>
                  <td>{task.taskMonster}</td>
                  <td>{task.taskAmount}</td>
                  <td>{task.taskMaster}</td>
                  <td>{task.taskPoints}</td>
                  <td>{new Date(task.completedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* New task form modal */}
      {isFormVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>New Slayer Task for {selectedMember}</h2>
              <button 
                className="close-button"
                onClick={() => setFormVisible(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={submitTask} className="task-form">
              <div className="form-group">
                <label htmlFor="taskMonster">Monster:</label>
                <input
                  id="taskMonster"
                  name="taskMonster"
                  type="text"
                  required
                  value={newTask.taskMonster}
                  onChange={handleInputChange}
                  placeholder="e.g., Abyssal demons"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="taskAmount">Amount:</label>
                <input
                  id="taskAmount"
                  name="taskAmount"
                  type="number"
                  required
                  min="1"
                  value={newTask.taskAmount}
                  onChange={handleInputChange}
                  placeholder="e.g., 150"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="taskMaster">Slayer Master:</label>
                <select
                  id="taskMaster"
                  name="taskMaster"
                  required
                  value={newTask.taskMaster}
                  onChange={handleInputChange}
                >
                  <option value="">Select Slayer Master</option>
                  <option value="Turael">Turael</option>
                  <option value="Krystilia">Krystilia</option>
                  <option value="Mazchna">Mazchna</option>
                  <option value="Vannaka">Vannaka</option>
                  <option value="Chaeldar">Chaeldar</option>
                  <option value="Konar">Konar</option>
                  <option value="Nieve">Nieve</option>
                  <option value="Duradel">Duradel</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="taskPoints">Points:</label>
                <input
                  id="taskPoints"
                  name="taskPoints"
                  type="number"
                  min="0"
                  value={newTask.taskPoints}
                  onChange={handleInputChange}
                  placeholder="e.g., 15"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="taskLocation">Location (optional):</label>
                <input
                  id="taskLocation"
                  name="taskLocation"
                  type="text"
                  value={newTask.taskLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., Slayer Tower"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="button-primary">
                  Submit Task
                </button>
                <button 
                  type="button" 
                  className="button-secondary"
                  onClick={() => setFormVisible(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
