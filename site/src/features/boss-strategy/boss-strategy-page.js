import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import BossStrategyPanel from "./BossStrategyPanel.jsx";

/**
 * Boss Strategy Page
 * Integrates the React BossStrategyPanel component with the application's routing system
 */
export class BossStrategyPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/boss-strategy", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(BossStrategyPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Boss Strategy - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("boss-strategy-page", BossStrategyPage);
