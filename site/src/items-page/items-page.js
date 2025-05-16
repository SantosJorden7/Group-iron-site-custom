import { BaseElement } from "../base-element/base-element";

export class ItemsPage extends BaseElement {
  constructor() {
    super();
  }

  html() {
    return `{{items-page.html}}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();

    // Add a small delay to ensure DOM is fully rendered
    setTimeout(() => {
      this.initialize();
    }, 100);
  }

  initialize() {
    // Subscribe to members update after initialization
    this.subscribe("members-updated", this.handleUpdatedMembers.bind(this));
  }

  handleUpdatedMembers(members) {
    // Add null check for player filter to prevent errors
    const playerFilter = this.querySelector(".items-page__player-filter");
    if (!playerFilter) {
      console.warn("Player filter element not found in items-page");
      return;
    }
    
    const selected = playerFilter.value || "@ALL";

    let playerOptions = `<option value="@ALL">All Players</option>`;
    if (Array.isArray(members)) {
      for (const member of members) {
        playerOptions += `<option value="${member.name}" ${member.name === selected ? "selected" : ""}>${
          member.name
        }</option>`;
      }
    }

    playerFilter.innerHTML = playerOptions;

    if (playerFilter.value !== selected) {
      playerFilter.dispatchEvent(new CustomEvent("change"));
    }
  }
}

// Make sure the custom element is only defined once
if (!customElements.get('items-page')) {
  customElements.define("items-page", ItemsPage);
}
