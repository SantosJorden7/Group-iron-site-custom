import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { DataSourceBadges, DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * Component that displays the status of collection log data sources
 * Shows which sources are active and when they were last updated
 */
const CollectionLogSourcesPanel = ({ syncState, wikiService, wiseOldManService }) => {
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Determine status of each data source
  const pluginActive = syncState?.lastSynced ? true : false;
  const wikiActive = wikiService?.isInitialized ? true : false;
  const womActive = wiseOldManService?.isInitialized ? true : false;
  
  return (
    <Card className="data-sources-panel mb-3">
      <Card.Body>
        <Card.Title as="h5" className="mb-3" style={{ 
          fontFamily: 'rsbold', 
          color: 'var(--orange)', 
          textShadow: '1.3px 1.3px var(--black)' 
        }}>
          Collection Log Data Sources
        </Card.Title>
        
        <div className="data-source-item">
          <div className={`data-source-status ${pluginActive ? 'active' : 'inactive'}`}></div>
          <div className="data-source-name">Plugin Data</div>
          <Badge 
            bg="success" 
            className="me-2"
            style={{ fontFamily: 'rssmall', textShadow: '1.3px 1.3px var(--black)' }}
          >
            {DataSourceBadges[DataSourceTypes.PLUGIN].text}
          </Badge>
          <div className="data-source-timestamp">
            {pluginActive 
              ? `Last updated: ${formatTimestamp(syncState.lastSynced)}` 
              : 'Not available'}
          </div>
        </div>
        
        <div className="data-source-item">
          <div className={`data-source-status ${womActive ? 'active' : 'inactive'}`}></div>
          <div className="data-source-name">Wise Old Man</div>
          <Badge 
            bg="info" 
            className="me-2"
            style={{ fontFamily: 'rssmall', textShadow: '1.3px 1.3px var(--black)' }}
          >
            {DataSourceBadges[DataSourceTypes.WISE_OLD_MAN].text}
          </Badge>
          <div className="data-source-timestamp">
            {womActive 
              ? 'Available as fallback' 
              : 'Not initialized'}
          </div>
        </div>
        
        <div className="data-source-item">
          <div className={`data-source-status ${wikiActive ? 'active' : 'inactive'}`}></div>
          <div className="data-source-name">OSRS Wiki</div>
          <Badge 
            bg="warning" 
            className="me-2"
            style={{ fontFamily: 'rssmall', textShadow: '1.3px 1.3px var(--black)' }}
          >
            {DataSourceBadges[DataSourceTypes.WIKI].text}
          </Badge>
          <div className="data-source-timestamp">
            {wikiActive 
              ? 'Available for item info' 
              : 'Not initialized'}
          </div>
        </div>
        
        <div className="mt-3" style={{ fontSize: '12px', opacity: 0.8 }}>
          <p className="mb-0">
            <strong>Data Source Priority:</strong> Plugin > Wise Old Man > Wiki
          </p>
          <p className="mb-0">
            Items will use the highest priority source available. 
            The badge on each item shows which source provided the data.
          </p>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CollectionLogSourcesPanel;
