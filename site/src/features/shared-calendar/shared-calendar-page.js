import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import SharedCalendarPanel from "./SharedCalendarPanel.jsx";

/**
 * Shared Calendar Page
 * Integrates the React SharedCalendarPanel component with the application's routing system
 */
export class SharedCalendarPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/shared-calendar", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(SharedCalendarPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Shared Calendar - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("shared-calendar-page", SharedCalendarPage);
