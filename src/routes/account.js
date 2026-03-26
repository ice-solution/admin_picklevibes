const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.get('/account/password', (req, res) => {
  res.render('account/password', {
    title: '更改密碼',
    activeNav: '',
    error: req.query.error || null,
    success: req.query.success || null,
    mustChangePassword: Boolean(req.session.mustChangePassword),
  });
});

router.post('/account/password', async (req, res) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  if (!newPassword || String(newPassword).length < 8) {
    return res.redirect('/account/password?error=' + encodeURIComponent('新密碼至少 8 個字元'));
  }
  if (String(newPassword) !== String(newPasswordConfirm)) {
    return res.redirect('/account/password?error=' + encodeURIComponent('兩次輸入的新密碼不一致'));
  }

  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/logout');

  // 若不是首次強制改密碼，要求輸入舊密碼
  if (!req.session.mustChangePassword) {
    const ok = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
    if (!ok) {
      return res.redirect('/account/password?error=' + encodeURIComponent('目前密碼錯誤'));
    }
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), 12);
  user.mustChangePassword = false;
  await user.save();

  req.session.mustChangePassword = false;
  return res.redirect('/?password=changed');
});

module.exports = router;

