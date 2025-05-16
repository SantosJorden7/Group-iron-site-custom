/**
 * Custom Routes for Group Ironmen Extensions
 * Contains all custom API endpoints for the Slayer Tasks and Valuable Drops features
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Mock data stores
const mockSlayerTasks = [];
const mockSlayerStats = {};
const mockValuableDrops = [];
let nextDropId = 1;
let nextTaskId = 1;

// Apply authentication middleware to all routes
router.use(authMiddleware);

//=========================================
// SLAYER TASK ENDPOINTS
//=========================================

/**
 * GET /custom/slayer-task/:memberName
 * Retrieves the current slayer task, history, and stats for a member
 */
router.get('/slayer-task/:memberName', (req, res) => {
  const { memberName } = req.params;
  
  // Get current task (not completed)
  const currentTask = mockSlayerTasks.find(
    task => task.member_name === memberName && !task.is_complete
  );
  
  // Get task history (completed tasks)
  const taskHistory = mockSlayerTasks
    .filter(task => task.member_name === memberName && task.is_complete)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 10);
  
  // Get slayer stats
  const stats = mockSlayerStats[memberName] || { slayer_points: 0, task_streak: 0 };
  
  const response = {
    member_name: memberName,
    current_task: currentTask || null,
    task_history: taskHistory || [],
    slayer_points: stats.slayer_points,
    task_streak: stats.task_streak
  };
  
  res.json(response);
});

/**
 * POST /custom/slayer-task/:memberName
 * Creates a new slayer task for a member
 */
router.post('/slayer-task/:memberName', (req, res) => {
  const { memberName } = req.params;
  const { monster_name, quantity, slayer_master, is_boss_task = false } = req.body;
  
  // Validate request body
  if (!monster_name || !quantity || !slayer_master) {
    return res.status(400).json({ error: 'Missing required task information' });
  }
  
  // Check if there's already an active task
  const activeTask = mockSlayerTasks.find(
    task => task.member_name === memberName && !task.is_complete
  );
  
  if (activeTask) {
    return res.status(400).json({ error: 'Member already has an active slayer task' });
  }
  
  // Create new task
  const newTask = {
    task_id: nextTaskId++,
    member_name: memberName,
    monster_name,
    quantity: parseInt(quantity, 10),
    slayer_master,
    is_boss_task,
    is_complete: false,
    assigned_at: new Date().toISOString(),
    completed_at: null
  };
  
  mockSlayerTasks.push(newTask);
  
  res.status(201).json(newTask);
});

/**
 * PUT /custom/slayer-task/:memberName/complete
 * Marks a slayer task as complete
 */
router.put('/slayer-task/:memberName/complete', (req, res) => {
  const { memberName } = req.params;
  
  // Get current task
  const taskIndex = mockSlayerTasks.findIndex(
    task => task.member_name === memberName && !task.is_complete
  );
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'No active slayer task found' });
  }
  
  const task = mockSlayerTasks[taskIndex];
  
  // Mark task as complete
  task.is_complete = true;
  task.completed_at = new Date().toISOString();
  
  // Update slayer stats
  if (!mockSlayerStats[memberName]) {
    mockSlayerStats[memberName] = { slayer_points: 0, task_streak: 0 };
  }
  
  const stats = mockSlayerStats[memberName];
  
  // Calculate points based on slayer master and streak
  let pointsToAdd = 15; // Default points
  if (task.slayer_master === 'Konar') {
    pointsToAdd = 20;
  } else if (task.slayer_master === 'Nieve' || task.slayer_master === 'Steve') {
    pointsToAdd = 15;
  } else if (task.slayer_master === 'Duradel') {
    pointsToAdd = 20;
  }
  
  // Bonus for milestone tasks
  const newStreak = stats.task_streak + 1;
  if (newStreak % 10 === 0) {
    pointsToAdd += 25;
  } else if (newStreak % 50 === 0) {
    pointsToAdd += 75;
  } else if (newStreak % 100 === 0) {
    pointsToAdd += 150;
  } else if (newStreak % 250 === 0) {
    pointsToAdd += 300;
  } else if (newStreak % 1000 === 0) {
    pointsToAdd += 500;
  }
  
  stats.slayer_points += pointsToAdd;
  stats.task_streak = newStreak;
  
  res.json({
    task: mockSlayerTasks[taskIndex],
    message: 'Task completed successfully'
  });
});

/**
 * GET /custom/slayer-stats/group
 * Retrieves slayer statistics for the entire group
 */
router.get('/slayer-stats/group', (req, res) => {
  const memberStats = Object.keys(mockSlayerStats).map(memberName => {
    const stats = mockSlayerStats[memberName];
    const tasksCompleted = mockSlayerTasks.filter(
      task => task.member_name === memberName && task.is_complete
    ).length;
    
    return {
      member_name: memberName,
      slayer_points: stats.slayer_points,
      task_streak: stats.task_streak,
      tasks_completed: tasksCompleted
    };
  }).sort((a, b) => b.slayer_points - a.slayer_points);
  
  // Calculate group totals
  const totalPoints = memberStats.reduce((sum, member) => sum + member.slayer_points, 0);
  const totalTasksCompleted = memberStats.reduce((sum, member) => sum + member.tasks_completed, 0);
  const highestStreak = memberStats.length > 0 
    ? Math.max(...memberStats.map(member => member.task_streak))
    : 0;
  
  res.json({
    members: memberStats,
    total_points: totalPoints,
    total_tasks_completed: totalTasksCompleted,
    highest_streak: highestStreak
  });
});

//=========================================
// VALUABLE DROPS ENDPOINTS
//=========================================

/**
 * Helper function to format currency values
 */
function formatGp(value) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M gp`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K gp`;
  } else {
    return `${value} gp`;
  }
}

/**
 * GET /custom/valuable-drops
 * Retrieves valuable drops with optional filtering and sorting
 */
router.get('/valuable-drops', (req, res) => {
  // Parse query parameters for filtering and sorting
  const {
    member,
    minValue,
    maxValue,
    itemName,
    source,
    sortBy = 'timestamp',
    sortDirection = 'desc',
    limit = 20,
    offset = 0
  } = req.query;
  
  // Filter drops based on query parameters
  let filteredDrops = [...mockValuableDrops];
  
  if (member) {
    filteredDrops = filteredDrops.filter(drop => 
      drop.member_name.toLowerCase() === member.toLowerCase()
    );
  }
  
  if (minValue) {
    const minValueNum = parseInt(minValue, 10);
    filteredDrops = filteredDrops.filter(drop => drop.item_value >= minValueNum);
  }
  
  if (maxValue) {
    const maxValueNum = parseInt(maxValue, 10);
    filteredDrops = filteredDrops.filter(drop => drop.item_value <= maxValueNum);
  }
  
  if (itemName) {
    filteredDrops = filteredDrops.filter(drop => 
      drop.item_name.toLowerCase().includes(itemName.toLowerCase())
    );
  }
  
  if (source) {
    filteredDrops = filteredDrops.filter(drop => 
      drop.source_name && drop.source_name.toLowerCase().includes(source.toLowerCase())
    );
  }
  
  // Sort drops
  filteredDrops.sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'timestamp') {
      comparison = new Date(a.timestamp) - new Date(b.timestamp);
    } else if (sortBy === 'item_value') {
      comparison = a.item_value - b.item_value;
    } else if (sortBy === 'item_quantity') {
      comparison = a.item_quantity - b.item_quantity;
    } else {
      comparison = a[sortBy] < b[sortBy] ? -1 : (a[sortBy] > b[sortBy] ? 1 : 0);
    }
    
    return sortDirection.toLowerCase() === 'asc' ? comparison : -comparison;
  });
  
  // Format values for display
  const formattedDrops = filteredDrops.map(drop => ({
    ...drop,
    formatted_value: formatGp(drop.item_value),
    formatted_total_value: formatGp(drop.item_value * drop.item_quantity),
    formatted_date: new Date(drop.timestamp).toLocaleDateString()
  }));
  
  // Paginate results
  const paginatedDrops = formattedDrops.slice(
    parseInt(offset, 10),
    parseInt(offset, 10) + parseInt(limit, 10)
  );
  
  res.json({
    drops: paginatedDrops,
    pagination: {
      total_count: filteredDrops.length,
      offset: parseInt(offset, 10),
      limit: parseInt(limit, 10)
    }
  });
});

/**
 * POST /custom/valuable-drops
 * Creates a new valuable drop record
 */
router.post('/valuable-drops', (req, res) => {
  const { 
    member_name, 
    item_id, 
    item_name, 
    item_value, 
    item_quantity = 1, 
    source_name,
    x_coord,
    y_coord,
    z_coord
  } = req.body;
  
  // Validate request body
  if (!member_name || !item_id || !item_name || !item_value) {
    return res.status(400).json({ error: 'Missing required drop information' });
  }
  
  // Create new drop record
  const newDrop = {
    drop_id: nextDropId++,
    member_name,
    item_id: parseInt(item_id, 10),
    item_name,
    item_value: parseInt(item_value, 10),
    item_quantity: parseInt(item_quantity, 10),
    source_name: source_name || null,
    x_coord: x_coord || null,
    y_coord: y_coord || null,
    z_coord: z_coord || null,
    timestamp: new Date().toISOString(),
    formatted_value: formatGp(parseInt(item_value, 10)),
    formatted_total_value: formatGp(parseInt(item_value, 10) * parseInt(item_quantity, 10)),
    formatted_date: new Date().toLocaleDateString()
  };
  
  mockValuableDrops.push(newDrop);
  
  res.status(201).json(newDrop);
});

/**
 * DELETE /custom/valuable-drops/:dropId
 * Deletes a valuable drop record
 */
router.delete('/valuable-drops/:dropId', (req, res) => {
  const { dropId } = req.params;
  const dropIndex = mockValuableDrops.findIndex(drop => drop.drop_id === parseInt(dropId, 10));
  
  if (dropIndex === -1) {
    return res.status(404).json({ error: 'Valuable drop not found' });
  }
  
  // Remove the drop
  mockValuableDrops.splice(dropIndex, 1);
  
  res.json({ 
    success: true, 
    message: 'Valuable drop deleted successfully',
    drop_id: parseInt(dropId, 10)
  });
});

/**
 * GET /custom/valuable-drops/stats
 * Retrieves valuable drop statistics for the group
 */
router.get('/valuable-drops/stats', (req, res) => {
  if (mockValuableDrops.length === 0) {
    return res.json({
      total_drops: 0,
      total_value: 0,
      average_value: 0,
      highest_value: 0,
      highest_value_item: null,
      formatted_total_value: '0 gp',
      formatted_average_value: '0 gp',
      formatted_highest_value: '0 gp',
      member_stats: []
    });
  }
  
  // Calculate group statistics
  const totalDrops = mockValuableDrops.length;
  const totalValue = mockValuableDrops.reduce(
    (sum, drop) => sum + (drop.item_value * drop.item_quantity), 0
  );
  const averageValue = totalDrops > 0 ? totalValue / totalDrops : 0;
  
  // Find highest value drop
  const highestValueDrop = [...mockValuableDrops].sort((a, b) => b.item_value - a.item_value)[0];
  
  // Get unique members
  const members = [...new Set(mockValuableDrops.map(drop => drop.member_name))];
  
  // Calculate per-member statistics
  const memberStats = members.map(memberName => {
    const memberDrops = mockValuableDrops.filter(drop => drop.member_name === memberName);
    const dropCount = memberDrops.length;
    const memberTotalValue = memberDrops.reduce(
      (sum, drop) => sum + (drop.item_value * drop.item_quantity), 0
    );
    const memberAverageValue = dropCount > 0 ? memberTotalValue / dropCount : 0;
    
    // Find member's best drop
    const bestDrop = dropCount > 0 
      ? [...memberDrops].sort((a, b) => b.item_value - a.item_value)[0]
      : null;
    
    return {
      member_name: memberName,
      drop_count: dropCount,
      total_value: memberTotalValue,
      average_value: memberAverageValue,
      highest_value: bestDrop ? bestDrop.item_value : 0,
      best_drop: bestDrop,
      formatted_total_value: formatGp(memberTotalValue),
      formatted_average_value: formatGp(memberAverageValue),
      formatted_highest_value: bestDrop ? formatGp(bestDrop.item_value) : '0 gp'
    };
  }).sort((a, b) => b.total_value - a.total_value);
  
  res.json({
    total_drops: totalDrops,
    total_value: totalValue,
    average_value: averageValue,
    highest_value: highestValueDrop.item_value,
    highest_value_item: highestValueDrop.item_name,
    formatted_total_value: formatGp(totalValue),
    formatted_average_value: formatGp(averageValue),
    formatted_highest_value: formatGp(highestValueDrop.item_value),
    member_stats: memberStats
  });
});

// Add some sample data
function addSampleData() {
  // Sample members
  const members = ['Zezima', 'Woox', 'B0aty', 'Lynx Titan'];
  
  // Sample slayer tasks
  const slayerMasters = ['Konar', 'Duradel', 'Nieve', 'Steve', 'Krystilia'];
  const monsters = ['Abyssal Demons', 'Hydras', 'Greater Demons', 'Hellhounds', 'Black Demons', 'Blue Dragons', 'Kalphites', 'Nechryaels', 'Smoke Devils', 'Trolls'];
  
  // Add sample slayer tasks
  members.forEach(member => {
    // Add completed tasks
    for (let i = 0; i < 5; i++) {
      const taskDate = new Date();
      taskDate.setDate(taskDate.getDate() - (i * 2));
      
      mockSlayerTasks.push({
        task_id: nextTaskId++,
        member_name: member,
        monster_name: monsters[Math.floor(Math.random() * monsters.length)],
        quantity: Math.floor(Math.random() * 150) + 50,
        slayer_master: slayerMasters[Math.floor(Math.random() * slayerMasters.length)],
        is_boss_task: Math.random() > 0.8,
        is_complete: true,
        assigned_at: new Date(taskDate.getTime() - 86400000).toISOString(),
        completed_at: taskDate.toISOString()
      });
    }
    
    // Some members have current tasks
    if (Math.random() > 0.3) {
      mockSlayerTasks.push({
        task_id: nextTaskId++,
        member_name: member,
        monster_name: monsters[Math.floor(Math.random() * monsters.length)],
        quantity: Math.floor(Math.random() * 150) + 50,
        slayer_master: slayerMasters[Math.floor(Math.random() * slayerMasters.length)],
        is_boss_task: Math.random() > 0.8,
        is_complete: false,
        assigned_at: new Date().toISOString(),
        completed_at: null
      });
    }
    
    // Add slayer stats
    mockSlayerStats[member] = {
      slayer_points: Math.floor(Math.random() * 1000) + 100,
      task_streak: Math.floor(Math.random() * 50) + 1
    };
  });
  
  // Sample valuable drops
  const items = [
    { name: 'Dragon Warhammer', value: 45000000 },
    { name: 'Abyssal Whip', value: 1500000 },
    { name: 'Bandos Chestplate', value: 18000000 },
    { name: 'Ranger Boots', value: 37000000 },
    { name: 'Armadyl Crossbow', value: 30000000 },
    { name: 'Zenyte Shard', value: 13000000 },
    { name: 'Draconic Visage', value: 5000000 },
    { name: 'Staff of the Dead', value: 8000000 },
    { name: 'Primordial Crystal', value: 25000000 },
    { name: 'Pegasian Crystal', value: 18000000 }
  ];
  
  const sources = ['Corporeal Beast', 'Abyssal Sire', 'General Graardor', 'Kree\'arra', 'Zulrah', 'Alchemical Hydra', 'Vorkath', 'Medium Clue', 'Cerberus', 'Kraken'];
  
  // Add sample valuable drops
  for (let i = 0; i < 25; i++) {
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
    
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const randomMember = members[Math.floor(Math.random() * members.length)];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const randomQuantity = Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 2 : 1;
    
    mockValuableDrops.push({
      drop_id: nextDropId++,
      member_name: randomMember,
      item_id: 10000 + i,
      item_name: randomItem.name,
      item_value: randomItem.value,
      item_quantity: randomQuantity,
      source_name: randomSource,
      x_coord: Math.floor(Math.random() * 5000),
      y_coord: Math.floor(Math.random() * 5000),
      z_coord: Math.floor(Math.random() * 3),
      timestamp: randomDate.toISOString(),
      formatted_value: formatGp(randomItem.value),
      formatted_total_value: formatGp(randomItem.value * randomQuantity),
      formatted_date: randomDate.toLocaleDateString()
    });
  }
}

// Initialize sample data
addSampleData();

module.exports = router;
