import React, { useState, useEffect } from 'react';
import { Container, Card, Tabs, Tab, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { useSync } from '../contexts/SyncContext';

const Settings = () => {
  const { currentUser } = useAuth();
  const { group, updateGroup } = useGroup();
  const { syncState, updateSyncSettings, wikiState, updateWikiSettings, wikiService } = useSync();
  
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [generalForm, setGeneralForm] = useState({
    theme: 'light',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notifications: true,
    emailNotifications: true
  });
  
  const [privacyForm, setPrivacyForm] = useState({
    showOnlineStatus: true,
    showActivity: true,
    showAchievements: true,
    allowDMs: true,
    allowFriendRequests: true
  });
  
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    isPublic: true,
    allowMemberInvites: true
  });

  // Load user settings
  useEffect(() => {
    // In a real app, you would fetch these from your backend
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    if (savedSettings.general) setGeneralForm(prev => ({ ...prev, ...savedSettings.general }));
    if (savedSettings.privacy) setPrivacyForm(prev => ({ ...prev, ...savedSettings.privacy }));
    
    // Load group settings if available
    if (group) {
      setGroupForm(prev => ({
        ...prev,
        name: group.name || '',
        description: group.description || '',
        isPublic: group.isPublic !== false, // default to true if not set
        allowMemberInvites: group.allowMemberInvites !== false // default to true if not set
      }));
    }
  }, [group]);

  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGeneralForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePrivacyChange = (e) => {
    const { name, checked } = e.target;
    setPrivacyForm(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleGroupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGroupForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveSettings = async (section) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // In a real app, you would save these to your backend
      const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
      
      if (section === 'general') {
        savedSettings.general = generalForm;
        localStorage.setItem('userSettings', JSON.stringify(savedSettings));
      } else if (section === 'privacy') {
        savedSettings.privacy = privacyForm;
        localStorage.setItem('userSettings', JSON.stringify(savedSettings));
      } else if (section === 'group' && group) {
        // Update group settings in the backend
        await updateGroup({
          name: groupForm.name,
          description: groupForm.description,
          isPublic: groupForm.isPublic,
          allowMemberInvites: groupForm.allowMemberInvites
        });
      }
      
      setSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
      setTimeout(() => setSuccess(''), 3000); // Clear success message after 3 seconds
    } catch (err) {
      console.error(`Error saving ${section} settings:`, err);
      setError(err.message || `Failed to save ${section} settings`);
      setTimeout(() => setError(''), 5000); // Clear error after 5 seconds
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Settings</h2>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
        id="settings-tabs"
      >
        <Tab eventKey="general" title="General">
          <Card>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <h5 className="mb-4">General Settings</h5>
              <Form>
                <Row className="mb-3">
                  <Form.Group as={Col} controlId="formTheme">
                    <Form.Label>Theme</Form.Label>
                    <Form.Select 
                      name="theme" 
                      value={generalForm.theme}
                      onChange={handleGeneralChange}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System Default</option>
                    </Form.Select>
                  </Form.Group>
                  
                  <Form.Group as={Col} controlId="formLanguage">
                    <Form.Label>Language</Form.Label>
                    <Form.Select 
                      name="language" 
                      value={generalForm.language}
                      onChange={handleGeneralChange}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="pt">Português</option>
                    </Form.Select>
                  </Form.Group>
                </Row>
                
                <Form.Group className="mb-3" controlId="formTimezone">
                  <Form.Label>Timezone</Form.Label>
                  <Form.Select 
                    name="timezone" 
                    value={generalForm.timezone}
                    onChange={handleGeneralChange}
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formNotifications">
                  <Form.Check
                    type="switch"
                    id="notifications-switch"
                    label="Enable browser notifications"
                    name="notifications"
                    checked={generalForm.notifications}
                    onChange={handleGeneralChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formEmailNotifications">
                  <Form.Check
                    type="switch"
                    id="email-notifications-switch"
                    label="Enable email notifications"
                    name="emailNotifications"
                    checked={generalForm.emailNotifications}
                    onChange={handleGeneralChange}
                  />
                </Form.Group>
                
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="primary" 
                    onClick={() => saveSettings('general')}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="privacy" title="Privacy">
          <Card>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <h5 className="mb-4">Privacy Settings</h5>
              <Form>
                <Form.Group className="mb-3" controlId="formShowOnlineStatus">
                  <Form.Check
                    type="switch"
                    id="online-status-switch"
                    label="Show when I'm online"
                    name="showOnlineStatus"
                    checked={privacyForm.showOnlineStatus}
                    onChange={handlePrivacyChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formShowActivity">
                  <Form.Check
                    type="switch"
                    id="activity-switch"
                    label="Show my recent activity"
                    name="showActivity"
                    checked={privacyForm.showActivity}
                    onChange={handlePrivacyChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formShowAchievements">
                  <Form.Check
                    type="switch"
                    id="achievements-switch"
                    label="Show my achievements"
                    name="showAchievements"
                    checked={privacyForm.showAchievements}
                    onChange={handlePrivacyChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formAllowDMs">
                  <Form.Check
                    type="switch"
                    id="dms-switch"
                    label="Allow direct messages from other users"
                    name="allowDMs"
                    checked={privacyForm.allowDMs}
                    onChange={handlePrivacyChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formAllowFriendRequests">
                  <Form.Check
                    type="switch"
                    id="friend-requests-switch"
                    label="Allow friend requests"
                    name="allowFriendRequests"
                    checked={privacyForm.allowFriendRequests}
                    onChange={handlePrivacyChange}
                  />
                </Form.Group>
                
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="primary" 
                    onClick={() => saveSettings('privacy')}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        {group && (
          <Tab eventKey="group" title="Group Settings">
            <Card>
              <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                
                <h5 className="mb-4">Group Settings</h5>
                <Form>
                  <Form.Group className="mb-3" controlId="formGroupName">
                    <Form.Label>Group Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={groupForm.name}
                      onChange={handleGroupChange}
                      placeholder="Enter group name"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3" controlId="formGroupDescription">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={groupForm.description}
                      onChange={handleGroupChange}
                      placeholder="Enter a brief description of your group"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3" controlId="formGroupIsPublic">
                    <Form.Check
                      type="switch"
                      id="group-public-switch"
                      label="Make group public"
                      name="isPublic"
                      checked={groupForm.isPublic}
                      onChange={handleGroupChange}
                    />
                    <Form.Text className="text-muted">
                      Public groups can be found by other users in the group directory.
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3" controlId="formGroupAllowInvites">
                    <Form.Check
                      type="switch"
                      id="group-invites-switch"
                      label="Allow members to invite others"
                      name="allowMemberInvites"
                      checked={groupForm.allowMemberInvites}
                      onChange={handleGroupChange}
                    />
                  </Form.Group>
                  
                  <div className="d-flex justify-content-between">
                    <Button variant="outline-danger">
                      <i className="bi bi-trash me-2"></i>
                      Delete Group
                    </Button>
                    
                    <Button 
                      variant="primary" 
                      onClick={() => saveSettings('group')}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Tab>
        )}
        
        {/* New Wiki Integration Tab */}
        <Tab eventKey="wiki" title="Wiki Integration">
          <Card>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <h5 className="mb-4">Wiki Integration Settings</h5>
              <Form>
                <Form.Group className="mb-3" controlId="formWikiCacheEnabled">
                  <Form.Check
                    type="switch"
                    id="wiki-cache-switch"
                    label="Enable wiki data caching"
                    name="wikiCacheEnabled"
                    checked={wikiState.wikiCacheEnabled}
                    onChange={(e) => updateWikiSettings({ wikiCacheEnabled: e.target.checked })}
                  />
                  <Form.Text className="text-muted">
                    Caching improves performance but may provide slightly outdated information.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formPreferLiveData">
                  <Form.Check
                    type="switch"
                    id="prefer-live-data-switch"
                    label="Prefer live wiki data over cached data"
                    name="preferLiveData"
                    checked={wikiState.preferLiveData}
                    onChange={(e) => updateWikiSettings({ preferLiveData: e.target.checked })}
                  />
                  <Form.Text className="text-muted">
                    When enabled, the system will try to fetch fresh data from the wiki before using cached data.
                  </Form.Text>
                </Form.Group>
                
                <div className="d-flex justify-content-between">
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      wikiService.clearCache();
                      setSuccess('Wiki cache cleared successfully!');
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Clear Wiki Cache
                  </Button>
                  
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      updateWikiSettings(wikiState);
                      setSuccess('Wiki settings saved successfully!');
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        
        {/* New Data Sync Tab */}
        <Tab eventKey="sync" title="Data Sync">
          <Card>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <h5 className="mb-4">Data Synchronization Settings</h5>
              <Form>
                <Form.Group className="mb-3" controlId="formAutoSyncEnabled">
                  <Form.Check
                    type="switch"
                    id="auto-sync-switch"
                    label="Enable automatic background synchronization"
                    name="autoSyncEnabled"
                    checked={syncState.autoSyncEnabled}
                    onChange={(e) => updateSyncSettings({ autoSyncEnabled: e.target.checked })}
                  />
                  <Form.Text className="text-muted">
                    When enabled, data will be automatically synced on a regular interval.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formSyncInterval">
                  <Form.Label>Sync Interval (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="60"
                    name="syncInterval"
                    value={syncState.syncInterval}
                    onChange={(e) => updateSyncSettings({ syncInterval: parseInt(e.target.value, 10) })}
                    disabled={!syncState.autoSyncEnabled}
                  />
                  <Form.Text className="text-muted">
                    How often to automatically sync data when automatic sync is enabled.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formValuableDropThreshold">
                  <Form.Label>Valuable Drop Threshold (GP)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1000"
                    step="1000"
                    name="valuableDropThreshold"
                    value={syncState.valuableDropThreshold}
                    onChange={(e) => updateSyncSettings({ valuableDropThreshold: parseInt(e.target.value, 10) })}
                  />
                  <Form.Text className="text-muted">
                    Items worth more than this amount will be tracked as valuable drops.
                  </Form.Text>
                </Form.Group>
                
                <Row className="mb-3">
                  <Col>
                    <Card className="bg-light">
                      <Card.Body>
                        <h6 className="mb-2">Sync Status</h6>
                        <div className="mb-1">
                          <strong>Last Sync:</strong> {syncState.lastSyncTime 
                            ? new Date(syncState.lastSyncTime).toLocaleString() 
                            : 'Never'}
                        </div>
                        <div className="mb-1">
                          <strong>Status:</strong> {syncState.syncInProgress 
                            ? 'Syncing...' 
                            : syncState.syncError 
                              ? `Error: ${syncState.syncError}` 
                              : 'Idle'}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                <div className="d-flex justify-content-between">
                  <Button
                    variant="outline-primary"
                    onClick={() => {
                      setLoading(true);
                      setError('');
                      setSuccess('');
                      
                      window.syncInProgress = true;
                      setTimeout(() => {
                        window.syncInProgress = false;
                        setLoading(false);
                        setSuccess('Manual sync completed!');
                        setTimeout(() => setSuccess(''), 3000);
                      }, 1500);
                    }}
                    disabled={loading || syncState.syncInProgress}
                  >
                    {loading || syncState.syncInProgress ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Sync Now
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      updateSyncSettings(syncState);
                      setSuccess('Sync settings saved successfully!');
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Settings;
