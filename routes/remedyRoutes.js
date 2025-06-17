import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { uploadSingle } from '../middleware/uploadMiddleware.js';
import { validateRemedyFormData } from '../middleware/validationMiddleware.js';
import aiService from '../services/aiService.js';
import Remedy from '../models/Remedy.js';
import User from '../models/User.js';

const router = express.Router();

// @desc    Generate remedy from herb image
// @route   POST /api/remedies/generate
// @access  Public (can be made protected later)
router.post('/generate', uploadSingle, validateRemedyFormData, async (req, res) => {
  try {
    console.log('Generate remedy - Body:', req.body);
    console.log('Generate remedy - File:', req.file ? 'File uploaded' : 'No file');
    
    const { disease, age, gender, constitution, symptoms, severity, allergies } = req.body;
    
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({
        success: false,
        error: 'Herb image is required'
      });
    }

    // Generate unique session ID
    const sessionId = uuidv4();

    // Create or find anonymous user
    let user = null;
    try {
      if (req.user) {
        user = req.user._id;
      } else {
        // Create anonymous user entry for tracking
        const anonymousUser = new User({
          name: 'Anonymous User',
          email: `anonymous_${sessionId}@herbheal.app`,
          password: 'anonymous',
          age: parseInt(age) || 30,
          gender: gender || 'Not specified',
          constitution: constitution || 'Tri-Dosha'
        });
        const savedUser = await anonymousUser.save();
        user = savedUser._id;
      }
    } catch (userError) {
      console.error('User creation error:', userError);
      // Continue without user if there's an issue with user creation
      user = null;
    }

    // Generate user profile
    const userProfile = { 
      age: parseInt(age) || 30, 
      gender: gender || 'Not specified', 
      constitution: constitution || 'Tri-Dosha' 
    };

    // Identify herb using AI
    let identificationResult;
    let remedyRecommendation;
    
    try {
      console.log('📷 Identifying herb from image...');
      identificationResult = await aiService.identifyHerb(req.file.path, disease, userProfile);
      
      if (!identificationResult || !identificationResult.name) {
        throw new Error('Failed to identify herb from image');
      }
      
      console.log('🌿 Generating remedy for identified herb...');
      remedyRecommendation = await aiService.generateRemedy(
        identificationResult,
        userProfile,
        disease
      );
      
      if (!remedyRecommendation || !remedyRecommendation.primary) {
        throw new Error('Failed to generate remedy recommendation');
      }
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Create fallback identification if AI fails
      if (!identificationResult) {
        identificationResult = {
          generatedId: 'unknown-herb',
          name: {
            common: 'Unknown Herb',
            scientific: '',
            sanskrit: ''
          },
          confidence: 10,
          alternativeMatches: [],
          description: 'Could not accurately identify the herb in the image.'
        };
      }
      
      // Create fallback remedy if AI fails
      if (!remedyRecommendation) {
        remedyRecommendation = {
          primary: {
            instructions: `We couldn't generate a specific remedy for this herb. Please consult with an Ayurvedic practitioner for guidance on using this herb to treat ${disease}.`,
            herbs: [{
              name: identificationResult.name.common,
              description: '',
              properties: ''
            }]
          },
          supportive: {
            lifestyle: '',
            diet: '',
            yoga: ''
          },
          followUp: {
            duration: '2-4 weeks',
            monitoring: 'Monitor symptoms and seek professional advice if condition persists.',
            nextSteps: 'Consult an Ayurvedic practitioner for personalized treatment.'
          },
          ayushCompliance: false,
          confidence: 10
        };
      }
    }

    // Cleanup uploaded file
    await aiService.cleanupFile(req.file.path);

    try {
      // Save remedy to database
      const remedy = new Remedy({
        user,
        sessionId,
        input: {
          condition: disease,
          age: parseInt(age) || 30,
          gender: gender || 'Not specified',
          constitution: constitution || 'Tri-Dosha',
          symptoms: symptoms ? symptoms.split(',').map(s => s.trim()) : [],
          severity: severity || 'Moderate',
          allergies: allergies ? allergies.split(',').map(a => a.trim()) : []
        },
        uploadedImage: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        },
        identifiedHerb: {
          generatedId: identificationResult.generatedId,
          name: identificationResult.name,
          confidence: identificationResult.confidence,
          alternativeMatches: identificationResult.alternativeMatches || []
        },
        remedyRecommendation,
        verification: {
          status: 'AI-Generated',
          confidence: identificationResult.confidence,
          ayushCompliance: remedyRecommendation.ayushCompliance !== false
        },
        aiMetadata: {
          ...identificationResult.aiMetadata,
          ...remedyRecommendation.aiMetadata
        },
        language: 'en'
      });

      const savedRemedy = await remedy.save();
      console.log('✅ Remedy saved to database with ID:', savedRemedy._id);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue without saving to database if there's an issue
      // The user will still get the remedy response
    }

    // Format response
    const response = {
      success: true,
      data: {
        sessionId,
        identifiedHerb: {
          name: identificationResult.name.common,
          scientificName: identificationResult.name.scientific,
          sanskritName: identificationResult.name.sanskrit,
          confidence: identificationResult.confidence
        },
        remedy: remedyRecommendation.primary.instructions, // Return English remedy by default
        isVerified: remedyRecommendation.ayushCompliance !== false,
        confidence: identificationResult.confidence,
        language: 'en',
        remedyDetails: {
          primary: remedyRecommendation.primary,
          supportive: remedyRecommendation.supportive,
          followUp: remedyRecommendation.followUp
        }
      }
    };

    console.log('📤 Sending response to client');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Remedy generation error:', error);
    
    // Cleanup uploaded file even on error
    if (req.file && req.file.path) {
      await aiService.cleanupFile(req.file.path);
    }

    // Return a graceful error response
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate remedy. Please try again.',
      data: {
        remedy: "We encountered an error processing your request. Please try again or contact support if the problem persists.",
        isVerified: false,
        confidence: 0,
        language: 'en'
      }
    });
  }
});

// @desc    Get remedy by session ID
// @route   GET /api/remedies/:sessionId
// @access  Public
router.get('/:sessionId', async (req, res) => {
  try {
    const remedy = await Remedy.findOne({ sessionId: req.params.sessionId })
      .populate('identifiedHerb.herbId', 'name images properties')
      .populate('user', 'name email');

    if (!remedy) {
      return res.status(404).json({
        success: false,
        error: 'Remedy not found'
      });
    }

    res.status(200).json({
      success: true,
      data: remedy
    });
  } catch (error) {
    console.error('Get remedy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve remedy'
    });
  }
});

// @desc    Submit feedback for remedy
// @route   PUT /api/remedies/:sessionId/feedback
// @access  Public
router.put('/:sessionId/feedback', async (req, res) => {
  try {
    const { rating, helpful, comments, sideEffects, effectiveness } = req.body;

    const remedy = await Remedy.findOne({ sessionId: req.params.sessionId });

    if (!remedy) {
      return res.status(404).json({
        success: false,
        error: 'Remedy not found'
      });
    }

    remedy.feedback = {
      rating: rating ? parseInt(rating) : undefined,
      helpful,
      comments,
      sideEffects: sideEffects ? sideEffects.split(',').map(s => s.trim()) : [],
      effectiveness,
      submittedAt: new Date()
    };

    await remedy.save();

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

// @desc    Get popular conditions
// @route   GET /api/remedies/stats/popular-conditions
// @access  Public
router.get('/stats/popular-conditions', async (req, res) => {
  try {
    const popularConditions = await Remedy.getPopularConditions(10);
    
    res.status(200).json({
      success: true,
      data: popularConditions
    });
  } catch (error) {
    console.error('Popular conditions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve popular conditions'
    });
  }
});

// @desc    Test file upload endpoint
// @route   POST /api/remedies/test-upload
// @access  Public
router.post('/test-upload', uploadSingle, (req, res) => {
  try {
    console.log('Test upload - Body:', req.body);
    console.log('Test upload - File:', req.file);
    
    res.status(200).json({
      success: true,
      message: 'Upload test successful',
      data: {
        body: req.body,
        file: req.file ? {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      }
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Translate remedy text to different language
// @route   POST /api/remedies/translate
// @access  Public
router.post('/translate', async (req, res) => {
  try {
    console.log('Translate remedy - Body:', req.body);
    
    const { remedyText, targetLanguage } = req.body;
    
    if (!remedyText || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Remedy text and target language are required'
      });
    }

    // Validate supported languages
    const supportedLanguages = ['en', 'hi', 'ta', 'te', 'bn', 'mr'];
    if (!supportedLanguages.includes(targetLanguage)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language. Supported languages: ' + supportedLanguages.join(', ')
      });
    }

    // Translate using AI service
    const translatedText = await aiService.translateRemedy(remedyText, targetLanguage);

    res.status(200).json({
      success: true,
      data: {
        originalText: remedyText,
        translatedText: translatedText,
        targetLanguage: targetLanguage
      }
    });

  } catch (error) {
    console.error('Translation error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate remedy. Please try again.'
    });
  }
});

export default router; 