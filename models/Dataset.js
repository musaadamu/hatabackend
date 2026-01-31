/**
 * Dataset Model - MongoDB Schema
 * Manages training and evaluation datasets
 */

const mongoose = require('mongoose');

const DatasetSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Text is required'],
    trim: true
  },
  
  language: {
    type: String,
    required: [true, 'Language is required'],
    enum: ['ha', 'yo', 'ig', 'pcm'],
    lowercase: true
  },
  
  label: {
    type: Number,
    required: [true, 'Label is required'],
    enum: [0, 1] // 0: Human-written, 1: AI-generated
  },
  
  isHumanGenerated: {
    type: Boolean,
    required: true
  },
  
  annotations: [{
    annotatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    entities: [{
      text: String,
      type: String,
      start: Number,
      end: Number
    }],
    biasFlags: {
      hasGenderBias: { type: Boolean, default: false },
      hasEthnicBias: { type: Boolean, default: false },
      hasReligiousBias: { type: Boolean, default: false }
    },
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  metadata: {
    source: {
      type: String,
      required: true
    },
    domain: {
      type: String,
      enum: ['news', 'social', 'academic', 'literature', 'conversation', 'other'],
      default: 'other'
    },
    dialect: String,
    collectedAt: {
      type: Date,
      default: Date.now
    },
    generatorModel: String, // If AI-generated
    wordCount: Number,
    characterCount: Number
  },
  
  split: {
    type: String,
    enum: ['train', 'validation', 'test'],
    default: 'train'
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
DatasetSchema.index({ language: 1, split: 1 });
DatasetSchema.index({ label: 1 });
DatasetSchema.index({ isVerified: 1 });
DatasetSchema.index({ 'metadata.source': 1 });

// Pre-save hook to calculate word and character counts
DatasetSchema.pre('save', function(next) {
  if (this.isModified('text')) {
    this.metadata.wordCount = this.text.split(/\s+/).length;
    this.metadata.characterCount = this.text.length;
  }
  next();
});

module.exports = mongoose.model('Dataset', DatasetSchema);

