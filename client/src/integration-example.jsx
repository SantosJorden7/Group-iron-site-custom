/**
 * Integration Example
 * 
 * This file demonstrates how to import and use the ValuableDropsPanel component
 * in your main application. Copy the relevant parts to your main app component.
 */
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { SlayerTaskPanel, ValuableDropsPanel } from './features';

/**
 * Sample Dashboard Component
 * Shows how to integrate the Valuable Drops and Slayer Task panels 
 * into your application layout.
 */
const Dashboard = () => {
  return (
    <Container fluid>
      {/* Main content */}
      <Row>
        <Col lg={12}>
          {/* Existing content... */}
          
          {/* Slayer Task Panel */}
          <SlayerTaskPanel />
          
          {/* Valuable Drops Panel */}
          <ValuableDropsPanel />
          
          {/* Other content... */}
        </Col>
      </Row>
    </Container>
  );
};

/**
 * Tab-based Layout Example
 * Shows how to integrate the panels in a tabbed layout.
 */
const TabbedLayout = () => {
  return (
    <Container fluid>
      <Tabs defaultActiveKey="inventory" className="mb-3">
        <Tab eventKey="inventory" title="Inventory">
          {/* Inventory content... */}
        </Tab>
        
        <Tab eventKey="slayer" title="Slayer Tasks">
          <SlayerTaskPanel />
        </Tab>
        
        <Tab eventKey="drops" title="Valuable Drops">
          <ValuableDropsPanel />
        </Tab>
        
        {/* Other tabs... */}
      </Tabs>
    </Container>
  );
};

/**
 * Side-by-side Layout Example
 * Shows the components displayed next to each other.
 */
const SideBySideLayout = () => {
  return (
    <Container fluid>
      <Row>
        <Col lg={6}>
          <SlayerTaskPanel />
        </Col>
        <Col lg={6}>
          <ValuableDropsPanel />
        </Col>
      </Row>
    </Container>
  );
};

export { Dashboard, TabbedLayout, SideBySideLayout };
