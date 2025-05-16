import { BaseElement } from "../../base-element/base-element.js";
import { router } from "../../router.js";
import { reactToHtml } from "../../react-utils/react-to-html.js";
import GroupChallengesPanel from "./GroupChallengesPanel.jsx";

/**
 * Group Challenges Page
 * Integrates the React GroupChallengesPanel component with the application's routing system
 */
export class GroupChallengesPage extends BaseElement {
  constructor() {
    super();
    
    // Register this component with the router
    router.register("/group/group-challenges", this);
  }
  
  /**
   * Generate HTML from the React component
   * @returns {string} HTML string
   */
  html() {
    return reactToHtml(GroupChallengesPanel, {});
  }
  
  /**
   * Update the page title when this page is activated
   */
  enable() {
    document.title = "Group Challenges - Group Ironmen Tracker";
    super.enable();
  }
}

customElements.define("group-challenges-page", GroupChallengesPage);
