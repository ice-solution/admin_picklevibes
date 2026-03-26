const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', {
    title: '登入',
    error: req.query.error || null,
    returnTo: req.query.returnTo || '/',
  });
});

router.post('/login', async (req, res) => {
  const { username, password, returnTo } = req.body;
  const safeReturn = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/';

  if (!username || !password) {
    return res.redirect(`/login?error=${encodeURIComponent('請輸入帳號與密碼')}&returnTo=${encodeURIComponent(safeReturn)}`);
  }

  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user) {
    return res.redirect(`/login?error=${encodeURIComponent('帳號或密碼錯誤')}&returnTo=${encodeURIComponent(safeReturn)}`);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.redirect(`/login?error=${encodeURIComponent('帳號或密碼錯誤')}&returnTo=${encodeURIComponent(safeReturn)}`);
  }

  req.session.userId = user._id.toString();
  req.session.username = user.username;
  req.session.role = user.role;
  req.session.displayName = user.displayName || user.username;
  req.session.mustChangePassword = Boolean(user.mustChangePassword);

  if (req.session.mustChangePassword) return res.redirect('/account/password');
  return res.redirect(safeReturn);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
