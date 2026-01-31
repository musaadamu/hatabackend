/**
 * Feedback Model - MongoDB Schema
 * Stores user feedback for model improvement
 */

const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  predictionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prediction',
    required: [true, 'Prediction ID is required']
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous feedback
  },
  
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  
  correctLabel: {
    type: Number,
    enum: [0, 1], // 0: Human-written, 1: AI-generated
    required: false
  },
  
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  feedbackType: {
    type: String,
    enum: ['accuracy', 'explanation', 'bias', 'general'],
    default: 'general'
  },
  
  isResolved: {
    type: Boolean,
    default: false
  },
  
  adminNotes: {
    type: String,
    trim: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
FeedbackSchema.index({ predictionId: 1 });
FeedbackSchema.index({ userId: 1 });
FeedbackSchema.index({ rating: 1 });
FeedbackSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);

