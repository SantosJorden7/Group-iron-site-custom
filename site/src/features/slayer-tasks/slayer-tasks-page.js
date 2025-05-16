import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import SlayerTaskPanel from "./SlayerTaskPanel.jsx";

/**
 * Slayer Tasks Page
 * Integrates the React SlayerTaskPanel component with the application's routing system
 */
export class SlayerTasksPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/slayer-tasks", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(SlayerTaskPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Slayer Tasks - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("slayer-tasks-page", SlayerTasksPage);
