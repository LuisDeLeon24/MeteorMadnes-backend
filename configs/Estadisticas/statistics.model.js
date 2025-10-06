import mongoose from "mongoose";

const statisticsSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

export const Statistics = mongoose.model("quiz_statistics", statisticsSchema);