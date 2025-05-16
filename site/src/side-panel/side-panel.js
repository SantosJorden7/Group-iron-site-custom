import { BaseElement } from "../base-element/base-element";

export class SidePanel extends BaseElement {
  constructor() {
    super();
  }

  html() {
    return `{{side-panel.html}}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Use a small delay to ensure the DOM is fully rendered
    setTimeout(() => {
      this.initialize();
    }, 100);
  }
  
  initialize() {
    // First, ensure the side-panel has the correct class for CSS targeting
    this.classList.add('side-panel');
    
    this.sidePanels = this.querySelector(".side-panel__panels");
    
    // Create panels container if it doesn't exist
    if (!this.sidePanels) {
      console.warn("Side panel container not found, creating element");
      this.sidePanels = document.createElement('div');
      this.sidePanels.className = "side-panel__panels";
      this.appendChild(this.sidePanels);
      
      // Add a default heading to make the panel visible
      const heading = document.createElement('h3');
      heading.className = "rstitle";
      heading.textContent = "Group Members";
      this.insertBefore(heading, this.sidePanels);
    }
    
    // Force visibility of the side panel
    this.style.display = 'block';
    this.style.visibility = 'visible';
    
    this.subscribe("members-updated", this.handleUpdatedMembers.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  handleUpdatedMembers(members) {
    // Add null check to prevent errors
    if (!this.sidePanels) {
      console.warn("Side panel element not found - recreating");
      this.sidePanels = this.querySelector(".side-panel__panels");
      
      if (!this.sidePanels) {
        this.sidePanels = document.createElement('div');
        this.sidePanels.className = "side-panel__panels";
        this.appendChild(this.sidePanels);
      }
    }
    
    // Check if members is an array
    if (!Array.isArray(members)) {
      console.warn("Invalid members data received:", members);
      return;
    }
    
    console.log("Rendering side panel with members:", members.length);

    let playerPanels = "";
    for (const member of members) {
      if (member.name === "@SHARED") {
        continue;
      }
      playerPanels += `<player-panel class="rsborder rsbackground" player-name="${member.name}"></player-panel>`;
    }

    this.sidePanels.innerHTML = playerPanels;
  }
}

// Make sure the custom element is only defined once
if (!customElements.get('side-panel')) {
  customElements.define("side-panel", SidePanel);
}
