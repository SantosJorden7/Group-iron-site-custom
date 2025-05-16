/**
 * Panel Container Component
 * Provides a central mounting point for all feature panels
 */
import React, { useEffect } from 'react';

const PanelsContainer = () => {
  useEffect(() => {
    console.log('PanelsContainer mounted - should be visible if React is rendering properly');
    
    // Add panels to the DOM
    const createPanel = (name) => {
      // Check if panel already exists to avoid duplicates
      const existingPanel = document.querySelector(`${name}-panel`);
      if (existingPanel) {
        console.log(`Panel ${name} already exists, not creating duplicate`);
        return existingPanel;
      }
      
      const panelElement = document.createElement(`${name}-panel`);
      panelElement.className = 'feature-panel rsborder-tiny rsbackground';
      panelElement.setAttribute('data-panel-type', name);
      
      // Create a root element for React to mount to
      const reactRoot = document.createElement('div');
      reactRoot.id = `react-${name}-root`;
      reactRoot.className = 'panel-content';
      panelElement.appendChild(reactRoot);
      
      return panelElement;
    };
    
    // Get the side panel container
    const sidePanel = document.querySelector('.side-panel__panels');
    if (sidePanel) {
      // Create and append all feature panels
      const panelTypes = [
        'activities', 
        'boss-strategy', 
        'group-challenges', 
        'group-milestones', 
        'shared-calendar', 
        'slayer-tasks', 
        'valuable-drops', 
        'dps-calculator', 
        'collection-log'
      ];
      
      // Add panels in order
      panelTypes.forEach(panelName => {
        const panel = createPanel(panelName);
        sidePanel.appendChild(panel);
        
        // Dispatch an event that the panel was added to the DOM
        const event = new CustomEvent('panel-added', { 
          detail: { panelName, element: panel } 
        });
        document.dispatchEvent(event);
      });
      
      console.log('Added feature panels to side panel');
    } else {
      console.error('Could not find side panel to add feature panels');
    }
  }, []);

  return (
    <div className="panels-container">
      <h2 className="rstitle">Feature Panels</h2>
      <p>Panel content is loaded in the side panel.</p>
    </div>
  );
};

export default PanelsContainer;
