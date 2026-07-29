import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    photoURL: { 
      type: String, 
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' 
    },
    role: { 
      type: String, 
      enum: ['user', 'creator', 'admin'], 
      default: 'user' 
    },
    subscription: { 
      type: String, 
      enum: ['free', 'premium'], 
      default: 'free' 
    },
    googleId: { type: String },
    isGoogleUser: { type: Boolean, default: false },
    warningCount: { type: Number, default: 0 }
  },
  { 
    timestamps: true,
    writeConcern: { w: 1 }
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
