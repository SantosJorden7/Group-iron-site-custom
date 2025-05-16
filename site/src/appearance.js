/**
 * Global appearance and CSS injections
 * This file handles critical CSS styles needed for proper UI display
 */

// Function to add critical styles to the document
function injectCriticalStyles() {
  const styleElement = document.createElement('style');
  styleElement.id = 'critical-ui-styles';
  styleElement.textContent = `
    /* Global visibility fixes */
    body, #app, .authed-section, .authed-section__main-content {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    /* Panel containers */
    .side-panel {
      display: block !important;
      visibility: visible !important;
      min-width: 256px;
      padding: 8px;
    }
    
    /* Navigation */
    app-navigation, .app-navigation {
      display: flex !important;
      visibility: visible !important;
      padding: 8px;
      margin-bottom: 16px;
    }
    
    /* Feature panels */
    .feature-panel, .react-panel {
      display: block !important;
      visibility: visible !important;
      margin-bottom: 10px;
      padding: 8px;
    }
    
    /* Fix for dark elements */
    .rsbackground {
      background-color: #3b3229 !important;
    }
    
    /* Container layout */
    .main-content__panel-container {
      display: flex !important;
      flex-wrap: wrap;
      gap: 16px;
      padding: 8px;
    }
    
    /* Player panels */
    player-panel {
      margin-bottom: 8px;
      display: block !important;
    }
    
    /* Canvas map */
    canvas-map {
      display: block !important;
      min-height: 400px;
    }
    
    /* Make React panels container visible */
    #react-panels, .react-panels {
      display: block !important;
      visibility: visible !important;
    }
    
    /* Collection log styling */
    .collection-log-page {
      display: block !important;
      min-height: 400px;
      padding: 10px;
    }
    
    .collection-log-tabs {
      display: flex !important;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 10px;
    }
    
    .collection-log-tab-button {
      padding: 5px 10px;
      cursor: pointer;
    }
    
    .collection-log-tab-button.active {
      background-color: #5d4e3b !important;
    }
    
    .collection-log-entries {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 5px;
      margin-bottom: 10px;
    }
    
    .collection-log-entry {
      padding: 5px;
      cursor: pointer;
      border: 1px solid #5d4e3b;
    }
    
    .collection-log-entry.active {
      background-color: #5d4e3b !important;
    }
    
    .collection-log-items {
      display: block !important;
      border: 1px solid #5d4e3b;
      padding: 10px;
    }
    
    .collection-log-items-row {
      display: flex !important;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 5px;
    }
    
    .collection-log-item {
      width: 32px;
      height: 32px;
      border: 1px solid #5d4e3b;
      position: relative;
    }
    
    .collection-log-item.obtained {
      background-color: rgba(93, 78, 59, 0.3);
    }
    
    .collection-log-item-content {
      width: 100%;
      height: 100%;
      position: relative;
    }
    
    .collection-log-item-quantity {
      position: absolute;
      bottom: 0;
      right: 0;
      font-size: 10px;
      color: yellow;
    }
  `;
  
  document.head.appendChild(styleElement);
  console.log('Critical UI styles injected');
}

class Appearance {
  constructor() {
    if (window.matchMedia) {
      try {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this.updateTheme.bind(this));
      } catch (e) {
        console.warn("Could not add media query listener for theme changes");
      }
      this.setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }

    this.updateLayout();
    
    // Inject critical styles
    injectCriticalStyles();
  }

  setLayout(layout) {
    const html = document.documentElement;
    html.setAttribute("data-layout", layout);
    localStorage.setItem("men-layout", layout);
  }

  updateLayout() {
    const layout = localStorage.getItem("men-layout") || "desktop";
    this.setLayout(layout);
  }

  setTheme(theme) {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    localStorage.setItem("men-theme", theme);
  }

  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }

  updateTheme() {
    window.updateTheme();
  }
}

// Create the appearance instance
const appearance = new Appearance();

// Also ensure styles are injected when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Re-inject styles to be sure
  injectCriticalStyles();
  
  // Force visibility on route changes
  try {
    window.addEventListener('locationchange', function() {
      setTimeout(function() {
        // Ensure all critical containers are visible after route changes
        const containers = document.querySelectorAll('.side-panel, app-navigation, .feature-panel, .react-panel');
        containers.forEach(container => {
          if (container) {
            container.style.display = container.tagName === 'APP-NAVIGATION' ? 'flex' : 'block';
            container.style.visibility = 'visible';
          }
        });
      }, 100);
    });
  } catch (e) {
    console.warn("Could not add locationchange listener, will use direct assignment");
    if (window.onlocationchange === undefined) {
      window.onlocationchange = function() {
        setTimeout(function() {
          // Ensure all critical containers are visible after route changes
          const containers = document.querySelectorAll('.side-panel, app-navigation, .feature-panel, .react-panel');
          containers.forEach(container => {
            if (container) {
              container.style.display = container.tagName === 'APP-NAVIGATION' ? 'flex' : 'block';
              container.style.visibility = 'visible';
            }
          });
        }, 100);
      };
    }
  }
});

export { appearance };
