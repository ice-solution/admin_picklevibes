const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function ensureDefaultAdmin() {
  const count = await User.countDocuments();
  if (count > 0) return null;

  const username = (process.env.DEFAULT_ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin_password';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await User.create({
    username,
    passwordHash,
    role: 'admin',
    displayName: 'Administrator',
  });

  console.log(`[seed] Created default admin user: ${username}`);
  return admin;
}

module.exports = { ensureDefaultAdmin };
