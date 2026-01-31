/**
 * Statistics Routes
 * Provides system statistics and analytics
 */

const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @route   GET /api/statistics/overview
 * @desc    Get system overview statistics
 * @access  Public
 */
router.get('/overview', async (req, res) => {
  try {
    const [
      totalPredictions,
      totalUsers,
      totalFeedback,
      languageStats
    ] = await Promise.all([
      Prediction.countDocuments(),
      User.countDocuments(),
      Feedback.countDocuments(),
      Prediction.aggregate([
        {
          $group: {
            _id: '$language',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$prediction.confidence' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalPredictions,
        totalUsers,
        totalFeedback,
        languageStats
      }
    });

  } catch (error) {
    logger.error(`Statistics error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * @route   GET /api/statistics/predictions
 * @desc    Get prediction statistics
 * @access  Public
 */
router.get('/predictions', async (req, res) => {
  try {
    const stats = await Prediction.aggregate([
      {
        $group: {
          _id: {
            language: '$language',
            label: '$prediction.label'
          },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$prediction.confidence' },
          avgBias: { $avg: '$biasScore.overallBias' }
        }
      },
      {
        $sort: { '_id.language': 1, '_id.label': 1 }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`Prediction statistics error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prediction statistics'
    });
  }
});

/**
 * @route   GET /api/statistics/bias
 * @desc    Get bias statistics
 * @access  Public
 */
router.get('/bias', async (req, res) => {
  try {
    const biasStats = await Prediction.aggregate([
      {
        $group: {
          _id: '$language',
          avgGenderBias: { $avg: '$biasScore.genderBias' },
          avgEthnicBias: { $avg: '$biasScore.ethnicBias' },
          avgReligiousBias: { $avg: '$biasScore.religiousBias' },
          avgOverallBias: { $avg: '$biasScore.overallBias' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: biasStats
    });

  } catch (error) {
    logger.error(`Bias statistics error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bias statistics'
    });
  }
});

/**
 * @route   GET /api/statistics/recent
 * @desc    Get recent activity
 * @access  Public
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recentPredictions = await Prediction.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('language prediction.label prediction.confidence timestamp');

    res.json({
      success: true,
      data: recentPredictions
    });

  } catch (error) {
    logger.error(`Recent activity error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
});

module.exports = router;

