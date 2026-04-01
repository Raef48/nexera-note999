import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiNoteGeneratorRouter from './routes/ai-note-generator';
import aiSearchRouter from './routes/ai-search';
import analyticsTrackRouter from './routes/analytics-track';

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/functions/ai-note-generator', aiNoteGeneratorRouter);
app.use('/api/v1/functions/ai-search', aiSearchRouter);
app.use('/api/v1/functions/analytics-track', analyticsTrackRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
