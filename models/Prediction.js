/**
 * Prediction Model - MongoDB Schema
 * Stores all prediction results with explanations and bias scores
 */

const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Text is required'],
    trim: true
  },
  
  language: {
    type: String,
    required: [true, 'Language is required'],
    enum: ['ha', 'yo', 'ig', 'pcm'], // Hausa, Yoruba, Igbo, Pidgin
    lowercase: true
  },
  
  prediction: {
    label: {
      type: Number,
      required: true,
      enum: [0, 1] // 0: Human-written, 1: AI-generated
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    probabilities: {
      type: [Number],
      required: true
    }
  },
  
  explanation: {
    tokens: {
      type: [String],
      required: false  // Optional - only when explainability is enabled
    },
    importances: {
      type: [Number],
      required: false  // Optional - only when explainability is enabled
    },
    method: {
      type: String,
      enum: ['lime', 'shap', 'attention'],
      default: 'lime'
    }
  },
  
  biasScore: {
    genderBias: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    ethnicBias: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    religiousBias: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    overallBias: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous predictions
  },
  
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    correctLabel: {
      type: Number,
      enum: [0, 1]
    },
    comment: String,
    submittedAt: Date
  },
  
  metadata: {
    ipAddress: String,
    userAgent: String,
    processingTime: Number, // milliseconds
    modelVersion: {
      type: String,
      default: 'v1.0'
    }
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
PredictionSchema.index({ userId: 1, timestamp: -1 });
PredictionSchema.index({ language: 1 });
PredictionSchema.index({ 'prediction.label': 1 });
PredictionSchema.index({ timestamp: -1 });

// Virtual for human-readable label
PredictionSchema.virtual('predictionLabel').get(function() {
  return this.prediction.label === 0 ? 'Human-written' : 'AI-generated';
});

// Method to check if prediction needs review
PredictionSchema.methods.needsReview = function() {
  return this.prediction.confidence < 0.7 || this.biasScore.overallBias > 0.5;
};

module.exports = mongoose.model('Prediction', PredictionSchema);

