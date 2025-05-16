import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Container, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext.js';
import { useSync } from '../../contexts/SyncContext.js';
import { WikiService } from './wiki-service';
import '../data-sync/multi-source.css';
import DataSourceBadge from '../data-sync/DataSourceBadge';
import { DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * WikiIntegrationPanel Component
 * 
 * Provides a UI for managing wiki data integration and viewing status
 */
const WikiIntegrationPanel = () => {
  const { group, groupMembers, activeMember } = useContext(GroupContext);
  const { wikiService, wikiState } = useSync();
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [wikiContent, setWikiContent] = useState([]);

  useEffect(() => {
    if (wikiService) {
      setIsLoading(wikiService.isLoading);
      setLastUpdated(wikiService.lastUpdated);
      
      // Subscribe to wiki service changes
      const handleWikiUpdate = () => {
        setIsLoading(wikiService.isLoading);
        setLastUpdated(wikiService.lastUpdated);
        if (wikiService.content) {
          setWikiContent(wikiService.content.slice(0, 5)); // Show first 5 entries
        }
      };
      
      wikiService.subscribe(handleWikiUpdate);
      handleWikiUpdate(); // Initial update
      
      return () => wikiService.unsubscribe(handleWikiUpdate);
    }
  }, [wikiService]);

  const handleRefreshWiki = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await wikiService.fetchAllData();
      setIsLoading(false);
    } catch (err) {
      setError('Failed to refresh wiki data: ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <Container className="wiki-integration-panel">
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h2>OSRS Wiki Integration</h2>
            <div>
              <DataSourceBadge 
                type={DataSourceTypes.WIKI} 
                lastUpdated={lastUpdated} 
                isLoading={isLoading} 
              />
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          <Row className="mb-4">
            <Col>
              <p>
                The Wiki Integration feature provides access to the latest OSRS wiki data for items, 
                monsters, and other game content. This data is used by other features in the application.
              </p>
              <Button 
                variant="primary" 
                onClick={handleRefreshWiki} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="mr-2" />
                    Refreshing Wiki Data...
                  </>
                ) : 'Refresh Wiki Data'}
              </Button>
              {lastUpdated && (
                <small className="ml-3 text-muted">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </small>
              )}
            </Col>
          </Row>
          
          <h4>Recent Wiki Content</h4>
          {wikiContent.length > 0 ? (
            <div className="wiki-content-preview">
              <ul className="list-group">
                {wikiContent.map((item, index) => (
                  <li key={index} className="list-group-item">
                    <strong>{item.name}</strong>
                    {item.id && <Badge className="ml-2" variant="secondary">ID: {item.id}</Badge>}
                    {item.category && <Badge className="ml-2" variant="info">{item.category}</Badge>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-muted">Showing {wikiContent.length} of {wikiService?.content?.length || 0} items</p>
            </div>
          ) : (
            <Alert variant="info">
              No wiki content available. Click "Refresh Wiki Data" to load content from the OSRS Wiki.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default WikiIntegrationPanel;
