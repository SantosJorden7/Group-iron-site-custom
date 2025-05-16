import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { formatLastUpdated } from './multi-source-utility';
import './multi-source.css';

/**
 * Reusable component for displaying data source information
 * Used consistently across all feature panels
 */
const DataSourcesPanel = ({ sources }) => {
  const { plugin, wiseOldMan, wiki } = sources;
  
  return (
    <Card className="data-sources-panel mt-4 mb-3">
      <Card.Header>
        <i className="bi bi-database-fill me-2"></i>
        Data Sources
      </Card.Header>
      <Card.Body>
        <div className="data-sources-grid">
          {/* Plugin Data Source */}
          <div className="data-source-item">
            <div className="data-source-name">
              <Badge bg={plugin.active ? 'success' : 'danger'} className="me-2">
                {plugin.badge.text}
              </Badge>
              RuneLite Plugin
            </div>
            <div className="data-source-status">
              <span>{plugin.active ? 'Connected' : 'Disconnected'}</span>
              {plugin.error && <span className="text-danger small">{plugin.error}</span>}
            </div>
            <div className="data-source-timestamp">
              Last updated: {formatLastUpdated(plugin.lastUpdated)}
            </div>
          </div>
          
          {/* Wise Old Man Data Source */}
          <div className="data-source-item">
            <div className="data-source-name">
              <Badge bg={wiseOldMan.active ? 'info' : 'danger'} className="me-2">
                {wiseOldMan.badge.text}
              </Badge>
              Wise Old Man
            </div>
            <div className="data-source-status">
              <span>{wiseOldMan.active ? 'Available' : 'Unavailable'}</span>
              {wiseOldMan.error && <span className="text-danger small">{wiseOldMan.error}</span>}
            </div>
            <div className="data-source-timestamp">
              Last updated: {formatLastUpdated(wiseOldMan.lastUpdated)}
            </div>
          </div>
          
          {/* Wiki Data Source */}
          <div className="data-source-item">
            <div className="data-source-name">
              <Badge bg={wiki.active ? 'warning' : 'danger'} className="me-2">
                {wiki.badge.text}
              </Badge>
              OSRS Wiki
            </div>
            <div className="data-source-status">
              <span>{wiki.active ? 'Connected' : 'Disconnected'}</span>
              {wiki.error && <span className="text-danger small">{wiki.error}</span>}
            </div>
            <div className="data-source-timestamp">
              Last updated: {formatLastUpdated(wiki.lastUpdated)}
            </div>
          </div>
        </div>
        
        <div className="data-source-priority-info mt-3">
          <small>
            Data priority: Plugin (P) → Wise Old Man (W) → Wiki (K)
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default DataSourcesPanel;
