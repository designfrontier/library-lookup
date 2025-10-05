import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import cors from 'cors';
import { checkAvailability } from './services/availability';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/check-availability', async (req, res) => {
  try {
    const { wishlistUrl } = req.body;

    if (!wishlistUrl) {
      return res.status(400).json({ error: 'Wishlist URL is required' });
    }

    const results = await checkAvailability(wishlistUrl);
    res.json({ books: results });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      error: 'Failed to check availability',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export const handler = serverlessExpress({ app });
