import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import ActivitiesPanel from "./ActivitiesPanel.jsx";

/**
 * Activities Page
 * Integrates the React ActivitiesPanel component with the application's routing system
 */
export class ActivitiesPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/activities", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(ActivitiesPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Activities - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("activities-page", ActivitiesPage);
