import express from 'express';
import lyricsController from '../Controllers/lyricsController.js';
import auth from '../Middleware/Auth.js';

const router = express.Router();

// Lyrics Routes
router.post('/generate', auth, lyricsController.generateLyrics);
router.post('/timestamped', auth, lyricsController.getTimestampedLyrics);
router.get('/details/:taskId', auth, lyricsController.getLyricsDetails);

// Callback Routes
router.post('/callback', lyricsController.lyricsCallback);
router.post('/timestamped-callback', lyricsController.timestampedLyricsCallback);

export default router;
