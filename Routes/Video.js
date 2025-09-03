import express from 'express';
import videoController from '../Controllers/VideoController.js';
import auth from '../Middleware/Auth.js';

const router = express.Router();

// Video Routes
router.post('/create', auth, videoController.createMusicVideo);
router.get('/details/:taskId', auth, videoController.getMusicVideoDetails);
router.get('/styles', auth, videoController.getVideoStyles);
router.post('/apply/:songId', auth, videoController.applyVideoToSong);

// Callback Routes
router.post('/callback', videoController.videoCallback);

export default router;
