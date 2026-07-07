import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT token — 30-day session
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'datalenssecret123456789!', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    // Normalise email before lookup
    const normalisedEmail = String(email).toLowerCase().trim();

    // Check if user exists
    const userExists = await User.findOne({ email: normalisedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user (password hashing happens in the pre-save hook or the fallback DB)
    const user = await User.create({
      name,
      email: normalisedEmail,
      password,
    });

    if (user) {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data received' });
    }
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please add email and password' });
    }

    // Normalise email for case-insensitive lookup
    const normalisedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalisedEmail });

    if (!user) {
      console.warn(`[Auth] Login attempt failed — no account found for email: ${normalisedEmail}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatch = await user.matchPassword(password);
    if (!passwordMatch) {
      console.warn(`[Auth] Login attempt failed — incorrect password for: ${normalisedEmail}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log(`[Auth] Successful login for user: ${normalisedEmail} (${user._id})`);
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get user details (profile)
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const u = req.user;
    return res.status(200).json({
      _id: u._id || u.id,
      id: u._id || u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error retrieving profile' });
  }
};
