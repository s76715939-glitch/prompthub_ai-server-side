import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    aiTool: { type: String, required: true },
    tags: [{ type: String, trim: true }],
    difficulty: { 
      type: String, 
      enum: ['Beginner', 'Intermediate', 'Pro'], 
      default: 'Beginner' 
    },
    thumbnail: { type: String },
    visibility: { 
      type: String, 
      enum: ['Public', 'Private'], 
      default: 'Public' 
    },
    copyCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    },
    rejectionFeedback: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorName: { type: String, required: true },
    creatorEmail: { type: String, required: true },
    creatorPhoto: { type: String }
  },
  { timestamps: true }
);

promptSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Prompt = mongoose.models.Prompt || mongoose.model('Prompt', promptSchema);
