import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validateHerbCreation } from '../middleware/validationMiddleware.js';
import Herb from '../models/Herb.js';

const router = express.Router();

// @desc    Get all herbs
// @route   GET /api/herbs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { search, condition, dosha, verificationStatus } = req.query;
    
    // Build query
    let query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (condition) {
      query['therapeuticUses.condition'] = new RegExp(condition, 'i');
    }
    
    if (dosha) {
      query['properties.dosha.balances'] = dosha;
    }
    
    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    } else {
      // Default to verified herbs only
      query.verificationStatus = 'Verified';
    }

    const herbs = await Herb.find(query)
      .sort({ confidence: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name description images properties therapeuticUses safety ayushApproval confidence verificationStatus');

    const total = await Herb.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        herbs,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get herbs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve herbs'
    });
  }
});

// @desc    Get single herb by ID
// @route   GET /api/herbs/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const herb = await Herb.findById(req.params.id)
      .populate('verifiedBy', 'name role');

    if (!herb) {
      return res.status(404).json({
        success: false,
        error: 'Herb not found'
      });
    }

    res.status(200).json({
      success: true,
      data: herb
    });
  } catch (error) {
    console.error('Get herb error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve herb'
    });
  }
});

// @desc    Search herbs by condition
// @route   GET /api/herbs/search/condition/:condition
// @access  Public
router.get('/search/condition/:condition', async (req, res) => {
  try {
    const herbs = await Herb.findByCondition(req.params.condition);
    
    res.status(200).json({
      success: true,
      data: herbs
    });
  } catch (error) {
    console.error('Search herbs by condition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search herbs'
    });
  }
});

// @desc    Search herbs by dosha
// @route   GET /api/herbs/search/dosha/:dosha
// @access  Public
router.get('/search/dosha/:dosha', async (req, res) => {
  try {
    const herbs = await Herb.findByDosha(req.params.dosha);
    
    res.status(200).json({
      success: true,
      data: herbs
    });
  } catch (error) {
    console.error('Search herbs by dosha error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search herbs'
    });
  }
});

// @desc    Create new herb
// @route   POST /api/herbs
// @access  Private (Admin/Practitioner only)
router.post('/', authenticate, authorize('admin', 'practitioner'), validateHerbCreation, async (req, res) => {
  try {
    const herbData = {
      ...req.body,
      verifiedBy: req.user._id,
      verificationStatus: req.user.role === 'admin' ? 'Verified' : 'Pending'
    };

    const herb = new Herb(herbData);
    await herb.save();

    res.status(201).json({
      success: true,
      data: herb
    });
  } catch (error) {
    console.error('Create herb error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create herb'
    });
  }
});

// @desc    Update herb
// @route   PUT /api/herbs/:id
// @access  Private (Admin/Practitioner only)
router.put('/:id', authenticate, authorize('admin', 'practitioner'), async (req, res) => {
  try {
    const herb = await Herb.findById(req.params.id);

    if (!herb) {
      return res.status(404).json({
        success: false,
        error: 'Herb not found'
      });
    }

    // Only admin can verify herbs, practitioners can only edit their own
    if (req.user.role !== 'admin' && herb.verifiedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only edit herbs you created.'
      });
    }

    Object.assign(herb, req.body);
    
    // Update verification status if admin is making changes
    if (req.user.role === 'admin') {
      herb.verificationStatus = 'Verified';
    }

    await herb.save();

    res.status(200).json({
      success: true,
      data: herb
    });
  } catch (error) {
    console.error('Update herb error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update herb'
    });
  }
});

// @desc    Delete herb
// @route   DELETE /api/herbs/:id
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const herb = await Herb.findById(req.params.id);

    if (!herb) {
      return res.status(404).json({
        success: false,
        error: 'Herb not found'
      });
    }

    await herb.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Herb deleted successfully'
    });
  } catch (error) {
    console.error('Delete herb error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete herb'
    });
  }
});

// @desc    Get herb statistics
// @route   GET /api/herbs/stats/summary
// @access  Public
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Herb.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: {
            $sum: {
              $cond: [{ $eq: ['$verificationStatus', 'Verified'] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$verificationStatus', 'Pending'] }, 1, 0]
            }
          },
          averageConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      verified: 0,
      pending: 0,
      averageConfidence: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get herb stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve herb statistics'
    });
  }
});

export default router; 