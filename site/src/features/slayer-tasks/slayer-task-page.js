import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import SlayerTask from "./SlayerTask.jsx";
import { reactToHtml } from "../../react-utils/react-to-html.js";

/**
 * Slayer Task Page
 * Integrates the React SlayerTask component with the application's routing system
 */
export class SlayerTaskPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/slayer-task", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(SlayerTask, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Slayer Tasks - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("slayer-task-page", SlayerTaskPage);
