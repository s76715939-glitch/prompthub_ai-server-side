import express from 'express';
import mongoose from 'mongoose';
import { Prompt } from '../models/Prompt.js';
import { Bookmark } from '../models/Bookmark.js';
import { Review } from '../models/Review.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { verifyTokenMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET 6 Featured Prompts (Public Route with MongoDB limit)
router.get('/featured', async (req, res) => {
  try {
    const featuredPrompts = await Prompt.find({ status: 'approved' })
      .sort({ copyCount: -1, isFeatured: -1, createdAt: -1 })
      .limit(6);
    return res.json({ success: true, data: featuredPrompts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch featured prompts.' });
  }
});

// GET Top Creators Dynamically (MongoDB Aggregation)
router.get('/creators/top', async (req, res) => {
  try {
    const topCreators = await Prompt.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$creatorId',
          creatorName: { $first: '$creatorName' },
          creatorEmail: { $first: '$creatorEmail' },
          creatorPhoto: { $first: '$creatorPhoto' },
          totalPrompts: { $sum: 1 },
          totalCopies: { $sum: '$copyCount' }
        }
      },
      { $sort: { totalCopies: -1, totalPrompts: -1 } },
      { $limit: 6 }
    ]);

    return res.json({ success: true, data: topCreators });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch top creators.' });
  }
});

// GET All Reviews Dynamically for Customer Reviews Section
router.get('/reviews/recent', async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(8);
    return res.json({ success: true, data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// GET All Prompts with Server-Side Search, Filter, Sort, Pagination
router.get('/', async (req, res) => {
  try {
    const { 
      search = '', 
      category = 'All', 
      aiTool = 'All', 
      difficulty = 'All', 
      sortBy = 'latest', 
      page = 1, 
      limit = 9 
    } = req.query;

    const query = { status: 'approved' };

    // Search by Title, Tags, or AI Tool
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { tags: searchRegex },
        { aiTool: searchRegex },
        { category: searchRegex }
      ];
    }

    // Filter by Category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter by AI Tool
    if (aiTool && aiTool !== 'All') {
      query.aiTool = aiTool;
    }

    // Filter by Difficulty Level
    if (difficulty && difficulty !== 'All') {
      query.difficulty = difficulty;
    }

    // Sorting
    let sortOptions = { createdAt: -1 }; // Default: Latest
    if (sortBy === 'most_copied') {
      sortOptions = { copyCount: -1 };
    } else if (sortBy === 'popular') {
      sortOptions = { bookmarkCount: -1, copyCount: -1 };
    } else if (sortBy === 'latest') {
      sortOptions = { createdAt: -1 };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 9;
    const skip = (pageNum - 1) * limitNum;

    const totalPrompts = await Prompt.countDocuments(query);
    const prompts = await Prompt.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    return res.json({
      success: true,
      data: prompts,
      pagination: {
        total: totalPrompts,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalPrompts / limitNum)
      }
    });
  } catch (error) {
    console.error('Fetch all prompts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch prompts.' });
  }
});

// GET Single Prompt Details with Reviews & Rating Calculation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid prompt ID format.' });
    }

    const prompt = await Prompt.findById(id);
    if (!prompt) {
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }

    const reviews = await Review.find({ promptId: id }).sort({ createdAt: -1 });

    const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 5.0;

    return res.json({
      success: true,
      data: {
        ...prompt.toObject(),
        avgRating: parseFloat(avgRating),
        reviewCount: reviews.length,
        reviews
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch prompt details.' });
  }
});

// POST Create New Prompt (Private Route) - Free users limit: max 3 prompts
router.post('/', verifyTokenMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const {
      title,
      description,
      content,
      category,
      aiTool,
      tags,
      difficulty,
      thumbnail,
      visibility
    } = req.body;

    if (!title || !description || !content || !category || !aiTool) {
      return res.status(400).json({ success: false, message: 'Title, description, content, category, and AI tool are required.' });
    }

    // Check Free User Prompt Creation Limit (Max 3 prompts)
    if (user.subscription === 'free') {
      const userPromptCount = await Prompt.countDocuments({ creatorId: user._id });
      if (userPromptCount >= 3) {
        return res.status(403).json({
          success: false,
          isLimitReached: true,
          message: 'Free tier users can submit a maximum of 3 prompts. Please upgrade to Premium for unlimited submissions.'
        });
      }
    }

    const newPrompt = await Prompt.create({
      title,
      description,
      content,
      category,
      aiTool,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      difficulty: difficulty || 'Beginner',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      visibility: visibility || 'Public',
      copyCount: 0,
      bookmarkCount: 0,
      status: 'pending', // Default pending until approved by admin per guidelines
      creatorId: user._id,
      creatorName: user.name,
      creatorEmail: user.email,
      creatorPhoto: user.photoURL
    });

    return res.status(201).json({
      success: true,
      data: newPrompt,
      message: 'Prompt submitted successfully! It is currently pending admin approval.'
    });
  } catch (error) {
    console.error('Create prompt error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create prompt.' });
  }
});

// PUT Update Prompt (Owner or Admin)
router.put('/:id', verifyTokenMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const prompt = await Prompt.findById(id);
    if (!prompt) {
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }

    if (prompt.creatorId.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this prompt.' });
    }

    const {
      title,
      description,
      content,
      category,
      aiTool,
      tags,
      difficulty,
      thumbnail,
      visibility
    } = req.body;

    if (title) prompt.title = title;
    if (description) prompt.description = description;
    if (content) prompt.content = content;
    if (category) prompt.category = category;
    if (aiTool) prompt.aiTool = aiTool;
    if (tags) prompt.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (difficulty) prompt.difficulty = difficulty;
    if (thumbnail) prompt.thumbnail = thumbnail;
    if (visibility) prompt.visibility = visibility;

    // Reset status to pending on major edit if non-admin
    if (user.role !== 'admin') {
      prompt.status = 'pending';
    }

    await prompt.save();

    return res.json({
      success: true,
      data: prompt,
      message: 'Prompt updated successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update prompt.' });
  }
});

// DELETE Prompt (Owner or Admin)
router.delete('/:id', verifyTokenMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const prompt = await Prompt.findById(id);
    if (!prompt) {
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }

    if (prompt.creatorId.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this prompt.' });
    }

    await Prompt.findByIdAndDelete(id);
    await Bookmark.deleteMany({ promptId: id });
    await Review.deleteMany({ promptId: id });

    return res.json({ success: true, message: 'Prompt deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete prompt.' });
  }
});

// POST Bookmark Toggle (Private Route)
router.post('/:id/bookmark', verifyTokenMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const prompt = await Prompt.findById(id);
    if (!prompt) {
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }

    const existingBookmark = await Bookmark.findOne({ userId, promptId: id });

    if (existingBookmark) {
      await Bookmark.findByIdAndDelete(existingBookmark._id);
      await Prompt.findByIdAndUpdate(id, { $inc: { bookmarkCount: -1 } });
      return res.json({
        success: true,
        isBookmarked: false,
        message: 'Bookmark removed successfully.'
      });
    } else {
      await Bookmark.create({ userId, promptId: id });
      await Prompt.findByIdAndUpdate(id, { $inc: { bookmarkCount: 1 } });
      return res.json({
        success: true,
        isBookmarked: true,
        message: 'Prompt bookmarked successfully!'
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to toggle bookmark.' });
  }
});

// POST Increment Copy Count
router.post('/:id/copy', async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findByIdAndUpdate(
      id, 
      { $inc: { copyCount: 1 } }, 
      { new: true }
    );
    return res.json({ success: true, copyCount: prompt ? prompt.copyCount : 0 });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update copy count.' });
  }
});

// POST Submit Review (Private Route)
router.post('/:id/reviews', verifyTokenMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Rating and comment are required.' });
    }

    const newReview = await Review.create({
      promptId: id,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userPhoto: user.photoURL,
      rating: Number(rating),
      comment
    });

    return res.status(201).json({
      success: true,
      data: newReview,
      message: 'Review submitted successfully!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

// POST Report Prompt (Private Route)
router.post('/:id/report', verifyTokenMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Report reason is required.' });
    }

    const prompt = await Prompt.findById(id);
    if (!prompt) {
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }

    const newReport = await Report.create({
      promptId: id,
      promptTitle: prompt.title,
      reportedByUserId: user._id,
      reportedByUserEmail: user.email,
      creatorId: prompt.creatorId,
      reason,
      description: description || ''
    });

    return res.status(201).json({
      success: true,
      data: newReport,
      message: 'Report submitted. Our moderation team will inspect this prompt.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
});

// GET My Prompts
router.get('/my/user', verifyTokenMiddleware, async (req, res) => {
  try {
    const userPrompts = await Prompt.find({ creatorId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: userPrompts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your prompts.' });
  }
});

// GET My Saved (Bookmarked) Prompts
router.get('/my/bookmarks', verifyTokenMiddleware, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id }).populate('promptId');
    const validPrompts = bookmarks
      .map(b => b.promptId)
      .filter(p => p !== null && p !== undefined);

    return res.json({ success: true, data: validPrompts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch saved prompts.' });
  }
});

// GET My Reviews
router.get('/my/reviews', verifyTokenMiddleware, async (req, res) => {
  try {
    const userReviews = await Review.find({ userId: req.user._id }).populate('promptId').sort({ createdAt: -1 });
    return res.json({ success: true, data: userReviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user reviews.' });
  }
});

export default router;
