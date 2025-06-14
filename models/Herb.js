import mongoose from 'mongoose';

const herbSchema = new mongoose.Schema({
  name: {
    common: {
      type: String,
      required: [true, 'Common name is required'],
      trim: true,
      unique: true
    },
    scientific: {
      type: String,
      required: [true, 'Scientific name is required'],
      trim: true,
      unique: true
    },
    sanskrit: {
      type: String,
      trim: true
    },
    local: [{
      language: {
        type: String,
        required: true,
        enum: ['hi', 'ta', 'te', 'kn', 'ml', 'bn', 'gu', 'mr', 'pa']
      },
      name: {
        type: String,
        required: true,
        trim: true
      }
    }]
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  properties: {
    rasa: {
      type: [String],
      enum: ['Sweet', 'Sour', 'Salty', 'Pungent', 'Bitter', 'Astringent'],
      required: true
    },
    virya: {
      type: String,
      enum: ['Hot', 'Cold'],
      required: true
    },
    vipaka: {
      type: String,
      enum: ['Sweet', 'Sour', 'Pungent'],
      required: true
    },
    dosha: {
      balances: [{
        type: String,
        enum: ['Vata', 'Pitta', 'Kapha']
      }],
      aggravates: [{
        type: String,
        enum: ['Vata', 'Pitta', 'Kapha']
      }]
    },
    guna: [{
      type: String,
      enum: ['Heavy', 'Light', 'Unctuous', 'Dry', 'Hot', 'Cold', 'Dull', 'Sharp', 'Stable', 'Mobile', 'Soft', 'Hard', 'Non-slimy', 'Slimy', 'Smooth', 'Rough', 'Minute', 'Gross', 'Liquid', 'Dense']
    }]
  },
  therapeuticUses: [{
    condition: {
      type: String,
      required: true,
      trim: true
    },
    efficacy: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium'
    },
    dosage: String,
    preparation: String,
    contraindications: [String],
    references: [String]
  }],
  activeCompounds: [{
    name: {
      type: String,
      required: true
    },
    concentration: String,
    benefits: [String]
  }],
  cultivation: {
    regions: [String],
    season: [String],
    soilType: String,
    climate: String,
    harvestTime: String
  },
  safety: {
    pregnancy: {
      type: String,
      enum: ['Safe', 'Caution', 'Avoid'],
      default: 'Caution'
    },
    breastfeeding: {
      type: String,
      enum: ['Safe', 'Caution', 'Avoid'],
      default: 'Caution'
    },
    children: {
      type: String,
      enum: ['Safe', 'Caution', 'Avoid'],
      default: 'Caution'
    },
    sideEffects: [String],
    drugInteractions: [String]
  },
  ayushApproval: {
    status: {
      type: String,
      enum: ['Approved', 'Under Review', 'Not Listed'],
      default: 'Not Listed'
    },
    licenseNumber: String,
    approvalDate: Date
  },
  researchStudies: [{
    title: String,
    authors: [String],
    journal: String,
    year: Number,
    pubmedId: String,
    conclusion: String
  }],
  availability: {
    status: {
      type: String,
      enum: ['Common', 'Rare', 'Endangered'],
      default: 'Common'
    },
    seasonality: [String],
    commercialSources: [String]
  },
  verificationStatus: {
    type: String,
    enum: ['Verified', 'Pending', 'Rejected'],
    default: 'Pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better search performance
herbSchema.index({ 'name.common': 'text', 'name.scientific': 'text', 'name.sanskrit': 'text' });
herbSchema.index({ 'therapeuticUses.condition': 1 });
herbSchema.index({ 'properties.dosha.balances': 1 });
herbSchema.index({ verificationStatus: 1 });
herbSchema.index({ confidence: -1 });

// Virtual for main image
herbSchema.virtual('mainImage').get(function() {
  const mainImg = this.images.find(img => img.isMain);
  return mainImg || this.images[0];
});

// Method to get herbs by condition
herbSchema.statics.findByCondition = function(condition) {
  return this.find({
    'therapeuticUses.condition': new RegExp(condition, 'i'),
    verificationStatus: 'Verified'
  }).sort({ confidence: -1 });
};

// Method to get herbs by dosha
herbSchema.statics.findByDosha = function(dosha) {
  return this.find({
    'properties.dosha.balances': dosha,
    verificationStatus: 'Verified'
  }).sort({ confidence: -1 });
};

const Herb = mongoose.model('Herb', herbSchema);

export default Herb; 