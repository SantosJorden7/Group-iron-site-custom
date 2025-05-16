import React, { useContext, useEffect } from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { SlayerTaskPanel, ValuableDropsPanel, GroupChallengesPanel, SharedCalendarPanel, GroupMilestonesPanel, ActivitiesPanel } from '../features';
import { GroupContext } from '../contexts/GroupContext';
import { useSync } from '../contexts/SyncContext';
import SyncStatusWidget from './SyncStatusWidget';
import './Dashboard.css';

/**
 * Dashboard Component
 * 
 * Main dashboard layout for the Group Ironmen application.
 * Displays feature panels in a responsive grid layout.
 */
const Dashboard = () => {
  const { group } = useContext(GroupContext);
  const { performSync, syncState } = useSync();

  // Trigger data sync when dashboard loads
  useEffect(() => {
    // Only perform sync if automatic sync is enabled and there's no active sync
    if (!syncState.syncInProgress) {
      performSync();
    }
  }, []);

  return (
    <Container fluid className="dashboard-container">
      {/* Group Header */}
      <Row className="group-header mb-4">
        <Col>
          <Card className="group-card">
            <Card.Body>
              <h2 className="group-title">{group?.name || 'Group Ironmen'}</h2>
              {group && (
                <div className="group-info">
                  <p>Members: {group.members?.length || 0}</p>
                  <p>Created: {group.created_at ? new Date(group.created_at).toLocaleDateString() : 'Unknown'}</p>
                  {syncState.lastSyncTime && (
                    <p className="text-muted">
                      <small>
                        Last data sync: {new Date(syncState.lastSyncTime).toLocaleString()}
                      </small>
                    </p>
                  )}
                </div>
              )}
              
              {/* Display sync error if any */}
              {syncState.syncError && (
                <Alert variant="warning" className="mt-2 mb-0 p-2">
                  <small>
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    {syncState.syncError}
                  </small>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row>
        {/* Sidebar */}
        <Col lg={3} className="dashboard-sidebar mb-4">
          <SyncStatusWidget variant="sidebar" />
          
          {/* Members List Card */}
          <Card className="group-members-card mb-3">
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-people-fill me-2"></i>
                Group Members
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <ul className="list-group list-group-flush">
                {group && group.members && group.members.map((member) => (
                  <li key={member.name} className="list-group-item d-flex justify-content-between align-items-center">
                    {member.name}
                    {member.online && (
                      <span className="badge bg-success rounded-pill">Online</span>
                    )}
                  </li>
                ))}
                {(!group || !group.members || group.members.length === 0) && (
                  <li className="list-group-item text-center">
                    <em>No members found</em>
                  </li>
                )}
              </ul>
            </Card.Body>
          </Card>
        </Col>

        {/* Main Content Area */}
        <Col lg={9}>
          {/* Feature Panels */}
          <Row>
            {/* Group Milestones Panel - Added at the top */}
            <Col lg={12} className="mb-4">
              <GroupMilestonesPanel />
            </Col>
            
            {/* Activities Panel */}
            <Col lg={12} className="mb-4">
              <ActivitiesPanel />
            </Col>
            
            {/* Shared Calendar Panel */}
            <Col lg={12} className="mb-4">
              <SharedCalendarPanel />
            </Col>
            
            {/* Group Challenges Panel */}
            <Col lg={12} className="mb-4">
              <GroupChallengesPanel />
            </Col>
            
            {/* Slayer Tasks Panel */}
            <Col lg={12} className="mb-4">
              <SlayerTaskPanel />
            </Col>

            {/* Valuable Drops Panel */}
            <Col lg={12} className="mb-4">
              <ValuableDropsPanel />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
