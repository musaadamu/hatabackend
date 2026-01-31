/**
 * Feedback Routes
 * Handles user feedback submission and retrieval
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const Prediction = require('../models/Prediction');
const { optionalAuth, protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/feedback
 * @desc    Submit feedback for a prediction
 * @access  Public (optionally authenticated)
 */
router.post('/', optionalAuth, [
  body('predictionId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('correctLabel').optional().isInt({ min: 0, max: 1 }),
  body('comment').optional().trim().isLength({ max: 1000 })
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

    const { predictionId, rating, correctLabel, comment, feedbackType } = req.body;

    // Check if prediction exists
    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Prediction not found'
      });
    }

    // Create feedback
    const feedback = await Feedback.create({
      predictionId,
      userId: req.user?._id,
      rating,
      correctLabel,
      comment,
      feedbackType: feedbackType || 'general'
    });

    // Update prediction with feedback
    prediction.feedback = {
      rating,
      correctLabel,
      comment,
      submittedAt: new Date()
    };
    await prediction.save();

    logger.info(`Feedback submitted: ${feedback._id}`);

    res.status(201).json({
      success: true,
      data: feedback
    });

  } catch (error) {
    logger.error(`Feedback submission error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

/**
 * @route   GET /api/feedback
 * @desc    Get all feedback (admin only)
 * @access  Private (admin)
 */
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const feedback = await Feedback.find()
      .populate('predictionId', 'text language prediction')
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Feedback.countDocuments();

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error(`Feedback fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback'
    });
  }
});

/**
 * @route   GET /api/feedback/prediction/:predictionId
 * @desc    Get feedback for a specific prediction
 * @access  Public
 */
router.get('/prediction/:predictionId', async (req, res) => {
  try {
    const feedback = await Feedback.find({ predictionId: req.params.predictionId })
      .populate('userId', 'name')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    logger.error(`Feedback fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback'
    });
  }
});

module.exports = router;

