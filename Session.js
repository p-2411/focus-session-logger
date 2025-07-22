//Load mongoose library to model the MongoDB data
import mongoose from "mongoose";


//Scaffold for the structure and definitions of data that will be used.
const SessionSchema = new mongoose.Schema({
  userId:         { type: String,   required: true },
  startTime:      { type: Date,     required: true },
  endTime:        { type: Date,     required: true },
  media: {
    compressed:     { type: Boolean, default: false },
    audioExtracted: { type: Boolean, default: false },
  },
  createdAt:      { type: Date,     default: Date.now }
});

export default mongoose.model('Session', SessionSchema);