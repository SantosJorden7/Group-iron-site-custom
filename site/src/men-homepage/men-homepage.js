import { BaseElement } from "../base-element/base-element";
import { storage } from "../data/storage";
import { router } from "../router";

export class MenHomepage extends BaseElement {
  constructor() {
    super();
  }

  html() {
    return `{{men-homepage.html}}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Add event listeners for the buttons 
    setTimeout(() => {
      const getStartedBtn = this.querySelector(".men-homepage__get-started");
      const demoBtn = this.querySelector(".men-homepage__demo-button");
      
      if (getStartedBtn) {
        try {
          this.eventListener(getStartedBtn, "click", this.onGetStartedClick.bind(this));
        } catch (e) {
          console.log("Adding direct click handler for Get Started button");
          getStartedBtn.onclick = this.onGetStartedClick.bind(this);
        }
      } else {
        console.warn("Get Started button not found in the DOM");
        // Create the button if it doesn't exist
        const container = this.querySelector(".men-homepage__buttons") || this;
        if (container) {
          const newBtn = document.createElement("button");
          newBtn.className = "men-homepage__get-started rsbutton";
          newBtn.textContent = "Get Started";
          newBtn.onclick = this.onGetStartedClick.bind(this);
          container.appendChild(newBtn);
        }
      }
      
      if (demoBtn) {
        try {
          this.eventListener(demoBtn, "click", this.onDemoClick.bind(this));
        } catch (e) {
          console.log("Adding direct click handler for Demo button");
          demoBtn.onclick = this.onDemoClick.bind(this);
        }
      } else {
        console.warn("Demo button not found in the DOM");
        // Create the button if it doesn't exist
        const container = this.querySelector(".men-homepage__buttons") || this;
        if (container) {
          const newBtn = document.createElement("button");
          newBtn.className = "men-homepage__demo-button rsbutton";
          newBtn.textContent = "Demo";
          newBtn.onclick = this.onDemoClick.bind(this);
          container.appendChild(newBtn);
        }
      }
    }, 100);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  onGetStartedClick() {
    console.log("Get Started clicked");
    // Use hash-based routing for better compatibility
    window.location.href = "/#/login";
  }
  
  onDemoClick() {
    console.log("Demo clicked");
    try {
      // Set the demo group values
      storage.setGroup({
        groupName: "@EXAMPLE",
        groupToken: "demo-token"
      });
      
      // Navigate to the group page with hash-based routing
      window.location.href = "/#/map";
    } catch (e) {
      console.error("Error setting up demo:", e);
      // Fallback to direct navigation
      window.location.href = "/#/map";
    }
  }

  get hasLogin() {
    const group = storage.getGroup();
    return group && group.groupName && group.groupToken && group.groupName !== "@EXAMPLE";
  }
}

// Only define if not already defined
if (!customElements.get('men-homepage')) {
  customElements.define("men-homepage", MenHomepage);
}
