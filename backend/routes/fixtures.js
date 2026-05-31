const express = require('express');
const router = express.Router();
const {
  getFixtures, getFixture, getUpcoming, getLive,
  getByStage, updateResult, 
} = require('../controllers/fixtureController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', getFixtures);
router.get('/upcoming', getUpcoming);
router.get('/live', getLive);
router.get('/stage/:stage', getByStage);
router.get('/:id', getFixture);

// Admin routes
router.put('/:id/result', authenticate, requireAdmin, updateResult);

module.exports = router;