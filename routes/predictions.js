/**
 * Prediction Routes
 * Handles prediction requests and history
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const Prediction = require('../models/Prediction');
const { optionalAuth, protect } = require('../middleware/auth');
const logger = require('../utils/logger');

const ML_SERVICE_URL_LIST = (process.env.ML_SERVICE_URL || 'http://localhost:5000').split(',');
// For now, pick the first one, or in production (on Render), the var will usually be set to a single value anyway
const ML_SERVICE_URL = ML_SERVICE_URL_LIST[0];

/**
 * @route   POST /api/predictions/predict
 * @desc    Make a prediction
 * @access  Public (optionally authenticated)
 */
router.post('/predict', optionalAuth, [
  body('text').trim().isLength({ min: 1, max: 50000 }),  // Allow up to 50,000 characters (~10,000 words)
  body('language').isIn(['ha', 'yo', 'ig', 'pcm'])
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { text, language } = req.body;
    const startTime = Date.now();

    // Log ML service URL for debugging
    logger.info(`Calling ML service at: ${ML_SERVICE_URL}/predict`);

    // Call Python ML service
    // Note: Explainability and bias enabled (may take several minutes on CPU)
    const timeoutValue = parseInt(process.env.ML_SERVICE_TIMEOUT) || 0;
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
      text,
      language,
      include_explanation: true,   // Enabled for PhD thesis novelty
      include_bias: true            // Enabled for PhD thesis novelty
    }, {
      timeout: timeoutValue  // 0 = no timeout, allow unlimited processing time
    });

    const processingTime = Date.now() - startTime;

    // Save prediction to MongoDB
    const prediction = new Prediction({
      text,
      language,
      prediction: mlResponse.data.prediction,
      explanation: mlResponse.data.explanation,
      biasScore: mlResponse.data.biasScore,
      userId: req.user?._id,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        processingTime
      }
    });

    await prediction.save();

    logger.info(`Prediction saved: ${prediction._id}`);

    res.json({
      success: true,
      data: {
        predictionId: prediction._id,
        ...mlResponse.data
      }
    });

  } catch (error) {
    logger.error(`Prediction error: ${error.message}`);
    logger.error(`Error code: ${error.code}`);
    logger.error(`ML Service URL: ${ML_SERVICE_URL}`);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'ML service is unavailable - connection refused'
      });
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'ML service timeout - request took too long'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Prediction failed',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/predictions/history
 * @desc    Get user's prediction history
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const predictions = await Prediction.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Prediction.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: {
        predictions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error(`History fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prediction history'
    });
  }
});

/**
 * @route   GET /api/predictions/:id
 * @desc    Get a specific prediction
 * @access  Public (optionally authenticated)
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Prediction not found'
      });
    }

    // Check if user has access (if prediction has userId)
    if (prediction.userId && (!req.user || prediction.userId.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    logger.error(`Prediction fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prediction'
    });
  }
});

module.exports = router;

