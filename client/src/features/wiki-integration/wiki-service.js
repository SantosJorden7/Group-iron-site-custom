/**
 * OSRS Wiki Service
 * Handles API interactions with the Old School RuneScape Wiki
 */

/**
 * A class for interacting with the OSRS Wiki API
 */
class WikiService {
  constructor() {
    this.baseUrl = 'https://oldschool.runescape.wiki/api.php';
    this.searchCache = new Map();
    this.pageCache = new Map();
    this.pageInfoCache = new Map();
    this.itemCache = new Map();
    
    // Cache expiration settings (in milliseconds)
    this.defaultCacheExpiration = 60 * 60 * 1000; // 60 minutes
    this.cacheTimestamps = {
      search: new Map(),
      page: new Map(),
      pageInfo: new Map(),
      item: new Map()
    };
    
    // Track rates to avoid excessive requests
    this.lastRequestTime = null;
    this.requestDelay = 300; // 300ms minimum delay between requests
  }

  /**
   * Check if cached data is expired
   * @param {string} cacheType - Type of cache (search, page, pageInfo, item)
   * @param {string} key - Cache key to check
   * @returns {boolean} - True if cache is expired or doesn't exist
   */
  isCacheExpired(cacheType, key) {
    const timestamp = this.cacheTimestamps[cacheType].get(key);
    if (!timestamp) return true;
    
    const now = Date.now();
    return now - timestamp > this.defaultCacheExpiration;
  }
  
  /**
   * Update cache timestamp
   * @param {string} cacheType - Type of cache (search, page, pageInfo, item)
   * @param {string} key - Cache key to update
   */
  updateCacheTimestamp(cacheType, key) {
    this.cacheTimestamps[cacheType].set(key, Date.now());
  }
  
  /**
   * Rate-limit requests to the wiki API
   * @returns {Promise} - Resolves when it's safe to make the next request
   */
  async throttleRequests() {
    if (!this.lastRequestTime) {
      this.lastRequestTime = Date.now();
      return;
    }
    
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Search the OSRS Wiki
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of results to return
   * @param {boolean} forceRefresh - Force refresh from API even if cached
   * @returns {Promise<Array>} - Search results
   */
  async search(query, limit = 10, forceRefresh = false) {
    if (!query || query.trim() === '') {
      return [];
    }

    const cacheKey = `${query}-${limit}`;
    
    // Return cached results if valid
    if (!forceRefresh && this.searchCache.has(cacheKey) && !this.isCacheExpired('search', cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    await this.throttleRequests();
    
    const params = new URLSearchParams({
      action: 'opensearch',
      search: query,
      limit: limit,
      namespace: '0',
      format: 'json',
      origin: '*'
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Wiki search failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // OpenSearch returns [query, titles, descriptions, urls]
      const results = data[1].map((title, index) => ({
        title,
        description: data[2][index] || '',
        url: data[3][index] || ''
      }));
      
      this.searchCache.set(cacheKey, results);
      this.updateCacheTimestamp('search', cacheKey);
      return results;
    } catch (error) {
      console.error('Error searching wiki:', error);
      return [];
    }
  }

  /**
   * Get full page content from the OSRS Wiki
   * @param {string} pageTitle - Wiki page title
   * @param {boolean} forceRefresh - Force refresh from API even if cached
   * @returns {Promise<Object>} - Page content
   */
  async getPage(pageTitle, forceRefresh = false) {
    // Return cached page if valid
    if (!forceRefresh && this.pageCache.has(pageTitle) && !this.isCacheExpired('page', pageTitle)) {
      return this.pageCache.get(pageTitle);
    }

    await this.throttleRequests();
    
    const params = new URLSearchParams({
      action: 'parse',
      page: pageTitle,
      format: 'json',
      origin: '*',
      prop: 'text|categories|images|sections'
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Wiki page request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wiki API error: ${data.error.info}`);
      }
      
      const pageData = {
        title: data.parse.title,
        content: data.parse.text['*'],
        categories: data.parse.categories.map(cat => cat['*']),
        images: data.parse.images,
        sections: data.parse.sections
      };
      
      this.pageCache.set(pageTitle, pageData);
      this.updateCacheTimestamp('page', pageTitle);
      return pageData;
    } catch (error) {
      console.error(`Error fetching wiki page '${pageTitle}':`, error);
      return null;
    }
  }

  /**
   * Get metadata information about a page
   * @param {string} pageTitle - Wiki page title
   * @param {boolean} forceRefresh - Force refresh from API even if cached
   * @returns {Promise<Object>} - Page info
   */
  async getPageInfo(pageTitle, forceRefresh = false) {
    // Return cached info if valid
    if (!forceRefresh && this.pageInfoCache.has(pageTitle) && !this.isCacheExpired('pageInfo', pageTitle)) {
      return this.pageInfoCache.get(pageTitle);
    }

    await this.throttleRequests();
    
    const params = new URLSearchParams({
      action: 'query',
      titles: pageTitle,
      prop: 'info|pageimages|extracts',
      inprop: 'url',
      piprop: 'thumbnail',
      pithumbsize: 300,
      exintro: 1,
      explaintext: 1,
      format: 'json',
      origin: '*'
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Wiki page info request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wiki API error: ${data.error.info}`);
      }
      
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      
      if (pageId === '-1') {
        throw new Error(`Wiki page '${pageTitle}' not found`);
      }
      
      const pageInfo = {
        pageId: page.pageid,
        title: page.title,
        url: page.fullurl,
        thumbnail: page.thumbnail ? page.thumbnail.source : null,
        extract: page.extract || ''
      };
      
      this.pageInfoCache.set(pageTitle, pageInfo);
      this.updateCacheTimestamp('pageInfo', pageTitle);
      return pageInfo;
    } catch (error) {
      console.error(`Error fetching wiki page info '${pageTitle}':`, error);
      return null;
    }
  }

  /**
   * Get item information from the OSRS Wiki
   * @param {string} itemName - Item name
   * @param {boolean} forceRefresh - Force refresh from API even if cached
   * @returns {Promise<Object>} - Item info
   */
  async getItemInfo(itemName, forceRefresh = false) {
    // Return cached item if valid
    if (!forceRefresh && this.itemCache.has(itemName) && !this.isCacheExpired('item', itemName)) {
      return this.itemCache.get(itemName);
    }

    try {
      // First get the page info
      const pageInfo = await this.getPageInfo(itemName, forceRefresh);
      if (!pageInfo) {
        return null;
      }
      
      // Then get the full page to parse the infobox
      const page = await this.getPage(itemName, forceRefresh);
      if (!page) {
        return null;
      }
      
      // Parse the infobox data
      const itemInfo = await this.parseItemInfobox(itemName, page.content);
      
      if (itemInfo) {
        itemInfo.pageInfo = pageInfo;
        this.itemCache.set(itemName, itemInfo);
        this.updateCacheTimestamp('item', itemName);
      }
      
      return itemInfo;
    } catch (error) {
      console.error(`Error fetching item info for '${itemName}':`, error);
      return null;
    }
  }

  /**
   * Parse item infobox data from HTML content
   * @param {string} html - HTML content
   * @param {string} itemName - Item name
   * @returns {Object} - Parsed item data
   */
  parseItemInfobox(html, itemName) {
    try {
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find the infobox table
      const infobox = doc.querySelector('.infobox');
      
      if (!infobox) {
        return { 
          price: 'Unknown',
          weight: 'Unknown',
          tradeable: false,
          examine: 'No examine information available'
        };
      }
      
      // Extract data
      const rows = infobox.querySelectorAll('tr');
      const data = {
        price: 'Unknown',
        weight: 'Unknown',
        tradeable: false,
        examine: 'No examine information available'
      };
      
      rows.forEach(row => {
        const header = row.querySelector('th');
        const value = row.querySelector('td');
        
        if (header && value) {
          const headerText = header.textContent.trim().toLowerCase();
          const valueText = value.textContent.trim();
          
          if (headerText.includes('price')) {
            data.price = valueText;
          } else if (headerText.includes('weight')) {
            data.weight = valueText;
          } else if (headerText.includes('tradeable')) {
            data.tradeable = valueText.toLowerCase().includes('yes');
          } else if (headerText.includes('examine')) {
            data.examine = valueText;
          }
        }
      });
      
      return data;
    } catch (error) {
      console.error(`Error parsing infobox for '${itemName}':`, error);
      return { 
        price: 'Unknown',
        weight: 'Unknown',
        tradeable: false,
        examine: 'Error parsing item data'
      };
    }
  }

  /**
   * Get popular items from OSRS Wiki
   * @returns {Promise<Array>} - Popular items
   */
  async getPopularItems() {
    try {
      // This would normally use a dedicated endpoint, but wiki doesn't provide this directly
      // For demo purposes, we'll return some hardcoded popular items
      return [
        {
          title: 'Twisted bow',
          url: 'https://oldschool.runescape.wiki/w/Twisted_bow',
          thumbnail: 'https://oldschool.runescape.wiki/images/thumb/Twisted_bow_detail.png/150px-Twisted_bow_detail.png',
          description: 'One of the most powerful weapons in OSRS'
        },
        {
          title: 'Dragon hunter lance',
          url: 'https://oldschool.runescape.wiki/w/Dragon_hunter_lance',
          thumbnail: 'https://oldschool.runescape.wiki/images/thumb/Dragon_hunter_lance_detail.png/150px-Dragon_hunter_lance_detail.png',
          description: 'Effective against dragons'
        },
        {
          title: 'Saradomin godsword',
          url: 'https://oldschool.runescape.wiki/w/Saradomin_godsword',
          thumbnail: 'https://oldschool.runescape.wiki/images/thumb/Saradomin_godsword_detail.png/150px-Saradomin_godsword_detail.png',
          description: 'A powerful godsword that heals the wielder'
        },
        {
          title: 'Bandos chestplate',
          url: 'https://oldschool.runescape.wiki/w/Bandos_chestplate',
          thumbnail: 'https://oldschool.runescape.wiki/images/thumb/Bandos_chestplate.png/130px-Bandos_chestplate.png',
          description: 'Provides excellent strength bonus'
        },
        {
          title: 'Zulrah\'s scales',
          url: 'https://oldschool.runescape.wiki/w/Zulrah%27s_scales',
          thumbnail: 'https://oldschool.runescape.wiki/images/thumb/Zulrah%27s_scales_detail.png/120px-Zulrah%27s_scales_detail.png',
          description: 'Used to charge toxic equipment'
        }
      ];
    } catch (error) {
      console.error('Error fetching popular items:', error);
      return [];
    }
  }

  /**
   * Get recent updates from OSRS Wiki
   * @param {number} limit - Maximum number of updates to return
   * @returns {Promise<Array>} - Recent updates
   */
  async getRecentUpdates(limit = 5) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'recentchanges',
      rcnamespace: '0', // Main namespace only
      rclimit: limit,
      rcprop: 'title|timestamp|user|comment',
      format: 'json',
      origin: '*'
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Wiki recent changes request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.query.recentchanges.map(change => ({
        title: change.title,
        timestamp: new Date(change.timestamp),
        user: change.user,
        comment: change.comment || 'No comment'
      }));
    } catch (error) {
      console.error('Error fetching recent wiki updates:', error);
      return [];
    }
  }

  /**
   * Clear cache for specific cache types or all if not specified
   * @param {Array<string>} cacheTypes - Types of cache to clear (search, page, pageInfo, item)
   */
  clearCache(cacheTypes = ['search', 'page', 'pageInfo', 'item']) {
    cacheTypes.forEach(type => {
      if (type === 'search') {
        this.searchCache.clear();
        this.cacheTimestamps.search.clear();
      } else if (type === 'page') {
        this.pageCache.clear();
        this.cacheTimestamps.page.clear();
      } else if (type === 'pageInfo') {
        this.pageInfoCache.clear();
        this.cacheTimestamps.pageInfo.clear();
      } else if (type === 'item') {
        this.itemCache.clear();
        this.cacheTimestamps.item.clear();
      }
    });
    
    console.log(`Wiki cache cleared for: ${cacheTypes.join(', ')}`);
  }
  
  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    return {
      search: {
        size: this.searchCache.size,
        oldest: this.getOldestCacheEntry('search'),
        newest: this.getNewestCacheEntry('search')
      },
      page: {
        size: this.pageCache.size,
        oldest: this.getOldestCacheEntry('page'),
        newest: this.getNewestCacheEntry('page')
      },
      pageInfo: {
        size: this.pageInfoCache.size,
        oldest: this.getOldestCacheEntry('pageInfo'),
        newest: this.getNewestCacheEntry('pageInfo')
      },
      item: {
        size: this.itemCache.size,
        oldest: this.getOldestCacheEntry('item'),
        newest: this.getNewestCacheEntry('item')
      }
    };
  }
  
  /**
   * Get the oldest cache entry timestamp
   * @param {string} cacheType - Type of cache
   * @returns {number} - Timestamp of oldest entry or null if empty
   */
  getOldestCacheEntry(cacheType) {
    const timestamps = Array.from(this.cacheTimestamps[cacheType].values());
    return timestamps.length > 0 ? Math.min(...timestamps) : null;
  }
  
  /**
   * Get the newest cache entry timestamp
   * @param {string} cacheType - Type of cache
   * @returns {number} - Timestamp of newest entry or null if empty
   */
  getNewestCacheEntry(cacheType) {
    const timestamps = Array.from(this.cacheTimestamps[cacheType].values());
    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  }
  
  /**
   * Update cache expiration time
   * @param {number} minutes - Minutes until cache expires
   */
  setCacheExpiration(minutes) {
    this.defaultCacheExpiration = minutes * 60 * 1000;
  }
}

// Create a singleton instance
const wikiService = new WikiService();
export default wikiService;
