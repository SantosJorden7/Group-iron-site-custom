import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import DPSCalculatorPanel from "./DPSCalculatorPanel.jsx";

/**
 * DPS Calculator Page
 * Integrates the React DpsCalculatorPanel component with the application's routing system
 */
export class DpsCalculatorPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/dps-calculator", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(DPSCalculatorPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "DPS Calculator - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("dps-calculator-page", DpsCalculatorPage);
