import mongoose from 'mongoose';

const remedySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  input: {
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      trim: true
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age cannot exceed 120']
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required']
    },
    constitution: {
      type: String,
      enum: ['Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tri-Dosha'],
      default: 'Tri-Dosha'
    },
    symptoms: [String],
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe'],
      default: 'Moderate'
    },
    duration: String,
    existingMedications: [String],
    allergies: [String]
  },
  uploadedImage: {
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  identifiedHerb: {
    herbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Herb',
      required: false  // Make this optional since we generate string IDs
    },
    generatedId: {
      type: String  // For AI-generated herb identifiers like "ginger", "turmeric"
    },
    name: {
      common: String,
      scientific: String,
      sanskrit: String
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    alternativeMatches: [{
      herbId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Herb'
      },
      name: String,
      confidence: Number
    }]
  },
  remedyRecommendation: {
    primary: {
      herbs: [{
        herbId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Herb'
        },
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        preparation: String
      }],
      instructions: {
        type: String,
        required: true
      },
      precautions: [String],
      contraindications: [String]
    },
    supportive: {
      diet: [String],
      lifestyle: [String],
      yoga: [String],
      pranayama: [String]
    },
    followUp: {
      checkAfterDays: {
        type: Number,
        default: 7
      },
      expectedImprovement: String,
      warningSignsToWatch: [String]
    }
  },
  verification: {
    status: {
      type: String,
      enum: ['AI-Generated', 'Practitioner-Reviewed', 'Expert-Verified'],
      default: 'AI-Generated'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationDate: Date,
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    ayushCompliance: {
      type: Boolean,
      default: true
    },
    notes: String
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn']
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    helpful: Boolean,
    comments: String,
    sideEffects: [String],
    effectiveness: {
      type: String,
      enum: ['Very Effective', 'Effective', 'Moderately Effective', 'Not Effective']
    },
    submittedAt: Date
  },
  usage: {
    started: Boolean,
    startDate: Date,
    completed: Boolean,
    completionDate: Date,
    adherence: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  aiMetadata: {
    model: String,
    version: String,
    processingTime: Number,
    tokens: {
      input: Number,
      output: Number
    },
    imageAnalysis: {
      features: [String],
      colors: [String],
      texture: String,
      shape: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance (sessionId index auto-created by unique: true)
remedySchema.index({ user: 1, createdAt: -1 });
remedySchema.index({ 'input.condition': 1 });
remedySchema.index({ 'verification.status': 1 });
remedySchema.index({ 'verification.confidence': -1 });
remedySchema.index({ createdAt: -1 });

// Virtual for total confidence
remedySchema.virtual('totalConfidence').get(function() {
  const herbConfidence = this.identifiedHerb.confidence || 0;
  const verificationConfidence = this.verification.confidence || 0;
  return Math.round((herbConfidence + verificationConfidence) / 2);
});

// Static method to get user's remedy history
remedySchema.statics.getUserHistory = function(userId, limit = 10) {
  return this.find({ user: userId })
    .populate('identifiedHerb.herbId', 'name images')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get popular conditions
remedySchema.statics.getPopularConditions = function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$input.condition',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$verification.confidence' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Method to generate summary
remedySchema.methods.getSummary = function() {
  return {
    condition: this.input.condition,
    herb: this.identifiedHerb.name.common,
    confidence: this.totalConfidence,
    status: this.verification.status,
    createdAt: this.createdAt
  };
};

const Remedy = mongoose.model('Remedy', remedySchema);

export default Remedy; 