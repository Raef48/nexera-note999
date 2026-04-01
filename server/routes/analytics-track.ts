import express, { Request, Response } from 'express';
import { trackBackendUsage } from '../analytics';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, eventType, metadata = {} } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({ error: 'Missing required fields: userId, eventType' });
    }

    const result = await trackBackendUsage(userId, eventType, metadata);

    if (!result.success && result.usage) {
      return res.status(403).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Analytics route error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to track usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
