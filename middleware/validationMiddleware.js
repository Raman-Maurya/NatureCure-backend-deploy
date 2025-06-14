import { body, validationResult } from 'express-validator';

// Validation for remedy request
export const validateRemedyRequest = [
  body('disease')
    .notEmpty()
    .withMessage('Disease/condition is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Disease must be between 2 and 100 characters'),
  
  body('age')
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  
  body('constitution')
    .optional()
    .isIn(['Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tri-Dosha'])
    .withMessage('Invalid constitution type'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for user registration
export const validateUserRegistration = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for user login
export const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for herb creation
export const validateHerbCreation = [
  body('name.common')
    .notEmpty()
    .withMessage('Common name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Common name must be between 2 and 100 characters'),
  
  body('name.scientific')
    .notEmpty()
    .withMessage('Scientific name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Scientific name must be between 2 and 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('properties.rasa')
    .isArray({ min: 1 })
    .withMessage('At least one rasa (taste) is required'),
  
  body('properties.virya')
    .isIn(['Hot', 'Cold'])
    .withMessage('Virya must be Hot or Cold'),
  
  body('properties.vipaka')
    .isIn(['Sweet', 'Sour', 'Pungent'])
    .withMessage('Vipaka must be Sweet, Sour, or Pungent'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for feedback
export const validateFeedback = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('helpful')
    .optional()
    .isBoolean()
    .withMessage('Helpful must be a boolean'),
  
  body('effectiveness')
    .optional()
    .isIn(['Very Effective', 'Effective', 'Moderately Effective', 'Not Effective'])
    .withMessage('Invalid effectiveness value'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for remedy form data (multipart/form-data)
export const validateRemedyFormData = (req, res, next) => {
  const { disease, age, gender } = req.body;
  const errors = [];

  // Check required fields
  if (!disease || disease === 'Select your condition') {
    errors.push({ field: 'disease', message: 'Please select a valid condition' });
  }

  if (!age || isNaN(age) || age < 1 || age > 120) {
    errors.push({ field: 'age', message: 'Age must be between 1 and 120' });
  }

  if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
    errors.push({ field: 'gender', message: 'Please select a valid gender' });
  }

  // Check if file was uploaded
  if (!req.file) {
    errors.push({ field: 'herbImage', message: 'Please upload an herb image' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: errors
    });
  }

  next();
};

export default {
  validateRemedyRequest,
  validateRemedyFormData,
  validateUserRegistration,
  validateUserLogin,
  validateHerbCreation,
  validateFeedback
}; 