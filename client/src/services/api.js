import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance with base URL and default headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending cookies with requests
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods for different resources
const apiService = {
  // Activities
  getActivities: (groupId) => api.get(`/groups/${groupId}/activities`),
  createActivity: (groupId, data) => api.post(`/groups/${groupId}/activities`, data),
  getActivity: (groupId, activityId) => api.get(`/groups/${groupId}/activities/${activityId}`),
  updateActivity: (groupId, activityId, data) => api.put(`/groups/${groupId}/activities/${activityId}`, data),
  deleteActivity: (groupId, activityId) => api.delete(`/groups/${groupId}/activities/${activityId}`),
  completeActivity: (groupId, activityId, username) => 
    api.post(`/groups/${groupId}/activities/${activityId}/complete`, { username }),

  // Boss Strategies
  getBossStrategies: (groupId) => api.get(`/groups/${groupId}/boss-strategies`),
  getBossStrategy: (groupId, bossName) => api.get(`/groups/${groupId}/boss-strategies/${bossName}`),
  createBossStrategy: (groupId, data) => api.post(`/groups/${groupId}/boss-strategies`, data),
  updateBossStrategy: (groupId, bossName, data) => 
    api.put(`/groups/${groupId}/boss-strategies/${bossName}`, data),
  deleteBossStrategy: (groupId, bossName) => 
    api.delete(`/groups/${groupId}/boss-strategies/${bossName}`),

  // Group Challenges
  getChallenges: (groupId) => api.get(`/groups/${groupId}/challenges`),
  createChallenge: (groupId, data) => api.post(`/groups/${groupId}/challenges`, data),
  getChallenge: (groupId, challengeId) => api.get(`/groups/${groupId}/challenges/${challengeId}`),
  updateChallenge: (groupId, challengeId, data) => 
    api.put(`/groups/${groupId}/challenges/${challengeId}`, data),
  deleteChallenge: (groupId, challengeId) => 
    api.delete(`/groups/${groupId}/challenges/${challengeId}`),
  completeChallenge: (groupId, challengeId) => 
    api.post(`/groups/${groupId}/challenges/${challengeId}/complete`),

  // Group Milestones
  getMilestones: (groupId) => api.get(`/groups/${groupId}/milestones`),
  createMilestone: (groupId, data) => api.post(`/groups/${groupId}/milestones`, data),
  getMilestone: (groupId, milestoneId) => api.get(`/groups/${groupId}/milestones/${milestoneId}`),
  updateMilestone: (groupId, milestoneId, data) => 
    api.put(`/groups/${groupId}/milestones/${milestoneId}`, data),
  deleteMilestone: (groupId, milestoneId) => 
    api.delete(`/groups/${groupId}/milestones/${milestoneId}`),
  completeMilestone: (groupId, milestoneId) => 
    api.post(`/groups/${groupId}/milestones/${milestoneId}/complete`),

  // Calendar Events
  getEvents: (groupId) => api.get(`/groups/${groupId}/events`),
  createEvent: (groupId, data) => api.post(`/groups/${groupId}/events`, data),
  getEvent: (groupId, eventId) => api.get(`/groups/${groupId}/events/${eventId}`),
  updateEvent: (groupId, eventId, data) => 
    api.put(`/groups/${groupId}/events/${eventId}`, data),
  deleteEvent: (groupId, eventId) => 
    api.delete(`/groups/${groupId}/events/${eventId}`),

  // Slayer Tasks
  getSlayerTasks: (groupId) => api.get(`/groups/${groupId}/slayer-tasks`),
  createSlayerTask: (groupId, data) => api.post(`/groups/${groupId}/slayer-tasks`, data),
  getSlayerTask: (groupId, taskId) => api.get(`/groups/${groupId}/slayer-tasks/${taskId}`),
  updateSlayerTask: (groupId, taskId, data) => 
    api.put(`/groups/${groupId}/slayer-tasks/${taskId}`, data),
  deleteSlayerTask: (groupId, taskId) => 
    api.delete(`/groups/${groupId}/slayer-tasks/${taskId}`),
  completeSlayerTask: (groupId, taskId) => 
    api.post(`/groups/${groupId}/slayer-tasks/${taskId}/complete`),

  // Valuable Drops
  getValuableDrops: (groupId) => api.get(`/groups/${groupId}/valuable-drops`),
  addValuableDrop: (groupId, data) => api.post(`/groups/${groupId}/valuable-drops`, data),
  getValuableDrop: (groupId, dropId) => api.get(`/groups/${groupId}/valuable-drops/${dropId}`),
  deleteValuableDrop: (groupId, dropId) => 
    api.delete(`/groups/${groupId}/valuable-drops/${dropId}`),

  // Plugin API
  submitPluginData: (data) => api.post('/plugin', data),

  // Health check
  healthCheck: () => api.get('/health'),
};

export default apiService;
