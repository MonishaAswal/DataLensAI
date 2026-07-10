import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

/**
 * Middleware to protect API routes by verifying the Clerk session JWT
 */
export const protect = async (req, res, next) => {
  // Use Clerk's built-in Express session verifier middleware
  ClerkExpressWithAuth()(req, res, async (err) => {
    if (err) {
      console.error('[Clerk AuthMiddleware] Token verification exception:', err);
      return res.status(401).json({ message: 'Not authorized, token validation failed.' });
    }

    if (!req.auth || !req.auth.userId) {
      console.warn('[Clerk AuthMiddleware] Unauthenticated access blocked.');
      return res.status(401).json({ message: 'Not authorized, no active Clerk session found.' });
    }

    // Map req.user to match expected user ID format in controllers
    req.user = {
      _id: req.auth.userId,
      id: req.auth.userId,
      clerkId: req.auth.userId,
    };

    next();
  });
};
