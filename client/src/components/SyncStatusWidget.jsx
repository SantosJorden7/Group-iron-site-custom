import React from 'react';
import { Button, Spinner, Badge, OverlayTrigger, Tooltip, Card } from 'react-bootstrap';
import { useSync } from '../contexts/SyncContext';
import './SyncStatusWidget.css';

/**
 * SyncStatusWidget Component
 * Displays sync status information and controls for the application
 */
const SyncStatusWidget = ({ variant = 'sidebar' }) => {
  const { syncState, wikiState, performSync } = useSync();
  
  // Format last sync time as relative time (e.g. "2 minutes ago")
  const getLastSyncText = () => {
    if (!syncState.lastSyncTime) {
      return 'Never synced';
    }
    
    const lastSync = new Date(syncState.lastSyncTime);
    const now = new Date();
    const diffMs = now - lastSync;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins === 1) {
      return '1 minute ago';
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffMins < 120) {
      return '1 hour ago';
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hours ago`;
    }
  };
  
  // Get appropriate status variant for sync status
  const getSyncStatusVariant = () => {
    if (syncState.syncInProgress) {
      return 'info';
    } else if (syncState.syncError) {
      return 'danger';
    } else if (syncState.lastSyncTime) {
      const lastSync = new Date(syncState.lastSyncTime);
      const now = new Date();
      const diffMins = Math.floor((now - lastSync) / 60000);
      
      // Show warning if last sync was more than 30 minutes ago
      if (diffMins > 30) {
        return 'warning';
      } else {
        return 'success';
      }
    }
    return 'secondary';
  };
  
  // Render an inline version of the widget (for navbar)
  if (variant === 'inline') {
    return (
      <div className="d-flex align-items-center sync-status-inline">
        <Button
          variant={`outline-${getSyncStatusVariant()}`}
          size="sm"
          className="d-flex align-items-center"
          onClick={() => performSync(true)}
          disabled={syncState.syncInProgress}
          title={syncState.syncError ? `Error: ${syncState.syncError}` : 'Click to sync data'}
        >
          {syncState.syncInProgress ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-1"
              />
              <span className="d-none d-md-inline">Syncing...</span>
            </>
          ) : (
            <>
              <i className="bi bi-arrow-repeat me-1"></i>
              <span className="d-none d-md-inline">{getLastSyncText()}</span>
            </>
          )}
        </Button>
        
        {/* Wiki Status Indicator */}
        {wikiState && (
          <OverlayTrigger
            placement="bottom"
            overlay={
              <Tooltip>
                {wikiState.wikiError 
                  ? `Wiki Error: ${wikiState.wikiError}` 
                  : `Wiki ${wikiState.wikiCacheEnabled ? 'Cache Enabled' : 'Live Mode'}`}
              </Tooltip>
            }
          >
            <Badge 
              bg={wikiState.wikiError ? 'warning' : 'info'} 
              className="ms-2 d-none d-lg-inline"
            >
              <i className={`bi bi-${wikiState.wikiError ? 'exclamation-triangle' : 'book'} me-1`}></i>
              Wiki
            </Badge>
          </OverlayTrigger>
        )}
      </div>
    );
  }
  
  // Render the sidebar version (default)
  return (
    <Card className="sync-status-widget mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-arrow-repeat me-2"></i>
          Sync Status
        </h5>
        {syncState.autoSyncEnabled && (
          <Badge bg="success" pill>Auto</Badge>
        )}
      </Card.Header>
      <Card.Body>
        <div className="sync-info mb-3">
          <div className="status-item">
            <span className="label">Last Sync:</span>
            <span className="value">{getLastSyncText()}</span>
          </div>
          <div className="status-item">
            <span className="label">Status:</span>
            <span className={`value text-${getSyncStatusVariant()}`}>
              {syncState.syncInProgress ? 'Syncing...' : 
               syncState.syncError ? 'Error' : 
               syncState.lastSyncTime ? 'Up to date' : 'Never synced'}
            </span>
          </div>
          {syncState.syncError && (
            <div className="status-item">
              <span className="label">Error:</span>
              <span className="value text-danger">{syncState.syncError}</span>
            </div>
          )}
          <div className="status-item">
            <span className="label">Wiki:</span>
            <span className={`value ${wikiState.wikiError ? 'text-warning' : 'text-info'}`}>
              {wikiState.wikiError ? 'Error' : 
               wikiState.wikiCacheEnabled ? 'Cache Enabled' : 'Live Mode'}
            </span>
          </div>
        </div>
        
        <Button 
          variant={getSyncStatusVariant()} 
          onClick={() => performSync(true)}
          disabled={syncState.syncInProgress}
          className="w-100"
        >
          {syncState.syncInProgress ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Syncing...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Sync Now
            </>
          )}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default SyncStatusWidget;
