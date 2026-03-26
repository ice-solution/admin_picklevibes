const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.get('/', async (req, res) => {
  const users = await User.find().sort({ username: 1 }).select('-passwordHash').lean();
  res.render('users/list', {
    title: '使用者管理',
    activeNav: 'users',
    users,
    error: req.query.error || null,
  });
});

router.post('/', async (req, res) => {
  const { username, password, role, displayName } = req.body;
  const u = String(username || '')
    .toLowerCase()
    .trim();
  if (!u || !password) {
    return res.redirect('/users?error=' + encodeURIComponent('請填寫帳號與密碼'));
  }
  const r = role === 'admin' ? 'admin' : 'user';
  const exists = await User.findOne({ username: u });
  if (exists) {
    return res.redirect('/users?error=' + encodeURIComponent('帳號已存在'));
  }
  const passwordHash = await bcrypt.hash(String(password), 12);
  await User.create({
    username: u,
    passwordHash,
    role: r,
    displayName: displayName ? String(displayName).trim() : '',
  });
  res.redirect('/users');
});

router.post('/:id/role', async (req, res) => {
  const { role } = req.body;
  if (role !== 'admin' && role !== 'user') {
    return res.redirect('/users?error=' + encodeURIComponent('角色無效'));
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.redirect('/users');
  if (user.username === (process.env.DEFAULT_ADMIN_USERNAME || 'admin').toLowerCase() && role !== 'admin') {
    return res.redirect('/users?error=' + encodeURIComponent('無法降權預設管理員'));
  }
  user.role = role;
  await user.save();
  res.redirect('/users');
});

module.exports = router;
