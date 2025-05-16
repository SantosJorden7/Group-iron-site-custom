import React from 'react';
import { SyncContextProvider } from './SyncContext';
import { WikiContext } from './WikiContext';
import wikiService from '../services/WikiService';

/**
 * ReactProviders
 * Combines all context providers needed by our feature components
 * This creates a proper wrapper for all React component trees
 */
export const ReactProviders = ({ children }) => {
  return (
    <SyncContextProvider wikiService={wikiService}>
      <WikiContext.Provider value={{ wikiService }}>
        {children}
      </WikiContext.Provider>
    </SyncContextProvider>
  );
};
