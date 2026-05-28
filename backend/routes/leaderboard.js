const express = require('express');
const router = express.Router();
const { getLeaderboard, getUserRank, getTop3 } = require('../controllers/leaderboardController');

router.get('/', getLeaderboard);
router.get('/top3', getTop3);
router.get('/rank/:userId', getUserRank);

module.exports = router;