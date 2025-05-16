/**
 * Authentication Middleware for Mock API Server
 * Validates the authorization token for API requests
 */

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check if auth header exists
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Missing authorization header'
    });
  }
  
  // Simple token validation - in a real implementation, this would verify JWT or other tokens
  // For mock server purposes, we'll just check if it starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Invalid token format. Must be Bearer token'
    });
  }
  
  // In a production environment, you would validate the token against a secret
  // For the mock server, we'll accept any non-empty token after "Bearer "
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      error: 'Empty token provided'
    });
  }
  
  // Token is valid, proceed to the next middleware/route handler
  next();
};
