const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

function requireSession(req, res, next) {
  if (!req.session?.sessionId) {
    return res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
  }
  next();
}

// 登录处理
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const sessionInfo = await authService.login(username, password);
    req.session.sessionId = sessionInfo.sessionId;
    res.json({ success: true, redirect: '/' });
  } catch (error) {
    next(error);
  }
});

// 登出 API
router.post('/logout', async (req, res) => {
  if (req.session.sessionId) {
    await authService.logout(req.session.sessionId);
    req.session.destroy();
  }
  res.json({ success: true, message: 'logout.success' });
});

router.get('/me', requireSession, (_req, res) => {
  res.json({ success: true, data: { authenticated: true } });
});

module.exports = router;