import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userPhoto: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true }
  },
  { timestamps: true }
);

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
