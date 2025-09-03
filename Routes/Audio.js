import express from 'express';
import audioController from '../Controllers/AudioController.js';
import auth from '../Middleware/Auth.js';

const router = express.Router();

// Audio Processing Routes
router.post('/convert-wav', auth, audioController.convertToWav);
router.post('/separate-vocals', auth, audioController.separateVocals);
router.post('/upload', auth, audioController.uploadAudio);
router.post('/boost-style', auth, audioController.boostMusicStyle);
router.post('/add-instrumental', auth, audioController.addInstrumental);
router.post('/add-vocals', auth, audioController.addVocals);

// Get Processing Details
router.get('/details/:type/:taskId', auth, audioController.getProcessingDetails);

// Callback Routes
router.post('/wav-callback', audioController.wavCallback);
router.post('/separate-callback', audioController.separateCallback);
router.post('/boost-callback', audioController.boostCallback);
router.post('/instrumental-callback', audioController.instrumentalCallback);
router.post('/vocals-callback', audioController.vocalsCallback);

export default router;
