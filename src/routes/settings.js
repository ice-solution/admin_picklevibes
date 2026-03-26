const express = require('express');
const Store = require('../models/Store');

const router = express.Router();

router.get('/settings/stores', async (req, res) => {
  const stores = await Store.find().sort({ active: -1, name: 1 }).lean();
  res.render('settings/stores', {
    title: '店舖設定',
    activeNav: 'settings',
    stores,
    error: req.query.error || null,
  });
});

router.post('/settings/stores', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.redirect('/settings/stores?error=' + encodeURIComponent('請輸入店舖名稱'));
  const exists = await Store.findOne({ name });
  if (exists) return res.redirect('/settings/stores?error=' + encodeURIComponent('店舖已存在'));
  await Store.create({ name, active: true });
  res.redirect('/settings/stores');
});

router.post('/settings/stores/:id/toggle', async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.redirect('/settings/stores');
  store.active = !store.active;
  await store.save();
  res.redirect('/settings/stores');
});

module.exports = router;

