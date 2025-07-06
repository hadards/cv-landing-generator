const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // In a real app, you'd fetch user data from database
      // For now, we'll return the decoded token data
      res.status(200).json({
        success: true,
        user: {
          id: decoded.userId,
          email: decoded.email
        }
      });
    } catch (jwtError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: error.message
    });
  }
}