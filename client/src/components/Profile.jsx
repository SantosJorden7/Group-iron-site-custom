import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';

const Profile = () => {
  const { currentUser, updateProfile } = useAuth();
  const { group, members } = useGroup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        displayName: currentUser.displayName || '',
        email: currentUser.email || ''
      }));
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      return setError('New passwords do not match');
    }

    try {
      setLoading(true);
      await updateProfile({
        displayName: formData.displayName,
        email: formData.email,
        password: formData.newPassword || undefined,
        currentPassword: formData.currentPassword || undefined
      });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Find current user in group members
  const userMemberInfo = members.find(member => 
    member.id === currentUser?.uid || 
    member.email === currentUser?.email
  );

  return (
    <Container className="py-4">
      <h2 className="mb-4">Profile</h2>
      
      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header as="h5">Account Information</Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                  <Form.Group as={Col} controlId="formDisplayName">
                    <Form.Label>Display Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group as={Col} controlId="formEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Row>
                
                <h5 className="mt-4 mb-3">Change Password</h5>
                
                <Form.Group className="mb-3" controlId="formCurrentPassword">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current password"
                  />
                </Form.Group>
                
                <Row className="mb-3">
                  <Form.Group as={Col} controlId="formNewPassword">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Leave blank to keep current password"
                    />
                  </Form.Group>
                  
                  <Form.Group as={Col} controlId="formConfirmPassword">
                    <Form.Label>Confirm New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                    />
                  </Form.Group>
                </Row>
                
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="primary" 
                    type="submit"
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
                        Updating...
                      </>
                    ) : 'Update Profile'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header as="h5">Group Information</Card.Header>
            <Card.Body>
              {group ? (
                <>
                  <div className="d-flex align-items-center mb-3">
                    <div className="flex-shrink-0 me-3">
                      <div 
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
                        style={{ width: '60px', height: '60px', fontSize: '24px' }}
                      >
                        {group.name?.charAt(0)?.toUpperCase() || 'G'}
                      </div>
                    </div>
                    <div>
                      <h5 className="mb-0">{group.name}</h5>
                      <p className="text-muted mb-0">
                        {members.length} {members.length === 1 ? 'Member' : 'Members'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Group Members</h6>
                    <div className="list-group">
                      {members.map(member => (
                        <div 
                          key={member.id} 
                          className="list-group-item list-group-item-action d-flex align-items-center"
                        >
                          <div className="flex-shrink-0 me-3">
                            <div 
                              className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                              style={{ width: '40px', height: '40px' }}
                            >
                              {member.username?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center">
                              <h6 className="mb-0">{member.username}</h6>
                              {member.rank === 'Leader' && (
                                <span className="badge bg-primary">Leader</span>
                              )}
                            </div>
                            <small className="text-muted">
                              Joined {new Date(member.joinDate).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No group information available</p>
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header as="h5">Account Actions</Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-danger">
                  <i className="bi bi-trash me-2"></i>
                  Delete Account
                </Button>
                <Button variant="outline-secondary">
                  <i className="bi bi-download me-2"></i>
                  Export Data
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;
