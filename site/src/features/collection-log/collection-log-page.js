import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import CollectionLogPanel from "./CollectionLogPanel.jsx";

/**
 * Collection Log Page
 * Integrates the React CollectionLogPanel component with the application's routing system
 */
export class CollectionLogFeaturePage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/collection-log", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(CollectionLogPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Collection Log - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("collection-log-page", CollectionLogFeaturePage);
