import { BaseElement } from "../base-element/base-element";

class PlayerStats extends BaseElement {
  constructor() {
    super();
    this.hitpoints = { current: 1, max: 1 };
    this.prayer = { current: 1, max: 1 };
    this.energy = { current: 1, max: 1 };
    this.world = 301;
  }

  html() {
    return /*html*/`
      <div class="player-stats rsbackground">
        <div class="player-stats__world">W${this.world}</div>
        <div class="player-stats__hitpoints">
          <div class="player-stats__stat-label">Hitpoints</div>
          <div class="stat-bar player-stats__hitpoints-bar">
            <div class="stat-bar__fill"></div>
          </div>
          <div class="player-stats__hitpoints-numbers">${this.hitpoints.current} / ${this.hitpoints.max}</div>
        </div>
        <div class="player-stats__prayer">
          <div class="player-stats__stat-label">Prayer</div>
          <div class="stat-bar player-stats__prayer-bar">
            <div class="stat-bar__fill"></div>
          </div>
          <div class="player-stats__prayer-numbers">${this.prayer.current} / ${this.prayer.max}</div>
        </div>
        <div class="player-stats__energy">
          <div class="player-stats__stat-label">Run Energy</div>
          <div class="stat-bar player-stats__energy-bar">
            <div class="stat-bar__fill"></div>
          </div>
          <div class="player-stats__energy-numbers">${this.energy.current} / ${this.energy.max}</div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Initialize stat bar elements
    this.initializeStatBars();
    
    // Subscribe to events
    this.subscribe("updated-stats", this.handleUpdatedStats);
    this.subscribe("member-went-inactive", this.handleWentInactive);
    this.subscribe("member-went-active", this.handleWentActive);
  }
  
  // Initialize stat bar elements and their update methods
  initializeStatBars() {
    // Get references to the stat bar elements
    this.hitpointsBar = this.querySelector('.player-stats__hitpoints-bar');
    this.prayerBar = this.querySelector('.player-stats__prayer-bar');
    this.energyBar = this.querySelector('.player-stats__energy-bar');
    
    // Create safe update method for each bar
    this.createStatBarUpdateMethods();
    
    // Store reference to world element
    this.worldEl = this.querySelector('.player-stats__world');
  }
  
  // Create update methods for stat bars
  createStatBarUpdateMethods() {
    // Define a safe update function for each bar
    const createSafeUpdate = (barElement) => {
      // If the bar element exists, return a function that updates its fill width
      if (barElement) {
        const fill = barElement.querySelector('.stat-bar__fill');
        if (fill) {
          return (ratio) => {
            fill.style.width = `${ratio * 100}%`;
          };
        }
      }
      
      // If the bar element doesn't exist, return a no-op function
      return () => { /* no-op */ };
    };
    
    // Assign safe update methods to each bar
    if (!this.hitpointsBar) this.hitpointsBar = { update: () => {} };
    else this.hitpointsBar.update = createSafeUpdate(this.hitpointsBar);
    
    if (!this.prayerBar) this.prayerBar = { update: () => {} };
    else this.prayerBar.update = createSafeUpdate(this.prayerBar);
    
    if (!this.energyBar) this.energyBar = { update: () => {} };
    else this.energyBar.update = createSafeUpdate(this.energyBar);
  }

  disconnectedCallback() {
    this.unsubscribe("updated-stats", this.handleUpdatedStats);
    this.unsubscribe("member-went-inactive", this.handleWentInactive);
    this.unsubscribe("member-went-active", this.handleWentActive);
    super.disconnectedCallback();
  }

  handleUpdatedStats(stats, member) {
    if (member.currentlyViewing) {
      this.updateStatBars(stats);
      this.updateWorld(member.world, member.inactive, member.lastUpdated);
    }
  }

  handleWentInactive(inactive, member) {
    if (member.currentlyViewing) {
      this.updateWorld(member.world, true, member.lastUpdated);
    }
  }

  handleWentActive(_, member) {
    if (member.currentlyViewing) {
      this.updateWorld(member.world, false);
    }
  }

  updateWorld(world, isInactive, lastUpdated) {
    if (isInactive && lastUpdated) {
      const locale = Intl?.DateTimeFormat()?.resolvedOptions()?.locale || undefined;
      this.worldEl.innerText = `${lastUpdated.toLocaleString(locale)}`;
      if (!this.classList.contains("player-stats__inactive")) {
        this.classList.add("player-stats__inactive");
      }
    } else if (this.world !== world) {
      this.world = world;
      if (this.classList.contains("player-stats__inactive")) {
        this.classList.remove("player-stats__inactive");
      }
      this.worldEl.innerText = `W${this.world}`;
    }
  }

  updateStatBars(stats) {
    if (stats.hitpoints === undefined || stats.prayer === undefined || stats.energy === undefined) {
      return;
    }

    this.updateText(stats.hitpoints, "hitpoints");
    this.updateText(stats.prayer, "prayer");

    // Make sure we have initialized the stat bars before trying to update them
    if (!this.hitpointsBar || !this.prayerBar || !this.energyBar) {
      this.initializeStatBars();
    }

    window.requestAnimationFrame(() => {
      if (!this.isConnected) return;
      
      try {
        // Use safe update calls with error handling
        if (this.hitpointsBar && this.hitpointsBar.update) {
          this.hitpointsBar.update(stats.hitpoints.current / stats.hitpoints.max);
        }
        
        if (this.prayerBar && this.prayerBar.update) {
          this.prayerBar.update(stats.prayer.current / stats.prayer.max);
        }
        
        if (this.energyBar && this.energyBar.update) {
          this.energyBar.update(stats.energy.current / stats.energy.max);
        }
      } catch (error) {
        console.error("Error updating stat bars:", error);
      }
    });
  }

  updateText(stat, name) {
    const numbers = this.querySelector(`.player-stats__${name}-numbers`);
    if (!numbers) return;

    const currentStat = this[name];
    if (currentStat === undefined || currentStat.current !== stat.current || currentStat.max !== stat.max) {
      this[name] = stat;
      numbers.innerText = `${stat.current} / ${stat.max}`;
    }
  }
}
customElements.define("player-stats", PlayerStats);
