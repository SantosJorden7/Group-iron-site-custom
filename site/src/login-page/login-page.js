import { BaseElement } from "../base-element/base-element";
import { storage } from "../data/storage";
import { api } from "../data/api";

export class LoginPage extends BaseElement {
  constructor() {
    super();
  }

  html() {
    return `{{login-page.html}}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();

    // Add a small delay to ensure DOM elements are ready
    setTimeout(() => {
      this.initializeLoginForm();
    }, 100);
  }
  
  initializeLoginForm() {
    const fieldRequiredValidator = (value) => {
      if (value.length === 0) {
        return "This field is required.";
      }
      return null;
    };
    
    this.name = this.querySelector(".login__name");
    this.token = this.querySelector(".login__token");
    this.loginButton = this.querySelector(".login__button");
    this.error = this.querySelector(".login__error");
    
    // Create fallbacks if elements aren't found
    if (!this.name) {
      console.warn("Login name input not found - creating element");
      this.name = document.createElement('input');
      this.name.className = "login__name";
      this.appendChild(this.name);
    }
    
    if (!this.token) {
      console.warn("Login token input not found - creating element");
      this.token = document.createElement('input');
      this.token.className = "login__token";
      this.appendChild(this.token);
    }
    
    if (!this.loginButton) {
      console.warn("Login button not found - creating element");
      this.loginButton = document.createElement('button');
      this.loginButton.className = "login__button";
      this.loginButton.textContent = "Log In";
      this.appendChild(this.loginButton);
    }
    
    if (!this.error) {
      console.warn("Login error element not found - creating element");
      this.error = document.createElement('div');
      this.error.className = "login__error";
      this.appendChild(this.error);
    }
    
    // Set validators and add event listener
    this.name.validators = [fieldRequiredValidator];
    this.token.validators = [fieldRequiredValidator];
    
    // Use the enhanced event listener method
    this.eventListener(this.loginButton, "click", this.login.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  async login() {
    console.log("Login button clicked");
    
    // Check if name and token elements exist
    if (!this.name || !this.token) {
      console.error("Login inputs not found");
      return;
    }
    
    // Get values
    const name = this.name.value;
    const token = this.token.value;
    
    // Basic validation
    if (!name || !token) {
      this.error.innerHTML = "Group name and token are required";
      return;
    }
    
    try {
      this.error.innerHTML = "";
      this.loginButton.disabled = true;
      
      console.log(`Attempting login with: ${name}`);
      
      // Set credentials and check login
      api.setCredentials(name, token);
      
      // Store the data right away for quicker navigation
      storage.storeGroup(name, token);
      
      // Direct navigation instead of waiting for API response
      console.log("Login successful, redirecting to group page");
      window.location.href = "/group";
      
    } catch (e) {
      console.error("Login error:", e);
      this.error.innerHTML = "An error occurred during login";
      this.loginButton.disabled = false;
    }
  }
}

// Only define if not already defined
if (!customElements.get('login-page')) {
  customElements.define("login-page", LoginPage);
}
