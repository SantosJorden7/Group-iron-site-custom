import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import GroupMilestonesPanel from "./GroupMilestonesPanel.jsx";

/**
 * Group Milestones Page
 * Integrates the React GroupMilestonesPanel component with the application's routing system
 */
export class GroupMilestonesPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/group-milestones", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(GroupMilestonesPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Group Milestones - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("group-milestones-page", GroupMilestonesPage);
