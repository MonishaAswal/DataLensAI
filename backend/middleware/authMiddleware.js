import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to protect API routes by verifying the local JWT token signed with JWT_SECRET
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract JWT Token
      token = req.headers.authorization.split(' ')[1];

      // Verify token signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'datalenssecret123456789!');

      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: 'Not authorized, invalid token structure.' });
      }

      // Fetch user from MongoDB
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found.' });
      }

      // Populate req.user using MongoDB User document
      req.user = user;

      next();
    } catch (error) {
      console.error('[AuthMiddleware] Verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token validation failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};
