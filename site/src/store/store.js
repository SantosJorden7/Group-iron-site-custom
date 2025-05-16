/**
 * Redux-like central store implementation
 * 
 * This is a simple implementation of a Redux-like store pattern
 * for managing application state without the full Redux dependency
 */

// Initial state for the application
const initialState = {
  notifications: [],
  playerData: {},
  groupData: null,
  settings: {
    valuableDropThreshold: 50000,
    refreshInterval: 5 * 60 * 1000,
    theme: 'dark',
    showNotifications: true
  }
};

// Action types
export const ACTION_TYPES = {
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  UPDATE_PLAYER_DATA: 'UPDATE_PLAYER_DATA',
  UPDATE_GROUP_DATA: 'UPDATE_GROUP_DATA',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
};

// Reducer function to handle state updates
function reducer(state = initialState, action) {
  switch (action.type) {
    case ACTION_TYPES.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    
    case ACTION_TYPES.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case ACTION_TYPES.UPDATE_PLAYER_DATA:
      return {
        ...state,
        playerData: {
          ...state.playerData,
          [action.payload.playerName]: action.payload.data
        }
      };
    
    case ACTION_TYPES.UPDATE_GROUP_DATA:
      return {
        ...state,
        groupData: action.payload
      };
    
    case ACTION_TYPES.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
    
    default:
      return state;
  }
}

// Store implementation
class Store {
  constructor() {
    this.state = initialState;
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  dispatch(action) {
    this.state = reducer(this.state, action);
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Create and export a singleton instance
export const store = new Store();
