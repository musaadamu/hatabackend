/**
 * Admin Routes
 * Admin-only endpoints for system management
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Performance = require('../models/Performance');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// All routes require admin role
router.use(protect, authorize('admin'));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (admin)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    logger.error(`Admin users fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * @route   GET /api/admin/performance
 * @desc    Get model performance metrics
 * @access  Private (admin)
 */
router.get('/performance', async (req, res) => {
  try {
    const performance = await Performance.find()
      .sort({ evaluationDate: -1 })
      .limit(50);

    res.json({
      success: true,
      data: performance
    });

  } catch (error) {
    logger.error(`Performance fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

/**
 * @route   POST /api/admin/performance
 * @desc    Add performance metrics
 * @access  Private (admin)
 */
router.post('/performance', async (req, res) => {
  try {
    const performance = await Performance.create(req.body);

    logger.info(`Performance metrics added: ${performance._id}`);

    res.status(201).json({
      success: true,
      data: performance
    });

  } catch (error) {
    logger.error(`Performance creation error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to add performance metrics'
    });
  }
});

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (admin)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalPredictions,
      recentUsers,
      predictionsByLanguage,
      lowConfidencePredictions
    ] = await Promise.all([
      User.countDocuments(),
      Prediction.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password'),
      Prediction.aggregate([
        {
          $group: {
            _id: '$language',
            count: { $sum: 1 }
          }
        }
      ]),
      Prediction.find({ 'prediction.confidence': { $lt: 0.7 } })
        .sort({ timestamp: -1 })
        .limit(10)
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPredictions,
        recentUsers,
        predictionsByLanguage,
        lowConfidencePredictions
      }
    });

  } catch (error) {
    logger.error(`Dashboard data error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

module.exports = router;

