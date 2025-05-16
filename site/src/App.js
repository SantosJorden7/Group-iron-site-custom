/**
 * App.js - Main React Application Entry Point
 * Bridges the site's custom elements with React features
 */
import React from 'react';
import { ReactProviders } from './contexts/ReactProviders';

/**
 * Main App Component
 * Provides context providers and routing for feature panels
 */
const panelComponents = {
  'activities': React.lazy(() => import('./features/activities')),
  'boss-strategy': React.lazy(() => import('./features/boss-strategy')),
  'group-challenges': React.lazy(() => import('./features/group-challenges')),
  'group-milestones': React.lazy(() => import('./features/group-milestones')),
  'shared-calendar': React.lazy(() => import('./features/shared-calendar')),
  'slayer-tasks': React.lazy(() => import('./features/slayer-tasks')),
  'valuable-drops': React.lazy(() => import('./features/valuable-drops')),
  'dps-calculator': React.lazy(() => import('./features/dps-calculator')),
  'collection-log': React.lazy(() => import('./features/collection-log'))
};

// Main App component with dynamic panel rendering
const App = ({ panelType, children }) => {
  // Get the component for the current panel type
  const PanelComponent = panelType && panelComponents[panelType] 
    ? panelComponents[panelType] 
    : null;

  return (
    <ReactProviders>
      <React.Suspense fallback={
        <div className="panel-loading rsbackground" style={{ padding: '10px' }}>
          <p>Loading {panelType} panel...</p>
        </div>
      }>
        {PanelComponent ? <PanelComponent /> : children || 
          <div className="panel-placeholder rsbackground" style={{ padding: '10px' }}>
            <p>Panel content will appear here</p>
          </div>
        }
      </React.Suspense>
    </ReactProviders>
  );
};

export default App;
