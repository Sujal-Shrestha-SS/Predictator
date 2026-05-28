// predictions.js
const express = require('express');
const router = express.Router();
const {
  submitPrediction, getMyPredictions, getFixturePrediction,
  getAllFixturePredictions, getMyStats
} = require('../controllers/predictionController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/', submitPrediction);
router.get('/my', getMyPredictions);
router.get('/stats', getMyStats);
router.get('/fixture/:fixtureId', getFixturePrediction);
router.get('/fixture/:fixtureId/all', getAllFixturePredictions);

module.exports = router;