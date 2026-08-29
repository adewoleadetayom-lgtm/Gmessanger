const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_BEFORE_PRODUCTION';

const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]');
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify(users, null, 2)
  );
}

function findUserById(id) {
  return readUsers().find(user => user.id === Number(id));
}

function findUserByPhone(phone) {
  return readUsers().find(user => user.phone === phone);
}

function findUserByUsername(username) {
  return readUsers().find(user => user.username === username);
}

function createUser(phone) {
  const users = readUsers();

  const user = {
    id: users.length
      ? Math.max(...users.map(u => Number(u.id) || 0)) + 1
      : 1,
    phone,
    name: null,
    username: null,
    security_pin_hash: null,
    recovery_email: null,
    two_step_enabled: 0,
    created_at: new Date().toISOString()
  };

  users.push(user);
  writeUsers(users);

  return user;
}

function updateUser(id, changes) {
  const users = readUsers();
  const index = users.findIndex(
    user => Number(user.id) === Number(id)
  );

  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...changes
  };

  writeUsers(users);

  return users[index];
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'www')));



function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}

/*
  Health check
*/
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'G Messenger',
    version: '1.0.0'
  });
});

/*
  Register / find account by phone
*/
app.post('/api/auth/register', (req, res) => {
  const phone = String(req.body.phone || '').trim();

  if (phone.length < 7) {
    return res.status(400).json({
      error: 'Enter a valid phone number'
    });
  }

  let user = findUserByPhone(phone);

  if (!user) {
    user = createUser(phone);
  }

  res.json({
    ok: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      username: user.username,
      profileComplete: Boolean(user.name && user.username),
      twoStepEnabled: Boolean(user.two_step_enabled)
    }
  });
});

/*
  Development verification endpoint.

  IMPORTANT:
  This is NOT real SMS verification.
  Real SMS verification will be connected later.
*/
app.post('/api/auth/verify', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const code = String(req.body.code || '').trim();

  if (phone.length < 7 || !/^[0-9]{6}$/.test(code)) {
    return res.status(400).json({
      error: 'Invalid phone or verification code'
    });
  }

  const user = findUserByPhone(phone);

  if (!user) {
    return res.status(404).json({
      error: 'Account not found'
    });
  }

  const token = createToken(user);

  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      username: user.username,
      profileComplete: Boolean(user.name && user.username),
      twoStepEnabled: Boolean(user.two_step_enabled)
    }
  });
});

/*
  Update profile
*/
app.post('/api/profile', authRequired, (req, res) => {
  const name = String(req.body.name || '').trim();
  const username = String(req.body.username || '').trim();

  if (name.length < 2) {
    return res.status(400).json({
      error: 'Name is too short'
    });
  }

  if (username.length < 3) {
    return res.status(400).json({
      error: 'Username is too short'
    });
  }

  const existing = findUserByUsername(username);

  if (existing && Number(existing.id) !== Number(req.user.id)) {
    return res.status(409).json({
      error: 'Username already exists'
    });
  }

  updateUser(req.user.id, {
    name,
    username
  });

  res.json({
    ok: true,
    message: 'Profile updated'
  });
});

/*
  Enable Two-Step Verification
*/
app.post('/api/security/two-step', authRequired, async (req, res) => {
  const pin = String(req.body.pin || '').trim();
  const recoveryEmail = String(req.body.recoveryEmail || '').trim();

  if (!/^[0-9]{6}$/.test(pin)) {
    return res.status(400).json({
      error: 'PIN must contain exactly 6 digits'
    });
  }

  const hash = await bcrypt.hash(pin, 12);

  updateUser(req.user.id, {
    security_pin_hash: hash,
    recovery_email: recoveryEmail || null,
    two_step_enabled: 1
  });

  res.json({
    ok: true,
    message: 'Two-Step Verification enabled'
  });
});

/*
  Get current account
*/
app.get('/api/me', authRequired, (req, res) => {
  const user = findUserById(req.user.id);

  if (user) {
    delete user.security_pin_hash;
  }

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  res.json({
    ok: true,
    user
  });
});

/*
  Logout

  JWT itself remains valid until expiry.
  A production version will add server-side
  session/token revocation.
*/
app.post('/api/auth/logout', authRequired, (req, res) => {
  res.json({
    ok: true,
    message: 'Logged out'
  });
});

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`G Messenger server running on port ${PORT}`);
});
