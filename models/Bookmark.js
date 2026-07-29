import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true }
  },
  { timestamps: true }
);

bookmarkSchema.index({ userId: 1, promptId: 1 }, { unique: true });

export const Bookmark = mongoose.models.Bookmark || mongoose.model('Bookmark', bookmarkSchema);
