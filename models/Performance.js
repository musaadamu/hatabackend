/**
 * Performance Model - MongoDB Schema
 * Tracks model performance metrics over time
 */

const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  modelVersion: {
    type: String,
    required: [true, 'Model version is required'],
    default: 'v1.0'
  },
  
  language: {
    type: String,
    required: [true, 'Language is required'],
    enum: ['ha', 'yo', 'ig', 'pcm', 'all'],
    lowercase: true
  },
  
  metrics: {
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    f1Score: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    precision: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    recall: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    auc: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  
  fairnessMetrics: {
    eod: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    aaod: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  
  confusionMatrix: {
    truePositive: { type: Number, default: 0 },
    trueNegative: { type: Number, default: 0 },
    falsePositive: { type: Number, default: 0 },
    falseNegative: { type: Number, default: 0 }
  },
  
  sampleSize: {
    type: Number,
    required: true,
    min: 0
  },
  
  evaluationDate: {
    type: Date,
    default: Date.now
  },
  
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
PerformanceSchema.index({ modelVersion: 1, language: 1 });
PerformanceSchema.index({ evaluationDate: -1 });

module.exports = mongoose.model('Performance', PerformanceSchema);

