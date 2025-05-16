import { BaseElement } from "../base-element/base-element";

export class PlayerPanel extends BaseElement {
  constructor() {
    super();
  }

  html() {
    return `{{player-panel.html}}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.playerName = this.getAttribute("player-name");
    this.render();
    
    // Add event listener safely
    const panelElement = this.querySelector(".player-panel");
    if (panelElement) {
      try {
        this.eventListener(panelElement, "click", this.clickPanel.bind(this));
      } catch (e) {
        console.warn("Could not add click listener to player panel:", e);
        // Direct assignment as fallback
        panelElement.onclick = this.clickPanel.bind(this);
      }
    } else {
      console.warn("Player panel element not found, creating container");
      const container = document.createElement('div');
      container.className = "player-panel";
      
      const nameElement = document.createElement('div');
      nameElement.className = "player-panel__name";
      nameElement.textContent = this.playerName || "Player";
      
      container.appendChild(nameElement);
      this.appendChild(container);
      
      // Add direct click handler
      container.onclick = this.clickPanel.bind(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  clickPanel() {
    // Use direct URL navigation to avoid potential event listener issues
    if (this.playerName) {
      window.location.href = `/#/player/${this.playerName}`;
    }
  }
}

// Register the custom element only once
if (!customElements.get('player-panel')) {
  customElements.define("player-panel", PlayerPanel);
}
