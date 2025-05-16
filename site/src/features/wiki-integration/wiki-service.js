/**
 * WikiService class
 * 
 * This service is responsible for fetching and managing wiki data.
 * It provides a centralized way to access OSRS wiki information for other components.
 */
export class WikiService {
  constructor() {
    this.content = [];
    this.isLoading = false;
    this.lastUpdated = null;
    this.error = null;
    this.subscribers = new Set();
    this.initialized = false;
  }

  /**
   * Initialize the wiki service and load initial data
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('Initializing WikiService');
    this.fetchAllData();
    this.initialized = true;
    
    // Set up periodic refresh (every 24 hours)
    setInterval(() => this.fetchAllData(), 24 * 60 * 60 * 1000);
  }

  /**
   * Subscribe to wiki service updates
   * @param {Function} callback 
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribe from wiki service updates
   * @param {Function} callback 
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of changes
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }

  /**
   * Fetch all wiki data
   */
  async fetchAllData() {
    try {
      this.isLoading = true;
      this.notifySubscribers();
      
      // In a real implementation, this would fetch data from the OSRS wiki API
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      this.content = [
        { id: 1, name: 'Abyssal whip', category: 'Weapon', examineText: 'A weapon from the Abyss.' },
        { id: 2, name: 'Dragon scimitar', category: 'Weapon', examineText: 'A vicious, curved sword.' },
        { id: 3, name: 'Bandos chestplate', category: 'Armor', examineText: 'A chestplate of Bandos.' },
        { id: 4, name: 'Zulrah', category: 'Boss', examineText: 'A deadly snake boss.' },
        { id: 5, name: 'Vorkath', category: 'Boss', examineText: 'An undead dragon.' },
        { id: 6, name: 'Barrows gloves', category: 'Gloves', examineText: 'Gloves obtained from the Culinaromancer.' },
        { id: 7, name: 'Slayer helmet', category: 'Helmet', examineText: 'A helmet that helps with Slayer tasks.' },
        { id: 8, name: 'God wars dungeon', category: 'Location', examineText: 'A dungeon full of gods and their minions.' },
        { id: 9, name: 'Super combat potion', category: 'Potion', examineText: 'A combination of super attack, strength and defence.' },
        { id: 10, name: 'Armadyl godsword', category: 'Weapon', examineText: 'A powerful godsword.' }
      ];
      
      this.lastUpdated = new Date();
      this.isLoading = false;
      this.error = null;
      this.notifySubscribers();
      
      console.log('Wiki data loaded:', this.content.length, 'items');
      return this.content;
    } catch (error) {
      console.error('Error fetching wiki data:', error);
      this.error = error.message;
      this.isLoading = false;
      this.notifySubscribers();
      throw error;
    }
  }

  /**
   * Get data for a specific item by ID
   * @param {number} id 
   * @returns {Object|null}
   */
  getItemById(id) {
    return this.content.find(item => item.id === id) || null;
  }

  /**
   * Search for items by name
   * @param {string} query 
   * @returns {Array}
   */
  searchByName(query) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return this.content.filter(item => 
      item.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Filter items by category
   * @param {string} category 
   * @returns {Array}
   */
  filterByCategory(category) {
    if (!category) return this.content;
    return this.content.filter(item => item.category === category);
  }
}

// Export a singleton instance
export default new WikiService();
