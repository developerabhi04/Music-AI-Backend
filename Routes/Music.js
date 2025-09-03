// Routes/Music.js
import express from 'express';
import musicController from '../Controllers/MusicController.js';
import auth from '../Middleware/Auth.js';

const router = express.Router();

// Music Generation Routes
router.post('/generate', auth, musicController.generateMusic);
router.post('/extend', auth, musicController.extendMusic);
router.post('/cover', auth, musicController.coverAudio);

// Song Management Routes
router.get('/details/:songId', auth, musicController.getMusicDetails);
router.get('/user-songs', auth, musicController.getUserSongs);

// Callback Routes (no auth needed for webhooks)
router.post('/callback/:songId', musicController.musicGenerationCallback);
router.post('/extend-callback/:songId', musicController.musicGenerationCallback);
router.post('/cover-callback/:songId', musicController.musicGenerationCallback);

export default router;
