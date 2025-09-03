import sunoApi from '../Config/SunoApi.js';
import User from '../Models/User.js';
import Song from '../Models/Song.js';
import { CREDIT_COSTS } from '../Utils/Constants.js';

class AudioController {
    // Convert to WAV
    async convertToWav(req, res) {
        try {
            const { audio_url, callback_url } = req.body;
            const userId = req.user.id;
            const creditCost = CREDIT_COSTS.CONVERT_WAV;

            if (!audio_url) {
                return res.status(400).json({
                    success: false,
                    message: 'Audio URL is required'
                });
            }

            const user = await User.findById(userId);
            if (user.credits < creditCost) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient credits. You need at least ${creditCost} credits.`
                });
            }

            const sunoParams = {
                audio_url,
                callback_url: callback_url || `${process.env.BACKEND_URL}/api/audio/wav-callback`
            };

            try {
                const sunoResponse = await sunoApi.convertToWav(sunoParams);

                await user.deductCredits(creditCost);

                res.json({
                    success: true,
                    message: 'WAV conversion started successfully',
                    data: {
                        taskId: sunoResponse.id,
                        status: sunoResponse.status || 'pending',
                        creditsUsed: creditCost,
                        estimatedTime: '1-2 minutes'
                    }
                });

            } catch (apiError) {
                console.error('WAV conversion API error:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Convert to WAV error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to start WAV conversion',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Separate Vocals
    async separateVocals(req, res) {
        try {
            const { audio_url, callback_url } = req.body;
            const userId = req.user.id;
            const creditCost = CREDIT_COSTS.SEPARATE_VOCALS;

            if (!audio_url) {
                return res.status(400).json({
                    success: false,
                    message: 'Audio URL is required'
                });
            }

            const user = await User.findById(userId);
            if (user.credits < creditCost) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient credits. You need at least ${creditCost} credits.`
                });
            }

            const sunoParams = {
                audio_url,
                callback_url: callback_url || `${process.env.BACKEND_URL}/api/audio/separate-callback`
            };

            try {
                const sunoResponse = await sunoApi.separateVocals(sunoParams);

                await user.deductCredits(creditCost);

                res.json({
                    success: true,
                    message: 'Vocal separation started successfully',
                    data: {
                        taskId: sunoResponse.id,
                        status: sunoResponse.status || 'pending',
                        creditsUsed: creditCost,
                        estimatedTime: '2-4 minutes'
                    }
                });

            } catch (apiError) {
                console.error('Vocal separation API error:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Separate vocals error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to start vocal separation',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Upload Audio
    async uploadAudio(req, res) {
        try {
            const { audio_data, upload_type = 'base64', file_name } = req.body;

            if (!audio_data) {
                return res.status(400).json({
                    success: false,
                    message: 'Audio data is required'
                });
            }

            const uploadParams = {
                audio_data,
                file_name: file_name || `upload_${Date.now()}`
            };

            try {
                const sunoResponse = await sunoApi.uploadAudio(uploadParams, upload_type);

                res.json({
                    success: true,
                    message: 'Audio uploaded successfully',
                    data: {
                        audioUrl: sunoResponse.audio_url,
                        fileId: sunoResponse.file_id,
                        duration: sunoResponse.duration
                    }
                });

            } catch (apiError) {
                console.error('Upload audio API error:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Upload audio error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload audio',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Boost Music Style
    async boostMusicStyle(req, res) {
        try {
            const {
                audio_url,
                style_prompt,
                intensity = 0.7,
                callback_url
            } = req.body;

            const userId = req.user.id;
            const creditCost = CREDIT_COSTS.BOOST_STYLE;

            if (!audio_url || !style_prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Audio URL and style prompt are required'
                });
            }

            const user = await User.findById(userId);
            if (user.credits < creditCost) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient credits. You need at least ${creditCost} credits.`
                });
            }

            const sunoParams = {
                audio_url,
                style_prompt: style_prompt.trim(),
                intensity: Math.max(0.1, Math.min(1.0, intensity)),
                callback_url: callback_url || `${process.env.BACKEND_URL}/api/audio/boost-callback`
            };

            try {
                const sunoResponse = await sunoApi.boostMusicStyle(sunoParams);

                await user.deductCredits(creditCost);

                res.json({
                    success: true,
                    message: 'Music style boost started successfully',
                    data: {
                        taskId: sunoResponse.id,
                        status: sunoResponse.status || 'pending',
                        creditsUsed: creditCost,
                        estimatedTime: '3-5 minutes'
                    }
                });

            } catch (apiError) {
                console.error('Boost style API error:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Boost music style error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to start music style boost',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Add Instrumental
    async addInstrumental(req, res) {
        try {
            const {
                audio_url,
                instrumental_prompt,
                blend_ratio = 0.5,
                callback_url
            } = req.body;

            const userId = req.user.id;
            const creditCost = CREDIT_COSTS.ADD_INSTRUMENTAL;

            if (!audio_url || !instrumental_prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Audio URL and instrumental prompt are required'
                });
            }

            const user = await User.findById(userId);
            if (user.credits < creditCost) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient credits. You need at least ${creditCost} credits.`
                });
            }

            const sunoParams = {
                audio_url,
                instrumental_prompt: instrumental_prompt.trim(),
                blend_ratio: Math.max(0.1, Math.min(1.0, blend_ratio)),
                callback_url: callback_url || `${process.env.BACKEND_URL}/api/audio/instrumental-callback`
            };

            try {
                const sunoResponse = await sunoApi.addInstrumental(sunoParams);

                await user.deductCredits(creditCost);

                res.json({
                    success: true,
                    message: 'Add instrumental started successfully',
                    data: {
                        taskId: sunoResponse.id,
                        status: sunoResponse.status || 'pending',
                        creditsUsed: creditCost,
                        estimatedTime: '2-4 minutes'
                    }
                });

            } catch (apiError) {
                console.error('Add instrumental API error:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Add instrumental error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to start add instrumental',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Add Vocals
    async addVocals(req, res) {
        try {
            const {
                audio_url,
                vocals_prompt,
                voice_style = 'natural',
                blend_ratio = 0.7,
                callback_url
            } = req.body;

            const userId = req.user.id;
            const creditCost = CREDIT_COSTS.ADD_VOCALS;

            if (!audio_url || !vocals_prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Audio URL and vocals prompt are required'
                });
            }

            const user = await User.findById(userId);
            if (user.credits < creditCost) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient credits. You need at least ${creditCost} credits.`
                });
            }

            const sunoParams = {
                audio_url,
                vocals_prompt: vocals_prompt.trim(),
                voice_style,
                blend_ratio: Math.max(0.1, Math.min(1.0, blend_ratio)),
                callback_url: callback_url || `${process.env.BACKEND_URL}/api/audio/vocals-callback`
            };

            try {
                const sunoResponse = await sunoApi.addVocals(sunoParams);

                await user.deductCredits(creditCost);

                res.json({
                    success: true,
                    message: 'Add vocals started successfully',
                    data: {
                        taskId: sunoResponse.id,
                        status: sunoResponse.status || 'pending',
                        creditsUsed: creditCost,
                        estimatedTime: '3-5 minutes'
                    }
                });

            } catch (apiError) {
                console.error('Add vocals API error:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Add vocals error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to start add vocals',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get Audio Processing Details
    async getProcessingDetails(req, res) {
        try {
            const { taskId, type } = req.params;

            if (!taskId || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Task ID and type are required'
                });
            }

            let sunoData;

            switch (type.toLowerCase()) {
                case 'wav':
                    sunoData = await sunoApi.getWavConversionDetails(taskId);
                    break;
                case 'separate':
                    sunoData = await sunoApi.getAudioSeparationDetails(taskId);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid processing type'
                    });
            }

            res.json({
                success: true,
                data: sunoData
            });

        } catch (error) {
            console.error('Get processing details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get processing details',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Audio Processing Callbacks
    async wavCallback(req, res) {
        try {
            const callbackData = req.body;
            console.log('WAV conversion callback received:', callbackData);

            if (callbackData.status === 'completed') {
                console.log('WAV conversion completed:', {
                    taskId: callbackData.id,
                    wavUrl: callbackData.wav_url
                });
            } else if (callbackData.status === 'failed') {
                console.log('WAV conversion failed:', {
                    taskId: callbackData.id,
                    error: callbackData.error_message
                });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('WAV callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async separateCallback(req, res) {
        try {
            const callbackData = req.body;
            console.log('Audio separation callback received:', callbackData);

            if (callbackData.status === 'completed') {
                console.log('Audio separation completed:', {
                    taskId: callbackData.id,
                    vocalUrl: callbackData.vocal_url,
                    instrumentalUrl: callbackData.instrumental_url
                });
            } else if (callbackData.status === 'failed') {
                console.log('Audio separation failed:', {
                    taskId: callbackData.id,
                    error: callbackData.error_message
                });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Separate callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async boostCallback(req, res) {
        try {
            const callbackData = req.body;
            console.log('Music style boost callback received:', callbackData);

            if (callbackData.status === 'completed') {
                console.log('Music style boost completed:', {
                    taskId: callbackData.id,
                    boostedUrl: callbackData.boosted_url
                });
            } else if (callbackData.status === 'failed') {
                console.log('Music style boost failed:', {
                    taskId: callbackData.id,
                    error: callbackData.error_message
                });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Boost callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async instrumentalCallback(req, res) {
        try {
            const callbackData = req.body;
            console.log('Add instrumental callback received:', callbackData);

            if (callbackData.status === 'completed') {
                console.log('Add instrumental completed:', {
                    taskId: callbackData.id,
                    audioUrl: callbackData.audio_url
                });
            } else if (callbackData.status === 'failed') {
                console.log('Add instrumental failed:', {
                    taskId: callbackData.id,
                    error: callbackData.error_message
                });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Instrumental callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async vocalsCallback(req, res) {
        try {
            const callbackData = req.body;
            console.log('Add vocals callback received:', callbackData);

            if (callbackData.status === 'completed') {
                console.log('Add vocals completed:', {
                    taskId: callbackData.id,
                    audioUrl: callbackData.audio_url
                });
            } else if (callbackData.status === 'failed') {
                console.log('Add vocals failed:', {
                    taskId: callbackData.id,
                    error: callbackData.error_message
                });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Vocals callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new AudioController();
