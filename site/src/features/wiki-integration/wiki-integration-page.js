import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import WikiIntegrationPanel from "./WikiIntegrationPanel.jsx";

/**
 * Wiki Integration Page
 * Integrates the React WikiIntegrationPanel component with the application's routing system
 */
export class WikiIntegrationPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/wiki-integration", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(WikiIntegrationPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Wiki Integration - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("wiki-integration-page", WikiIntegrationPage);
