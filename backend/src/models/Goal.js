import mongoose from 'mongoose';
import { GOAL_COLORS, GOAL_ICONS } from '../constants.js';

// A savings goal, e.g. "New laptop": save ₹65,000 by March
const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Give your goal a name'], trim: true, maxlength: [40, 'Name is too long (max 40 characters)'] },
    target: {
      type: Number,
      required: [true, 'Enter a target amount'],
      min: [1, 'Target must be at least ₹1'],
      max: [100_000_000, 'Target is too large'],
    },
    saved: { type: Number, default: 0, min: [0, 'Saved amount cannot be negative'] },
    deadline: { type: Date, default: null },
    icon: { type: String, enum: { values: GOAL_ICONS, message: 'Choose a valid icon' }, default: 'piggy' },
    color: { type: String, enum: { values: GOAL_COLORS, message: 'Choose a valid colour' }, default: GOAL_COLORS[0] },
  },
  { timestamps: true }
);

export default mongoose.model('Goal', goalSchema);
