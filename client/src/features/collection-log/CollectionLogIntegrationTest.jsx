import React, { useState, useEffect } from 'react';
import { useSync } from '../../contexts/SyncContext';
import { Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './collection-log-styles.css';

/**
 * Integration Test Component for Collection Log
 * This component provides a UI to test the Collection Log integration with
 * various data sources and verify its functionality.
 */
const CollectionLogIntegrationTest = () => {
  const { syncState, syncCollectionLog, wikiService, wiseOldManService, collectionLogService } = useSync();
  const [testStatus, setTestStatus] = useState({
    running: false,
    results: [],
    error: null
  });

  // Test services initialization
  useEffect(() => {
    const testInitialization = async () => {
      try {
        setTestStatus(prev => ({
          ...prev,
          running: true,
          results: [...prev.results, 'Starting initialization test...']
        }));

        // Check that services are initialized
        let results = [];
        
        // Test Wiki Service
        if (wikiService) {
          results.push('✓ Wiki Service is initialized');
          try {
            const searchResult = await wikiService.search('Dragon warhammer');
            if (searchResult && searchResult.length > 0) {
              results.push('✓ Wiki Service search is working');
            } else {
              results.push('⚠ Wiki Service search returned no results');
            }
          } catch (error) {
            results.push(`✗ Wiki Service search error: ${error.message}`);
          }
        } else {
          results.push('✗ Wiki Service is not initialized');
        }
        
        // Test Wise Old Man Service
        if (wiseOldManService) {
          results.push('✓ Wise Old Man Service is initialized');
        } else {
          results.push('✗ Wise Old Man Service is not initialized');
        }
        
        // Test Collection Log Service
        if (collectionLogService) {
          results.push('✓ Collection Log Service is initialized');
        } else {
          results.push('✗ Collection Log Service is not initialized');
        }
        
        // Set test status
        setTestStatus(prev => ({
          ...prev,
          running: false,
          results: [...prev.results, ...results]
        }));
      } catch (error) {
        setTestStatus(prev => ({
          ...prev,
          running: false,
          error: error.message,
          results: [...prev.results, `✗ Test error: ${error.message}`]
        }));
      }
    };
    
    // Run the initialization test when the component mounts
    testInitialization();
  }, [wikiService, wiseOldManService, collectionLogService]);

  // Handle running a manual sync test
  const handleSyncTest = async () => {
    try {
      setTestStatus(prev => ({
        ...prev,
        running: true,
        results: [...prev.results, 'Starting manual sync test...']
      }));
      
      const syncResult = await syncCollectionLog();
      
      if (syncResult) {
        setTestStatus(prev => ({
          ...prev,
          running: false,
          results: [...prev.results, '✓ Manual sync completed successfully']
        }));
      } else {
        setTestStatus(prev => ({
          ...prev,
          running: false,
          results: [...prev.results, '⚠ Manual sync returned false']
        }));
      }
    } catch (error) {
      setTestStatus(prev => ({
        ...prev,
        running: false,
        error: error.message,
        results: [...prev.results, `✗ Sync error: ${error.message}`]
      }));
    }
  };

  // Test injecting a collection log item
  const handleInjectTest = () => {
    try {
      setTestStatus(prev => ({
        ...prev,
        running: true,
        results: [...prev.results, 'Testing DOM injection...']
      }));
      
      // Create a collection log test container
      const testContainer = document.createElement('div');
      testContainer.id = 'collection-log-test-container';
      testContainer.style.border = '1px solid var(--light-border)';
      testContainer.style.borderRadius = '4px';
      testContainer.style.padding = '15px';
      testContainer.style.marginTop = '20px';
      testContainer.style.backgroundColor = 'var(--elevated)';
      
      // Create a test collection log item
      const itemElement = document.createElement('collection-log-item');
      itemElement.setAttribute('item-id', '11815'); // Dragon warhammer
      itemElement.setAttribute('player-name', 'TestPlayer');
      
      // Create the inner structure (similar to real collection log items)
      const itemContainer = document.createElement('div');
      itemContainer.className = 'item';
      itemContainer.style.width = '36px';
      itemContainer.style.height = '36px';
      itemContainer.style.backgroundColor = 'var(--background)';
      itemContainer.style.border = '1px solid var(--light-border)';
      itemContainer.style.display = 'flex';
      itemContainer.style.alignItems = 'center';
      itemContainer.style.justifyContent = 'center';
      
      // Add the item icon (simple placeholder)
      const itemIcon = document.createElement('div');
      itemIcon.textContent = 'DWH';
      itemIcon.style.fontFamily = 'rssmall';
      itemIcon.style.fontSize = '10px';
      itemIcon.style.color = 'var(--primary-text)';
      
      // Assemble the components
      itemContainer.appendChild(itemIcon);
      itemElement.appendChild(itemContainer);
      testContainer.appendChild(itemElement);
      
      // Add test container to the document body or a specific target element
      const targetElement = document.getElementById('collection-log-integration-test');
      if (targetElement) {
        targetElement.appendChild(testContainer);
        
        // Trigger the collection log refresher
        if (window.collectionLogIntegration?.refreshCollectionLog) {
          window.collectionLogIntegration.refreshCollectionLog();
          
          setTestStatus(prev => ({
            ...prev,
            running: false,
            results: [...prev.results, '✓ Test item injected and refresh triggered']
          }));
        } else {
          setTestStatus(prev => ({
            ...prev,
            running: false,
            results: [...prev.results, '⚠ Refresh function not found in window integration']
          }));
        }
      } else {
        throw new Error('Test container element not found');
      }
    } catch (error) {
      setTestStatus(prev => ({
        ...prev,
        running: false,
        error: error.message,
        results: [...prev.results, `✗ Injection error: ${error.message}`]
      }));
    }
  };

  return (
    <Container className="mt-4 mb-4">
      <Card className="collection-log-sources-panel">
        <Card.Body>
          <h4 className="collection-log-title">Collection Log Integration Test</h4>
          
          {testStatus.error && (
            <Alert variant="danger" className="collection-log-error">
              {testStatus.error}
            </Alert>
          )}
          
          <Row className="mb-3 mt-3">
            <Col>
              <Button 
                className="collection-log-sync-button" 
                onClick={handleSyncTest}
                disabled={testStatus.running || syncState.syncInProgress}
              >
                {testStatus.running || syncState.syncInProgress ? (
                  <>
                    <div className="spinner"></div>
                    <span>Syncing...</span>
                  </>
                ) : 'Test Manual Sync'}
              </Button>
              
              <Button 
                className="collection-log-sync-button ms-2" 
                onClick={handleInjectTest}
                disabled={testStatus.running}
              >
                Test DOM Integration
              </Button>
            </Col>
          </Row>
          
          <div className="source-list">
            <h5 className="source-name">Test Results:</h5>
            {testStatus.results.map((result, index) => (
              <div key={index} className="source-item">
                <div className="source-name">{result}</div>
              </div>
            ))}
          </div>
          
          <div id="collection-log-integration-test" className="mt-3">
            {/* Test items will be injected here */}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CollectionLogIntegrationTest;
