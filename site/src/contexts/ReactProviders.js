import React from 'react';
import { GroupContextProvider } from './GroupContext';
import { SyncContextProvider } from './SyncContext';
import { WikiService } from '../features/wiki-integration/wiki-service';

// Initialize the WikiService instance
const wikiService = new WikiService();

/**
 * Combined React Context Providers
 * 
 * This component wraps all the necessary context providers for React components
 * to ensure data is properly shared between components
 */
export const ReactProviders = ({ children }) => {
  return (
    <GroupContextProvider>
      <SyncContextProvider wikiService={wikiService}>
        {children}
      </SyncContextProvider>
    </GroupContextProvider>
  );
};

export { wikiService };
