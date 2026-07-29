import express from 'express';
import { User } from '../models/User.js';
import { Prompt } from '../models/Prompt.js';
import { Review } from '../models/Review.js';
import { Report } from '../models/Report.js';
import { Payment } from '../models/Payment.js';
import { verifyTokenMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware lock for all admin routes
router.use(verifyTokenMiddleware);
router.use(requireRole('admin'));

// GET All Users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// Update User Role
router.route('/users/:id/role')
  .put(handleUpdateUserRole)
  .patch(handleUpdateUserRole);

async function handleUpdateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'creator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    const updatedUser = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    return res.json({ success: true, data: updatedUser, message: `User role updated to ${role}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
}

// Delete User
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    await Prompt.deleteMany({ creatorId: id });
    return res.json({ success: true, message: 'User and associated prompts removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// GET All Prompts
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await Prompt.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: prompts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch prompts.' });
  }
});

// Approve Prompt
router.route('/prompts/:id/approve')
  .put(handleApprovePrompt)
  .patch(handleApprovePrompt);

async function handleApprovePrompt(req, res) {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findByIdAndUpdate(
      id, 
      { status: 'approved', rejectionReason: '', rejectionFeedback: '' }, 
      { new: true }
    );
    return res.json({ success: true, data: prompt, message: 'Prompt approved successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to approve prompt.' });
  }
}

// Reject Prompt
router.route('/prompts/:id/reject')
  .put(handleRejectPrompt)
  .patch(handleRejectPrompt);

async function handleRejectPrompt(req, res) {
  try {
    const { id } = req.params;
    const { feedback, rejectionReason } = req.body;
    const reason = rejectionReason || feedback || 'Does not meet platform guidelines.';

    const prompt = await Prompt.findByIdAndUpdate(
      id, 
      { status: 'rejected', rejectionReason: reason, rejectionFeedback: reason }, 
      { new: true }
    );
    return res.json({ success: true, data: prompt, message: 'Prompt rejected.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reject prompt.' });
  }
}

// Toggle Feature Prompt
router.route('/prompts/:id/feature')
  .put(handleToggleFeature)
  .patch(handleToggleFeature);

async function handleToggleFeature(req, res) {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found.' });

    prompt.isFeatured = !prompt.isFeatured;
    await prompt.save();

    return res.json({ 
      success: true, 
      data: prompt, 
      isFeatured: prompt.isFeatured,
      message: prompt.isFeatured ? 'Prompt featured on homepage.' : 'Prompt removed from featured.' 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to toggle feature status.' });
  }
}

// Dismiss Report
router.delete('/reports/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    await Report.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Report dismissed successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to dismiss report.' });
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Report.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Report removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove report.' });
  }
});

// GET All Payments
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payments.' });
  }
});

// GET Reported Prompts
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
  }
});

// Action Report (Dismiss or Warn)
router.put('/reports/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'dismiss' or 'warn'

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    if (action === 'dismiss') {
      report.status = 'dismissed';
      await report.save();
      return res.json({ success: true, message: 'Report dismissed as not harmful.' });
    } else if (action === 'warn') {
      report.status = 'actioned';
      await report.save();
      if (report.creatorId) {
        await User.findByIdAndUpdate(report.creatorId, { $inc: { warningCount: 1 } });
      }
      return res.json({ success: true, message: 'Warning issued to prompt creator.' });
    }

    return res.status(400).json({ success: false, message: 'Invalid action.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process report action.' });
  }
});

// Analytics Summary
router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPrompts = await Prompt.countDocuments();
    const approvedPrompts = await Prompt.countDocuments({ status: 'approved' });
    const totalReviews = await Review.countDocuments();
    const totalReports = await Report.countDocuments();

    const copyAgg = await Prompt.aggregate([
      { $group: { _id: null, totalCopies: { $sum: '$copyCount' } } }
    ]);
    const totalCopies = copyAgg.length > 0 ? copyAgg[0].totalCopies : 0;

    const paymentAgg = await Payment.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = paymentAgg.length > 0 ? paymentAgg[0].totalRevenue : 0;
    const totalPayments = await Payment.countDocuments();

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalPrompts,
        approvedPrompts,
        totalReviews,
        totalReports,
        totalCopies,
        totalRevenue,
        totalPayments
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin analytics.' });
  }
});

export default router;
