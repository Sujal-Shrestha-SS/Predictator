// routes/auth.js
const express = require('express');
const router = express.Router();
const { googleLogin, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/google', googleLogin);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;