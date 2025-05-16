import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { useSync } from '../../contexts/SyncContext.js';
import { useGroup } from '../../contexts/GroupContext.js';
import CollectionLogSourcesPanel from './CollectionLogSourcesPanel';
import collectionLogService from './collection-log-service';
import eventListenerRegistry from '../../utils/eventListenerRegistry';
import './collection-log-styles.css';

/**
 * Collection Log Panel
 * Enhanced wrapper for the site's collection log with multi-source integration
 */
const CollectionLogPanel = () => {
  const { wikiService, wiseOldManService, syncState, triggerSync } = useSync();
  const { group } = useGroup();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [collectionLogMounted, setCollectionLogMounted] = useState(false);
  const cleanupListeners = useRef([]);

  // Initialize services and integration
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setIsLoading(true);
        
        // Initialize the collection log service
        if (wikiService && wiseOldManService) {
          collectionLogService.initialize(wikiService, wiseOldManService);
          console.log('Collection Log Service initialized');
        }
        
        // Wait for the site's collection log to be available
        await waitForCollectionLog();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing collection log:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };
    
    initializeServices();
  }, [wikiService, wiseOldManService]);

  // Function to wait for the collection log to be available in the window context
  const waitForCollectionLog = () => {
    return new Promise((resolve, reject) => {
      const checkInterval = 100; // ms
      const maxWaitTime = 10000; // 10 seconds
      let waitedTime = 0;
      
      const checkCollectionLog = () => {
        if (window.collectionLog) {
          resolve(window.collectionLog);
          return;
        }
        
        waitedTime += checkInterval;
        if (waitedTime >= maxWaitTime) {
          reject(new Error('Collection Log not available after maximum wait time'));
          return;
        }
        
        setTimeout(checkCollectionLog, checkInterval);
      };
      
      checkCollectionLog();
    });
  };

  // Manually trigger a sync for collection log data
  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      await triggerSync();
      // Wait a moment for the collection log to update
      setTimeout(() => setIsLoading(false), 1000);
    } catch (error) {
      console.error('Error triggering sync:', error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  // Get players from the group
  const players = group?.members || [];

  // Add safer DOM mutation observer
  useEffect(() => {
    const initCollectionLog = () => {
      try {
        // Initialize collection log component
        const collectionLogContainer = document.getElementById('collection-log-container');
        if (!collectionLogContainer) {
          console.warn('Collection log container not found');
          return;
        }

        // Use our registry for all event listeners
        const addSafeListener = (target, type, handler, options = {}) => {
          const removeListener = eventListenerRegistry.add(target, type, handler, options);
          cleanupListeners.current.push(removeListener);
          return removeListener;
        };

        // Set up the mutation observer with error handling
        try {
          const observer = new MutationObserver((mutations) => {
            try {
              mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                  // Handle new collection log entries
                  collectionLogService.enhanceLogEntries(mutation.addedNodes);
                }
              });
            } catch (error) {
              console.error('Error in collection log mutation observer:', error);
            }
          });
          
          observer.observe(collectionLogContainer, { 
            childList: true, 
            subtree: true 
          });
          
          // Add to cleanup
          cleanupListeners.current.push(() => observer.disconnect());
        } catch (error) {
          console.error('Failed to create mutation observer:', error);
        }

        setCollectionLogMounted(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing collection log:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    if (!collectionLogMounted && wikiService && wiseOldManService) {
      initCollectionLog();
    }

    // Cleanup all event listeners on unmount
    return () => {
      cleanupListeners.current.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          try {
            cleanup();
          } catch (error) {
            console.warn('Error during cleanup:', error);
          }
        }
      });
      cleanupListeners.current = [];
    };
  }, [collectionLogMounted, wikiService, wiseOldManService]);

  return (
    <Container fluid className="collection-log-container">
      <Row className="mb-4">
        <Col>
          <h1 className="page-title" style={{ 
            fontFamily: 'rsbold', 
            color: 'var(--orange)', 
            textShadow: '1.3px 1.3px var(--black)' 
          }}>
            Collection Log
          </h1>
          <p className="text-muted">
            Track your group's collection log progress with data from multiple sources
          </p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          {hasError && (
            <Card className="mb-4" bg="danger" text="white">
              <Card.Body>
                <Card.Title>Error Loading Collection Log</Card.Title>
                <Card.Text>
                  There was a problem loading the collection log. Please try refreshing the page.
                </Card.Text>
                <Button variant="light" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </Card.Body>
            </Card>
          )}

          <Card className="main-content-card">
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading collection log...</span>
                  </Spinner>
                  <p className="mt-3">Loading collection log data...</p>
                </div>
              ) : (
                <div id="collection-log-container" className={collectionLogMounted ? '' : 'collection-log-loading'}>
                  {/* Collection Log mounts here through site's custom elements */}
                  {/* This is where the original site's collection-log component will render */}
                  <collection-log-app></collection-log-app>
                </div>
              )}
            </Card.Body>
            <Card.Footer className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted">
                  Items show source indicator: Plugin (P), Wise Old Man (W), or Wiki (K)
                </small>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleManualSync}
                disabled={isLoading}
                style={{
                  backgroundColor: 'var(--orange)',
                  borderColor: 'var(--orange)',
                  fontFamily: 'rssmall',
                  textShadow: '1.3px 1.3px var(--black)'
                }}
              >
                {isLoading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />{' '}
                    Syncing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-repeat me-1"></i>
                    Sync Collection Log
                  </>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={4}>
          {/* Sources Panel */}
          <CollectionLogSourcesPanel
            syncState={syncState}
            wikiService={wikiService}
            wiseOldManService={wiseOldManService}
          />
          
          {/* Player Selection */}
          <Card className="mb-4">
            <Card.Body>
              <Card.Title as="h5" style={{ 
                fontFamily: 'rsbold', 
                color: 'var(--orange)', 
                textShadow: '1.3px 1.3px var(--black)' 
              }}>
                Player Selection
              </Card.Title>
              <div className="player-selection mt-3">
                {players.map(player => (
                  <Button
                    key={player.id}
                    variant="outline-secondary"
                    className="me-2 mb-2"
                    onClick={() => {
                      // This will use the site's collection log UI to switch players
                      if (window.collectionLog) {
                        const playerSelectEvent = new CustomEvent('collection-log-select-player', {
                          detail: { playerName: player.name }
                        });
                        window.dispatchEvent(playerSelectEvent);
                      }
                    }}
                    style={{
                      fontFamily: 'rssmall',
                      borderColor: 'var(--light-border)',
                      color: 'var(--primary-text)'
                    }}
                  >
                    {player.name}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
          
          {/* Legend */}
          <Card>
            <Card.Body>
              <Card.Title as="h5" style={{ 
                fontFamily: 'rsbold', 
                color: 'var(--orange)', 
                textShadow: '1.3px 1.3px var(--black)' 
              }}>
                Collection Log Legend
              </Card.Title>
              <div className="collection-log-legend mt-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="me-2" style={{ 
                    width: '20px', 
                    height: '20px', 
                    backgroundColor: 'transparent',
                    border: '1px solid var(--light-border)',
                    position: 'relative'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      top: '-5px', 
                      right: '-5px',
                      fontSize: '9px',
                      padding: '1px 3px',
                      backgroundColor: 'var(--success)',
                      color: 'white',
                      borderRadius: '3px',
                      fontFamily: 'rssmall'
                    }}>P</span>
                  </div>
                  <span>Plugin data (real-time from RuneLite)</span>
                </div>
                
                <div className="d-flex align-items-center mb-2">
                  <div className="me-2" style={{ 
                    width: '20px', 
                    height: '20px', 
                    backgroundColor: 'transparent',
                    border: '1px solid var(--info)',
                    boxShadow: '0 0 5px var(--info)',
                    position: 'relative'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      top: '-5px', 
                      right: '-5px',
                      fontSize: '9px',
                      padding: '1px 3px',
                      backgroundColor: 'var(--info)',
                      color: 'white',
                      borderRadius: '3px',
                      fontFamily: 'rssmall'
                    }}>W</span>
                  </div>
                  <span>Wise Old Man data (player achievements)</span>
                </div>
                
                <div className="d-flex align-items-center">
                  <div className="me-2" style={{ 
                    width: '20px', 
                    height: '20px', 
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--light-border)',
                    position: 'relative'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      top: '-5px', 
                      right: '-5px',
                      fontSize: '9px',
                      padding: '1px 3px',
                      backgroundColor: 'var(--warning)',
                      color: 'white',
                      borderRadius: '3px',
                      fontFamily: 'rssmall'
                    }}>K</span>
                  </div>
                  <span>Wiki data (item info only, not unlocks)</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CollectionLogPanel;
