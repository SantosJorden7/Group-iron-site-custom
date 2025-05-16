import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import ValuableDrops from "./ValuableDrops.jsx";
import { reactToHtml } from "../../react-utils/react-to-html.js";

/**
 * Valuable Drops Page
 * Integrates the React ValuableDrops component with the application's routing system
 */
export class ValuableDropsPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/valuable-drops", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(ValuableDrops, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Valuable Drops - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("valuable-drops-page", ValuableDropsPage);
