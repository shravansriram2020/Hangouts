const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { containsProfanity, getProfanityError } = require('../utils/profanityFilter');
const { generateVerificationCode, sendVerificationEmail } = require('../utils/emailService');

const router = express.Router();

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
};

router.post('/send-code', async (req, res) => {
  const { email, username, firstName, lastName, password, agreedToTerms, agreedToPrivacy } = req.body;

  console.log('[Auth] Send-code request for email:', email);

  if (!email || !username || !firstName || !lastName || !password) {
    console.log('[Auth] Send-code failed: Missing required fields');
    return res.status(400).json({ error: 'All fields are required' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  if (!agreedToTerms || !agreedToPrivacy) {
    return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy' });
  }

  if (containsProfanity(username)) {
    return res.status(400).json({ error: getProfanityError('username') });
  }

  if (containsProfanity(firstName) || containsProfanity(lastName)) {
    return res.status(400).json({ error: getProfanityError('name') });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'DELETE FROM verification_codes WHERE email = $1',
      [email.toLowerCase()]
    );

    await pool.query(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), code, expiresAt]
    );

    try {
      await sendVerificationEmail(email, code);
      res.json({ message: 'Verification code sent' });
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      console.error('Email error details:', emailError);
      // In development, return the code if email fails (Resend test mode limitation)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV MODE] Verification code for ${email}: ${code}`);
        res.json({ 
          message: 'Verification code sent', 
          devCode: code,
          devNote: 'Email service in test mode - use this code to verify'
        });
      } else {
        // Include error hint for debugging (safe to expose)
        const errorHint = emailError.message?.includes('domain') ? 'domain_issue' : 
                          emailError.message?.includes('API') ? 'api_issue' : 
                          emailError.message?.includes('configured') ? 'config_issue' : 'unknown';
        console.error('[Auth] Email error hint:', errorHint, emailError.message);
        res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      }
    }
  } catch (error) {
    console.error('[Auth] Send code error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

router.post('/verify-code', async (req, res) => {
  console.log('[Auth] Verify-code request received');
  const { email, code, username, firstName, lastName, password, agreedToTerms, agreedToPrivacy } = req.body;

  if (!email || !code || !username || !firstName || !lastName || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  if (!agreedToTerms || !agreedToPrivacy) {
    return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy' });
  }

  if (containsProfanity(username)) {
    return res.status(400).json({ error: getProfanityError('username') });
  }

  if (containsProfanity(firstName) || containsProfanity(lastName)) {
    return res.status(400).json({ error: getProfanityError('name') });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const codeResult = await pool.query(
      'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()',
      [email.toLowerCase(), code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    await pool.query(
      'UPDATE verification_codes SET used = TRUE WHERE email = $1 AND code = $2',
      [email.toLowerCase(), code]
    );

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, username, first_name, last_name, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, first_name, last_name, profile_photo, tutorial_completed`,
      [email.toLowerCase(), username.toLowerCase(), firstName, lastName, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePhoto: user.profile_photo,
        tutorialCompleted: user.tutorial_completed
      },
      token
    });
  } catch (error) {
    console.error('[Auth] Verify code error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to verify code. Please try again.' });
  }
});

router.post('/signup', async (req, res) => {
  const { email, username, firstName, lastName, password, agreedToTerms, agreedToPrivacy } = req.body;

  console.log('[Auth] Signup request for email:', email);

  if (!email || !username || !firstName || !lastName || !password) {
    console.log('[Auth] Signup failed: Missing required fields');
    return res.status(400).json({ error: 'All fields are required' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  if (!agreedToTerms || !agreedToPrivacy) {
    return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy' });
  }

  if (containsProfanity(username)) {
    return res.status(400).json({ error: getProfanityError('username') });
  }

  if (containsProfanity(firstName) || containsProfanity(lastName)) {
    return res.status(400).json({ error: getProfanityError('name') });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, username, first_name, last_name, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, first_name, last_name, profile_photo, tutorial_completed`,
      [email.toLowerCase(), username.toLowerCase(), firstName, lastName, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePhoto: user.profile_photo,
        tutorialCompleted: user.tutorial_completed
      },
      token
    });
  } catch (error) {
    console.error('[Auth] Signup error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  console.log('[Auth] Signin attempt for email:', email);

  if (!email || !password) {
    console.log('[Auth] Signin failed: Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('[Auth] Signin failed: User not found for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log('[Auth] Signin failed: Invalid password for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    console.log('[Auth] Signin successful for user:', user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePhoto: user.profile_photo,
        tutorialCompleted: user.tutorial_completed,
        locationEnabled: user.location_enabled,
        exploreVisibility: user.explore_visibility || 'public'
      },
      token
    });
  } catch (error) {
    console.error('[Auth] Signin error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to sign in. Please try again.' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, first_name, last_name, profile_photo, location_enabled, tutorial_completed, explore_visibility FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      profilePhoto: user.profile_photo,
      locationEnabled: user.location_enabled,
      tutorialCompleted: user.tutorial_completed,
      exploreVisibility: user.explore_visibility || 'public'
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
