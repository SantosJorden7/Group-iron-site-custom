import { BaseElement } from "../base-element/base-element";

class AppNavigation extends BaseElement {
  constructor() {
    super();
    this.navigationState = {
      activeButton: null
    };
  }

  html() {
    // Create a simple, reliable navigation HTML that doesn't depend on group
    return `
    <div class="app-navigation rsborder rsbackground">
      <h4 class="app-navigation__group-name">Group Ironmen</h4>
      <nav class="app-navigation__nav">
        <button class="app-navigation__button rsbutton" data-route="/#/items">
          <span>Items</span>
        </button>
        <button class="app-navigation__button rsbutton" data-route="/#/map">
          <span>Map</span>
        </button>
        <button class="app-navigation__button rsbutton" data-route="/#/collection-log">
          <span>Collection Log</span>
        </button>
        <button class="app-navigation__button rsbutton" data-route="/#/panels">
          <span>Features</span>
        </button>
      </nav>
    </div>`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    this.navigationElement = this.querySelector(".app-navigation");
    
    // Create navigation panel if not found
    if (!this.navigationElement) {
      console.warn("Navigation panel not found, creating it");
      this.navigationElement = document.createElement("div");
      this.navigationElement.className = "app-navigation rsborder rsbackground";
      this.appendChild(this.navigationElement);
      
      // Add standard navigation buttons
      const navButtons = [
        { id: "map", text: "Map", route: "/#/map" },
        { id: "items", text: "Items", route: "/#/items" },
        { id: "clog", text: "Collection Log", route: "/#/collection-log" }
      ];
      
      navButtons.forEach(btn => {
        const navButton = document.createElement("button");
        navButton.className = "app-navigation__button rsbutton";
        navButton.setAttribute("data-route", btn.route);
        navButton.textContent = btn.text;
        navButton.onclick = this.handleButtonClick.bind(this);
        this.navigationElement.appendChild(navButton);
      });
    }
    
    // Force visibility to ensure navigation appears
    this.style.display = "block";
    if (this.navigationElement) {
      this.navigationElement.style.display = "flex";
    }
    
    // Add click listeners safely
    const buttons = this.querySelectorAll('.app-navigation__button');
    buttons.forEach(button => {
      try {
        this.eventListener(button, 'click', this.handleButtonClick.bind(this));
      } catch (e) {
        console.warn("Could not add click listener to nav button, using direct assignment");
        button.onclick = this.handleButtonClick.bind(this);
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  handleButtonClick(event) {
    const button = event.currentTarget;
    const route = button.getAttribute('data-route');
    
    if (route) {
      // Direct navigation is more reliable
      window.location.href = route;
      
      // Update active button visually
      if (this.navigationState.activeButton) {
        this.navigationState.activeButton.classList.remove('active');
      }
      button.classList.add('active');
      this.navigationState.activeButton = button;
    }
  }
}

// Register the component only once
if (!customElements.get('app-navigation')) {
  customElements.define("app-navigation", AppNavigation);
}
