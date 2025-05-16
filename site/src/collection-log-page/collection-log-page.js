import { BaseElement } from "../base-element/base-element";
import { storage } from "../data/storage";
import { api } from "../data/api";

// Custom element for collection log entries that we'll define and use
class CollectionLogEntry extends BaseElement {
  constructor() {
    super();
    this._entry = null;
  }
  
  set entry(val) {
    this._entry = val;
    this.render();
  }
  
  get entry() {
    return this._entry;
  }
  
  html() {
    if (!this._entry) return '<div class="collection-log-entry">No entry data</div>';
    
    return `
      <div class="collection-log-entry-content">
        <h3>${this._entry.name}</h3>
      </div>
    `;
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
}

// Define the collection-log-entry element if it doesn't exist
if (!customElements.get('collection-log-entry')) {
  customElements.define('collection-log-entry', CollectionLogEntry);
}

class CollectionLogPage extends BaseElement {
  constructor() {
    super();
    this.collectionLog = null;
    this.selectedTab = 0;
    this.selectedTabName = "";
    this.selectedEntry = null;

    // Use window.pubsub instead of importing
    if (window.pubsub) {
      window.pubsub.subscribe("items-updated", this.onItemsUpdated.bind(this));
    } else {
      console.warn("pubsub not available for collection-log-page");
    }
  }

  html() {
    return `
      <div class="collection-log-page rsbackground">
        <div class="collection-log-tabs"></div>
        <div class="collection-log-entries"></div>
        <div class="collection-log-items"></div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.getCollectionLogData();
    this.setupEventHandlers();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  setupEventHandlers() {
    // Collection log tab clicks
    const tabs = this.querySelector(".collection-log-tabs");
    if (tabs) {
      try {
        this.eventListener(tabs, "click", this.onTabClick.bind(this));
      } catch (e) {
        console.warn("Failed to add event listener to collection log tabs, using direct assignment");
        tabs.onclick = this.onTabClick.bind(this);
      }
    }

    // Collection log entry clicks
    const entries = this.querySelector(".collection-log-entries");
    if (entries) {
      try {
        this.eventListener(entries, "click", this.onEntryClick.bind(this));
      } catch (e) {
        console.warn("Failed to add event listener to collection log entries, using direct assignment");
        entries.onclick = this.onEntryClick.bind(this);
      }
    }
  }

  getCollectionLogData() {
    api.get("get-collection-log")
      .then((response) => {
        if (response.success) {
          this.collectionLog = response.data;
          this.renderTabButtons();
          // Default to the first tab
          if (this.collectionLog && this.collectionLog.tabs && this.collectionLog.tabs.length > 0) {
            this.selectTab(0, this.collectionLog.tabs[0].name);
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching collection log data", error);
      });
  }

  renderTabButtons() {
    if (!this.collectionLog) return;
    
    const tabs = this.querySelector(".collection-log-tabs");
    if (!tabs) return;
    
    tabs.innerHTML = "";
    
    this.collectionLog.tabs.forEach((tab, index) => {
      const button = document.createElement("button");
      button.className = `collection-log-tab-button ${index === this.selectedTab ? "active" : ""}`;
      button.textContent = tab.name;
      button.dataset.index = index;
      button.dataset.name = tab.name;
      tabs.appendChild(button);
    });
  }

  renderEntries() {
    if (!this.collectionLog) return;
    
    const entriesContainer = this.querySelector(".collection-log-entries");
    if (!entriesContainer) return;
    
    entriesContainer.innerHTML = "";
    
    if (this.selectedTab >= 0 && this.selectedTab < this.collectionLog.tabs.length) {
      const tab = this.collectionLog.tabs[this.selectedTab];
      
      tab.entries.forEach(entry => {
        const entryElement = document.createElement("collection-log-entry");
        entryElement.entry = entry;
        entryElement.dataset.name = entry.name;
        entryElement.className = `collection-log-entry ${entry.name === this.selectedEntry ? "active" : ""}`;
        entriesContainer.appendChild(entryElement);
      });
    }
  }

  selectTab(index, name) {
    this.selectedTab = index;
    this.selectedTabName = name;
    this.selectedEntry = null;
    
    // Update UI to reflect the selected tab
    const tabs = this.querySelectorAll(".collection-log-tab-button");
    tabs.forEach(tab => {
      tab.classList.toggle("active", parseInt(tab.dataset.index) === this.selectedTab);
    });
    
    this.renderEntries();
  }

  selectEntry(name) {
    this.selectedEntry = name;
    
    // Update UI to reflect the selected entry
    const entries = this.querySelectorAll(".collection-log-entry");
    entries.forEach(entry => {
      entry.classList.toggle("active", entry.dataset.name === this.selectedEntry);
    });
    
    // Find the selected entry in the data
    if (this.selectedTab >= 0 && this.selectedTab < this.collectionLog.tabs.length) {
      const tab = this.collectionLog.tabs[this.selectedTab];
      const entry = tab.entries.find(e => e.name === this.selectedEntry);
      
      if (entry) {
        this.renderItems(entry.items);
      }
    }
  }

  renderItems(items) {
    const itemsContainer = this.querySelector(".collection-log-items");
    if (!itemsContainer) return;
    
    itemsContainer.innerHTML = "";
    
    // Group items into rows of 4
    const itemsPerRow = 4;
    for (let i = 0; i < items.length; i += itemsPerRow) {
      const row = document.createElement("div");
      row.className = "collection-log-items-row";
      
      for (let j = i; j < i + itemsPerRow && j < items.length; j++) {
        const item = items[j];
        const itemElement = document.createElement("div");
        itemElement.className = `collection-log-item ${item.obtained ? "obtained" : ""}`;
        
        // Create the item content
        const itemContent = document.createElement("div");
        itemContent.className = "collection-log-item-content";
        
        // Item image
        const itemImage = document.createElement("img");
        itemImage.src = `/items/${item.id}.png`;
        itemImage.alt = item.name;
        itemImage.loading = "lazy";
        itemContent.appendChild(itemImage);
        
        // Item quantity (if obtained)
        if (item.obtained && item.quantity > 0) {
          const itemQuantity = document.createElement("div");
          itemQuantity.className = "collection-log-item-quantity";
          itemQuantity.textContent = item.quantity.toLocaleString();
          itemContent.appendChild(itemQuantity);
        }
        
        itemElement.appendChild(itemContent);
        row.appendChild(itemElement);
      }
      
      itemsContainer.appendChild(row);
    }
  }

  onTabClick(event) {
    const tabButton = event.target.closest(".collection-log-tab-button");
    if (tabButton) {
      const index = parseInt(tabButton.dataset.index);
      const name = tabButton.dataset.name;
      this.selectTab(index, name);
    }
  }

  onEntryClick(event) {
    const entry = event.target.closest(".collection-log-entry");
    if (entry) {
      const name = entry.dataset.name;
      this.selectEntry(name);
    }
  }

  onItemsUpdated() {
    // Refresh collection log data when items are updated
    this.getCollectionLogData();
  }
}

// Register the custom element only once (double registration check)
if (!customElements.get('collection-log-page')) {
  customElements.define("collection-log-page", CollectionLogPage);
  console.log("Successfully registered collection-log-page");
} else {
  console.log("collection-log-page already registered, skipping");
}

// This exports the component for use in React
export { CollectionLogPage };
