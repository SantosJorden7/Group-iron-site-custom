/**
 * Group Ironmen Mock API Server
 * 
 * This Express server mocks the custom API endpoints for testing
 * the Slayer Task and Valuable Drops features.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Import mock data
const slayerTasksData = require('./data/slayer-tasks.json');
const valuableDropsData = require('./data/valuable-drops.json');

// Initialize Express app
const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Authentication middleware (simplified)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Valid authentication token required'
    });
  }
  
  // In a real environment, we'd validate the token
  // For testing, we'll accept any token
  req.groupId = 1; // Mock group ID
  next();
};

// Helper function to save data to JSON files
const saveData = (filename, data) => {
  fs.writeFileSync(
    path.join(__dirname, 'data', filename),
    JSON.stringify(data, null, 2)
  );
};

// API Routes

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Group Ironmen Mock API Server',
    version: '1.0.0',
    endpoints: [
      '/custom/slayer-task/:member_name',
      '/custom/valuable-drops'
    ]
  });
});

// =========== SLAYER TASK API ROUTES ===========

// Get slayer task for a member
app.get('/custom/slayer-task/:member_name', authMiddleware, (req, res) => {
  const { member_name } = req.params;
  
  // Check if member exists
  if (!slayerTasksData.members[member_name]) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Member '${member_name}' not found`
    });
  }
  
  // Get member's task data
  const memberData = slayerTasksData.members[member_name];
  
  // Find current task (first task that is not complete)
  const currentTask = memberData.tasks.find(task => !task.is_complete);
  
  // Get task history (all completed tasks, sorted by completion date)
  const taskHistory = memberData.tasks
    .filter(task => task.is_complete)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
  
  res.json({
    member_name,
    current_task: currentTask || null,
    task_history: taskHistory,
    slayer_points: memberData.slayer_points,
    task_streak: memberData.task_streak
  });
});

// Submit a slayer task for a member
app.post('/custom/slayer-task/:member_name', authMiddleware, (req, res) => {
  const { member_name } = req.params;
  const taskSubmission = req.body;
  
  // Validate request body
  if (!taskSubmission.monster_name || !taskSubmission.quantity || !taskSubmission.slayer_master) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required fields: monster_name, quantity, and slayer_master are required'
    });
  }
  
  // Check if member exists
  if (!slayerTasksData.members[member_name]) {
    // Create new member if not exists
    slayerTasksData.members[member_name] = {
      tasks: [],
      slayer_points: 0,
      task_streak: 0
    };
  }
  
  const memberData = slayerTasksData.members[member_name];
  
  // Complete any current task
  let completedPrevious = false;
  const currentTaskIndex = memberData.tasks.findIndex(task => !task.is_complete);
  
  if (currentTaskIndex !== -1) {
    memberData.tasks[currentTaskIndex].is_complete = true;
    memberData.tasks[currentTaskIndex].completed_at = new Date().toISOString();
    completedPrevious = true;
  }
  
  // Create new task
  const newTask = {
    task_id: Date.now(), // Use timestamp as ID
    monster_name: taskSubmission.monster_name,
    quantity: taskSubmission.quantity,
    slayer_master: taskSubmission.slayer_master,
    is_complete: false,
    is_boss_task: taskSubmission.is_boss_task || false,
    assigned_at: new Date().toISOString(),
    completed_at: null
  };
  
  // Add task to member's tasks
  memberData.tasks.push(newTask);
  
  // Update stats if provided
  if (taskSubmission.task_streak !== undefined) {
    memberData.task_streak = taskSubmission.task_streak;
  }
  
  if (taskSubmission.slayer_points !== undefined) {
    memberData.slayer_points = taskSubmission.slayer_points;
  }
  
  // Save updated data
  saveData('slayer-tasks.json', slayerTasksData);
  
  res.json({
    status: 'success',
    message: 'Slayer task updated successfully',
    task_id: newTask.task_id,
    completed_previous: completedPrevious
  });
});

// =========== VALUABLE DROPS API ROUTES ===========

// Get valuable drops
app.get('/custom/valuable-drops', authMiddleware, (req, res) => {
  const {
    member_name,
    min_value,
    max_value,
    source_name,
    sort = 'timestamp',
    direction = 'desc',
    limit = 20,
    offset = 0
  } = req.query;
  
  let drops = [...valuableDropsData.drops];
  
  // Apply filters
  if (member_name) {
    drops = drops.filter(drop => drop.member_name === member_name);
  }
  
  if (min_value) {
    drops = drops.filter(drop => drop.item_value >= parseInt(min_value));
  }
  
  if (max_value) {
    drops = drops.filter(drop => drop.item_value <= parseInt(max_value));
  }
  
  if (source_name) {
    drops = drops.filter(drop => drop.source_name.toLowerCase().includes(source_name.toLowerCase()));
  }
  
  // Count total (for pagination) before applying limit/offset
  const totalCount = drops.length;
  
  // Apply sorting
  if (sort && direction) {
    drops.sort((a, b) => {
      let valueA = a[sort];
      let valueB = b[sort];
      
      if (sort === 'timestamp') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      if (direction === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }
  
  // Apply pagination
  const paginatedDrops = drops.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json({
    drops: paginatedDrops,
    pagination: {
      total_count: totalCount,
      offset: parseInt(offset),
      limit: parseInt(limit),
      has_more: parseInt(offset) + parseInt(limit) < totalCount
    }
  });
});

// Add a valuable drop
app.post('/custom/valuable-drops', authMiddleware, (req, res) => {
  const dropData = req.body;
  
  // Validate request body
  if (!dropData.member_name || !dropData.item_id || !dropData.item_name || 
      !dropData.item_value || !dropData.source_name) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required fields: member_name, item_id, item_name, item_value, and source_name are required'
    });
  }
  
  // Create new drop
  const newDrop = {
    drop_id: Date.now(), // Use timestamp as ID
    member_name: dropData.member_name,
    item_id: dropData.item_id,
    item_name: dropData.item_name,
    item_quantity: dropData.item_quantity || 1,
    item_value: dropData.item_value,
    total_value: dropData.item_value * (dropData.item_quantity || 1),
    source_name: dropData.source_name,
    x_coord: dropData.x_coord || null,
    y_coord: dropData.y_coord || null,
    z_coord: dropData.z_coord || null,
    timestamp: dropData.timestamp || new Date().toISOString()
  };
  
  // Add drop to the data
  valuableDropsData.drops.push(newDrop);
  
  // Save updated data
  saveData('valuable-drops.json', valuableDropsData);
  
  res.json({
    status: 'success',
    message: 'Valuable drop added successfully',
    drop_id: newDrop.drop_id
  });
});

// Delete a valuable drop
app.delete('/custom/valuable-drops/:drop_id', authMiddleware, (req, res) => {
  const { drop_id } = req.params;
  const dropIdNum = parseInt(drop_id);
  
  // Find drop index
  const dropIndex = valuableDropsData.drops.findIndex(drop => drop.drop_id === dropIdNum);
  
  if (dropIndex === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Drop with ID ${drop_id} not found`
    });
  }
  
  // Remove drop
  valuableDropsData.drops.splice(dropIndex, 1);
  
  // Save updated data
  saveData('valuable-drops.json', valuableDropsData);
  
  res.json({
    status: 'success',
    message: `Drop with ID ${drop_id} deleted successfully`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Group Ironmen Mock API Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /custom/slayer-task/:member_name');
  console.log('  POST /custom/slayer-task/:member_name');
  console.log('  GET /custom/valuable-drops');
  console.log('  POST /custom/valuable-drops');
  console.log('  DELETE /custom/valuable-drops/:drop_id');
});
