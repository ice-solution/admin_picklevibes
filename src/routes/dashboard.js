const express = require('express');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.get('/', async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [monthIncome, monthExpense] = await Promise.all([
    Transaction.aggregate([
      { $match: { type: 'income', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const [allIncome, allExpense] = await Promise.all([
    Transaction.aggregate([{ $match: { type: 'income' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { type: 'expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const mi = monthIncome[0]?.total || 0;
  const me = monthExpense[0]?.total || 0;
  const ai = allIncome[0]?.total || 0;
  const ae = allExpense[0]?.total || 0;

  const recent = await Transaction.find()
    .sort({ date: -1, createdAt: -1 })
    .limit(8)
    .populate('createdBy', 'username displayName')
    .lean();

  res.render('dashboard', {
    title: '總覽',
    activeNav: 'home',
    month: { income: mi, expense: me, net: mi - me },
    allTime: { income: ai, expense: ae, net: ai - ae },
    recent,
  });
});

module.exports = router;
