import mongoose from "mongoose";

const neoSchema = new mongoose.Schema({
  _id: String,
  tempDesig: String,
  score: Number,
  discoveryDate: {
    year: Number,
    month: Number,
    day: Number
  },
  position: {
    ra: Number,
    dec: Number
  },
  vMagnitude: Number,
  updated: String,
  nObs: Number,
  arc: Number,
  hMagnitude: Number,
  notSeenDays: Number,
  status: String,
  source: String,
  priority: Number
});

export const NeoObservation = mongoose.model("neocp_observations", neoSchema);
