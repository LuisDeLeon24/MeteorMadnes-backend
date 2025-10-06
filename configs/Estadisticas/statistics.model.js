import mongoose from "mongoose";

const statisticsSchema = new mongoose.Schema({
  score: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

export const Statistics = mongoose.model("quiz_statistics", statisticsSchema);