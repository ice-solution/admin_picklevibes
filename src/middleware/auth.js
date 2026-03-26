function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  const returnTo = req.originalUrl || '/';
  return res.redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }
    if (!req.session.role || !roles.includes(req.session.role)) {
      return res.status(403).render('error', {
        title: '無權限',
        message: '您的帳戶沒有權限瀏覽此頁面。',
      });
    }
    return next();
  };
}

function loadUserToLocals(req, res, next) {
  res.locals.currentUser = null;
  if (req.session && req.session.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
      displayName: req.session.displayName || req.session.username,
    };
  }
  next();
}

module.exports = { requireAuth, requireRole, loadUserToLocals };
