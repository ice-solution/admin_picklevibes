const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Transaction = require('../models/Transaction');
const { CATEGORIES, isAllowedCategory, isValidCategoryForUpdate } = require('../config/categories');
const Store = require('../models/Store');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../public/uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('僅支援 JPEG、PNG、GIF、WebP 圖片'));
  },
});

function parseDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

router.get('/', async (req, res) => {
  const { type, from, to, category, store } = req.query;

  const stores = await Store.find({ active: true }).sort({ name: 1 }).lean();
  const storeParamRequested = store && String(store).trim() ? String(store).trim() : '';
  const activeStoreIds = new Set(stores.map((s) => String(s._id)));
  const storeParam = storeParamRequested && activeStoreIds.has(storeParamRequested) ? storeParamRequested : (stores[0] ? String(stores[0]._id) : '');

  const q = {};
  if (type === 'income' || type === 'expense') q.type = type;
  if (category && String(category).trim()) q.category = String(category).trim();
  if (storeParam) q.store = storeParam;

  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      q.date.$lte = end;
    }
  }

  const items = storeParam
    ? await Transaction.find(q)
        .sort({ date: -1, createdAt: -1 })
        .populate('createdBy', 'username displayName')
        .populate('store', 'name active')
        .lean()
    : [];

  const totals = items.reduce(
    (acc, row) => {
      if (row.type === 'income') acc.income += row.amount;
      else acc.expense += row.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  res.render('transactions/list', {
    title: '單據與收支',
    activeNav: 'tx',
    categories: CATEGORIES,
    stores,
    items,
    totals,
    net: totals.income - totals.expense,
    filters: { type: type || '', from: from || '', to: to || '', category: category || '', store: storeParam },
  });
});

router.get('/new', async (_req, res) => {
  const stores = await Store.find({ active: true }).sort({ name: 1 }).lean();
  res.render('transactions/form', {
    title: '新增紀錄',
    activeNav: 'tx',
    categories: CATEGORIES,
    stores,
    action: '/transactions',
    method: 'POST',
    tx: null,
    error: null,
  });
});

router.post('/', upload.single('receipt'), async (req, res) => {
  const { store, type, amount, date, category, note } = req.body;
  const amt = parseFloat(String(amount).replace(/,/g, ''), 10);
  const d = parseDate(date);

  const stores = await Store.find({ active: true }).sort({ name: 1 }).lean();
  const storeDoc = store ? await Store.findById(String(store)) : null;
  if (!storeDoc || !storeDoc.active) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '新增紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: '/transactions',
      method: 'POST',
      tx: req.body,
      error: '請選擇店舖',
    });
  }

  if (!type || !['income', 'expense'].includes(type)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '新增紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: '/transactions',
      method: 'POST',
      tx: req.body,
      error: '請選擇收入或支出',
    });
  }
  if (!Number.isFinite(amt) || amt < 0) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '新增紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: '/transactions',
      method: 'POST',
      tx: req.body,
      error: '金額無效',
    });
  }
  if (!d) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '新增紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: '/transactions',
      method: 'POST',
      tx: req.body,
      error: '日期無效',
    });
  }
  if (!isAllowedCategory(category)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '新增紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: '/transactions',
      method: 'POST',
      tx: req.body,
      error: '請從清單選擇類別',
    });
  }

  let imagePath = '';
  if (req.file) {
    imagePath = `/uploads/receipts/${req.file.filename}`;
  }

  await Transaction.create({
    store: storeDoc._id,
    type,
    amount: amt,
    date: d,
    category: String(category).trim(),
    note: note ? String(note).trim() : '',
    imagePath,
    createdBy: req.session.userId,
  });

  res.redirect('/transactions');
});

router.get('/:id/edit', async (req, res) => {
  const tx = await Transaction.findById(req.params.id).populate('store', 'name active').lean();
  if (!tx) return res.status(404).render('error', { title: '找不到', message: '紀錄不存在。' });
  const can =
    req.session.role === 'admin' || tx.createdBy.toString() === req.session.userId;
  if (!can) return res.status(403).render('error', { title: '無權限', message: '無法編輯此紀錄。' });

  const stores = await Store.find({ active: true }).sort({ name: 1 }).lean();
  res.render('transactions/form', {
    title: '編輯紀錄',
    activeNav: 'tx',
    categories: CATEGORIES,
    stores,
    action: `/transactions/${tx._id}/update`,
    method: 'POST',
    tx,
    error: null,
  });
});

router.post('/:id/update', upload.single('receipt'), async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).render('error', { title: '找不到', message: '紀錄不存在。' });
  }
  const can = req.session.role === 'admin' || tx.createdBy.toString() === req.session.userId;
  if (!can) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(403).render('error', { title: '無權限', message: '無法編輯此紀錄。' });
  }

  const { store, type, amount, date, category, note } = req.body;
  const amt = parseFloat(String(amount).replace(/,/g, ''), 10);
  const d = parseDate(date);

  const stores = await Store.find({ active: true }).sort({ name: 1 }).lean();
  const selectedStore = store ? await Store.findById(String(store)) : null;
  const isSameStore = selectedStore && tx.store && selectedStore._id.toString() === tx.store.toString();
  const isValidStore = selectedStore && (selectedStore.active || isSameStore);
  if (!isValidStore) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '編輯紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: `/transactions/${tx._id}/update`,
      method: 'POST',
      tx: { ...tx.toObject(), ...req.body, store: req.body.store },
      error: '請選擇店舖',
    });
  }

  if (!type || !['income', 'expense'].includes(type)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '編輯紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: `/transactions/${tx._id}/update`,
      method: 'POST',
      tx: { ...tx.toObject(), ...req.body, store: req.body.store },
      error: '請選擇收入或支出',
    });
  }
  if (!Number.isFinite(amt) || amt < 0) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '編輯紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: `/transactions/${tx._id}/update`,
      method: 'POST',
      tx: { ...tx.toObject(), ...req.body, store: req.body.store },
      error: '金額無效',
    });
  }
  if (!d) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '編輯紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: `/transactions/${tx._id}/update`,
      method: 'POST',
      tx: { ...tx.toObject(), ...req.body, store: req.body.store },
      error: '日期無效',
    });
  }
  if (!isValidCategoryForUpdate(category, tx.category)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('transactions/form', {
      title: '編輯紀錄',
      activeNav: 'tx',
      categories: CATEGORIES,
      stores,
      action: `/transactions/${tx._id}/update`,
      method: 'POST',
      tx: { ...tx.toObject(), ...req.body, store: req.body.store },
      error: '請從清單選擇類別',
    });
  }

  if (req.file) {
    if (tx.imagePath) {
      const old = path.join(__dirname, '../../public', tx.imagePath);
      fs.unlink(old, () => {});
    }
    tx.imagePath = `/uploads/receipts/${req.file.filename}`;
  }

  tx.store = selectedStore._id;
  tx.type = type;
  tx.amount = amt;
  tx.date = d;
  tx.category = String(category).trim();
  tx.note = note ? String(note).trim() : '';
  await tx.save();

  res.redirect('/transactions');
});

router.post('/:id/delete', async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).send('Not found');
  const can = req.session.role === 'admin' || tx.createdBy.toString() === req.session.userId;
  if (!can) return res.status(403).send('Forbidden');

  if (tx.imagePath) {
    const p = path.join(__dirname, '../../public', tx.imagePath);
    fs.unlink(p, () => {});
  }
  await tx.deleteOne();
  res.redirect('/transactions');
});

module.exports = router;
