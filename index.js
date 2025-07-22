import express from "express";
import mongoose from "mongoose";
import Session from "./Session.js";

// Creates an express environment which allows communication between the 
// server and our application.
const app = express();

//Initialising port and our database identifier
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/focus-sessions';

//Connects to the database
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.err('MongoDB connection failed:', err.message);
  });


// Converts JSON strings that it recieves into actual javascript objects 
app.use(express.json());

// Media processing functions
const simulateVideoCompression = async (sessionId) => {
  console.log(`[FFMPEG SIMULATION] Starting video compression for session ${sessionId}`);
  console.log(`[FFMPEG] Command would be: ffmpeg -i input_${sessionId}.mp4 -c:v h264 -crf 23 -preset medium compressed_${sessionId}.mp4`);
  
  // Fake processing time
  const processingTime = 1000;
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  console.log(`[FFMPEG SIMULATION] Video compression completed for session ${sessionId} (${Math.round(processingTime)}ms)`);
  return true;
};

const simulateAudioExtraction = async (sessionId) => {
  console.log(`[FFMPEG SIMULATION] Starting audio extraction for session ${sessionId}`);
  console.log(`[FFMPEG] Command would be: ffmpeg -i compressed_${sessionId}.mp4 -vn -acodec mp3 -ar 44100 -ac 2 audio_${sessionId}.mp3`);
  
  // Fake processing time
  const processingTime = 1000;
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  console.log(`[FFMPEG SIMULATION] Audio extraction completed for session ${sessionId} (${Math.round(processingTime)}ms)`);
  return true;
};

// POST endpoint to create a new focus session
app.post('/sessions', async (req, res) => {
  try {
    const { userId, startTime, endTime } = req.body;
    
    // Ensuring all data fields are present
    if (!userId || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, startTime, endTime' 
      });
    }
    
    // Validating userId format
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return res.status(400).json({ 
        error: 'userId must be a non-empty string' 
      });
    }
    
    // Validating date formats
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    //Checks if dates are numbers, returns an error otherwise.
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ 
        error: 'startTime must be a valid date' 
      });
    }
    
    if (isNaN(endDate.getTime())) {
      return res.status(400).json({ 
        error: 'endTime must be a valid date' 
      });
    }
    
    // Ensures end date and start date are in the correct order
    if (endDate <= startDate) {
      return res.status(400).json({ 
        error: 'endTime must be after startTime' 
      });
    }
    
    // Enforces a maximum session duration
    const sessionDuration = endDate - startDate;
    const maxDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    
    if (sessionDuration > maxDuration) {
      return res.status(400).json({ 
        error: 'Session duration cannot exceed 8 hours' 
      });
    }
    
    // Generate a unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36)}`;
    
    // Create new session with initial media processing status
    const sessionData = {
      userId: userId.trim(),
      startTime: startDate,
      endTime: endDate,
      media: {
        compressed: false,
        audioExtracted: false
      },
      createdAt: Date.now()
    };
    
    console.log(`\nProcessing session ${sessionId} for user ${userId}`);
    
    // Start media processing pipeline
    try {
      // Video compression
      await simulateVideoCompression(sessionId);
      sessionData.media.compressed = true;
      
      // Audio extraction
      await simulateAudioExtraction(sessionId);
      sessionData.media.audioExtracted = true;
      
      console.log(`Media processing pipeline completed for session ${sessionId}\n`);
    } catch (processingError) {
      console.error(`Media processing failed for session ${sessionId}:`, processingError);
      return res.status(500).json({ 
        error: 'Media processing failed',
        sessionId,
        sessionData 
      });
    }
    
    // Save processed session to MongoDB
    try {
      const newSession = new Session(sessionData);
      console.log("Saving:\n");
      console.log(sessionData);
      const savedSession = await newSession.save();
      console.log(`\nSession ${sessionId} successfully saved to MongoDB with ID: ${savedSession._id}`);
      
      res.status(201).json({ 
        message: 'Session created, processed, and saved successfully',
        sessionId,
        databaseId: savedSession._id,
        sessionData: savedSession
      });

    } catch (dbError) {
      console.error(`Database save failed for session ${sessionId}:`, dbError);
      return res.status(500).json({ 
        error: 'Failed to save session to database',
        sessionId,
        sessionData 
      });
    }
  } catch (error) {
    console.error(`Unexpected error in session creation:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing the session'
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Displays the port that the server is running on.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 