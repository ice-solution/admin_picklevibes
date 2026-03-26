require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const { ensureDefaultAdmin, ensureDefaultStore } = require('./config/seed');
const { requireAuth, requireRole, loadUserToLocals, requirePasswordChanged } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const dashboardRoutes = require('./routes/dashboard');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/picklevibes_admin';

const app = express();

const trust = process.env.TRUST_PROXY;
if (trust !== undefined && trust !== '') {
  const n = Number(trust);
  app.set('trust proxy', Number.isFinite(n) ? n : trust === 'true' ? true : 1);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: 'picklevibes.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60 * 1000,
      secure:
        process.env.SESSION_COOKIE_SECURE === 'true'
          ? true
          : process.env.SESSION_COOKIE_SECURE === 'false'
            ? false
            : process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

app.use(loadUserToLocals);

app.use(authRoutes);

app.use(requireAuth);
app.use(accountRoutes);
app.use(requirePasswordChanged);
app.use('/', dashboardRoutes);
app.use('/transactions', transactionRoutes);
app.use('/users', requireRole('admin'), userRoutes);
app.use(requireRole('admin'), settingsRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: '找不到頁面', message: '此頁面不存在。' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const message = err.message || '伺服器發生錯誤';
  if (req.accepts('html')) {
    return res.status(500).render('error', { title: '錯誤', message });
  }
  res.status(500).json({ error: message });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log('[db] connected');
  await ensureDefaultAdmin();
  await ensureDefaultStore();

  app.listen(PORT, () => {
    console.log(`[server] http://127.0.0.1:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
