import React, { lazy, Suspense, Component, useContext, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Navbar, Nav, NavDropdown, Alert, Button, Spinner } from 'react-bootstrap';
import { GroupProvider, useGroup } from './contexts/GroupContext';
import { SyncProvider, useSync } from './contexts/SyncContext';
import { useAuth } from './contexts/AuthContext';
import SyncStatusWidget from './components/SyncStatusWidget';
import CollectionLogIntegration from './features/collection-log/CollectionLogIntegration';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Optionally navigate to home or previous page
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center p-4" style={{ maxWidth: '600px' }}>
            <h1 className="text-danger mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Something went wrong
            </h1>
            <p className="lead">We're sorry, but an unexpected error occurred.</p>
            <div className="alert alert-danger text-start">
              <p className="mb-1 fw-bold">Error Details:</p>
              <code className="d-block p-2 bg-dark text-white rounded mb-3">
                {this.state.error?.message || 'Unknown error'}
              </code>
              <p className="mb-0">
                Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={this.handleReset} className="me-2">
                <i className="bi bi-house-fill me-1"></i> Go to Home
              </Button>
              <Button variant="outline-secondary" onClick={() => window.location.reload()}>
                <i className="bi bi-arrow-clockwise me-1"></i> Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load feature components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const SlayerTasks = lazy(() => import('./features/slayer-tasks/SlayerTaskPanel'));
const ValuableDrops = lazy(() => import('./features/valuable-drops/ValuableDropsPanel'));
const Activities = lazy(() => import('./features/activities/ActivitiesPanel'));
const BossStrategy = lazy(() => import('./features/boss-strategy/BossStrategyPanel'));
const GroupChallenges = lazy(() => import('./features/group-challenges/GroupChallengesPanel'));
const SharedCalendar = lazy(() => import('./features/shared-calendar/SharedCalendarPanel'));
const GroupMilestones = lazy(() => import('./features/group-milestones/GroupMilestonesPanel'));
const CollectionLog = lazy(() => import('./features/collection-log/CollectionLogPanel'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Main Layout Component
const MainLayout = ({ children }) => {
  const location = useLocation();
  const activeRoute = location.pathname;
  const { group } = useGroup();
  const { syncState } = useSync();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <>
      <div className="d-flex flex-column vh-100">
        {/* Invisible integration components */}
        <CollectionLogIntegration />
        
        {/* Navigation */}
        <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="main-navbar">
          <Container>
            <Navbar.Brand as={Link} to="/">
              <img
                src="/logo192.png"
                width="30"
                height="30"
                className="d-inline-block align-top me-2"
                alt="Group Ironmen Logo"
              />
              Group Ironmen
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/dashboard" className={activeRoute === '/dashboard' ? 'active' : ''}>
                  <i className="bi bi-house-door me-1"></i> Dashboard
                </Nav.Link>
                <NavDropdown 
                  title={<span><i className="bi bi-list-check me-1"></i> Features</span>} 
                  id="nav-dropdown"
                  active={['/slayer-tasks', '/valuable-drops', '/activities', '/boss-strategy', 
                          '/group-challenges', '/shared-calendar', '/group-milestones', '/collection-log'].includes(activeRoute)}
                >
                  <NavDropdown.Item as={Link} to="/slayer-tasks" className={activeRoute === '/slayer-tasks' ? 'active' : ''}>
                    <i className="bi bi-check2-square me-1"></i> Slayer Tasks
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/valuable-drops" className={activeRoute === '/valuable-drops' ? 'active' : ''}>
                    <i className="bi bi-gem me-1"></i> Valuable Drops
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/activities" className={activeRoute === '/activities' ? 'active' : ''}>
                    <i className="bi bi-activity me-1"></i> Activities
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/boss-strategy" className={activeRoute === '/boss-strategy' ? 'active' : ''}>
                    <i className="bi bi-shield-fill me-1"></i> Boss Strategy
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/group-challenges" className={activeRoute === '/group-challenges' ? 'active' : ''}>
                    <i className="bi bi-trophy me-1"></i> Group Challenges
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/shared-calendar" className={activeRoute === '/shared-calendar' ? 'active' : ''}>
                    <i className="bi bi-calendar-event me-1"></i> Shared Calendar
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/group-milestones" className={activeRoute === '/group-milestones' ? 'active' : ''}>
                    <i className="bi bi-flag me-1"></i> Group Milestones
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/collection-log" className={activeRoute === '/collection-log' ? 'active' : ''}>
                    <i className="bi bi-journal-bookmark me-1"></i> Collection Log
                  </NavDropdown.Item>
                </NavDropdown>
              </Nav>
              <Nav>
                <NavDropdown
                  title={
                    <>
                      <i className="bi bi-person-circle me-1"></i>
                      {currentUser?.displayName || 'User'}
                    </>
                  }
                  align="end"
                  id="user-dropdown"
                >
                  <NavDropdown.Item as={Link} to="/profile">
                    <i className="bi bi-person me-2"></i>Profile
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/settings">
                    <i className="bi bi-gear me-2"></i>Settings
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </Nav>
              
              {/* Sync Status Indicator */}
              <SyncStatusWidget variant="inline" />
            </Navbar.Collapse>
          </Container>
        </Navbar>

        {/* Main Content */}
        <main className="flex-grow-1">
          <Container>
            {children}
          </Container>
        </main>

        {/* Footer */}
        <footer className="bg-dark text-white py-4 mt-4">
          <Container className="text-center">
            <p className="mb-0">
              &copy; {new Date().getFullYear()} Group Ironmen Tracker | Not affiliated with Jagex Ltd.
            </p>
          </Container>
        </footer>
      </div>
    </>
  );
};

// Main Application Component
// 
// Provides the application shell with routing and global context.
const App = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if user is logged in and on the root path
  useEffect(() => {
    if (currentUser && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  return (
    <GroupProvider>
      <SyncProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<div>Login Page (TODO: Implement)</div>} />
              <Route path="/register" element={<div>Register Page (TODO: Implement)</div>} />
              <Route path="/forgot-password" element={<div>Forgot Password (TODO: Implement)</div>} />
              
              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/slayer"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SlayerTasks />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/boss"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <BossStrategy />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drops"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ValuableDrops />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/challenges"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <GroupChallenges />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/milestones"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <GroupMilestones />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SharedCalendar />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activities"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Activities />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/collection-log"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CollectionLog />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Profile />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* 404 Route */}
              <Route path="*" element={<div>404 - Page Not Found</div>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </SyncProvider>
    </GroupProvider>
  );
};

export default App;
