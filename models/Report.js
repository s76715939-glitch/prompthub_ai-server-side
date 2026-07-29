import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true },
    promptTitle: { type: String, required: true },
    reportedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedByUserEmail: { type: String, required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'dismissed', 'actioned'], default: 'pending' }
  },
  { timestamps: true }
);

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
