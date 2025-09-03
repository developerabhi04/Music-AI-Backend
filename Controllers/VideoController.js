import sunoApi from '../Config/SunoApi.js';
import User from '../Models/User.js';
import Song from '../Models/Song.js';
import { CREDIT_COSTS } from '../Utils/Constants.js';

class VideoController {
    // Create Music Video
    async createMusicVideo(req, res) {
        try {
            const {
                audio_url,
                video_style = 'default',
                theme = 'abstract',
                duration_seconds,
                resolution = '1080p',
                callback_url
            } = req.body;

            const userId = req.user.id;
            const creditCost = CREDIT_COSTS.CREATE_VIDEO;

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
                video_style,
                theme,
                duration_seconds,
                resolution,
                callback_url: callback_url || `${process.env.BACKEND_URL}/api/video/callback`
            };

            try {
                const sunoResponse = await sunoApi.createMusicVideo(sunoParams);

                await user.deductCredits(creditCost);

                res.status(201).json({
                    success: true,
                    message: 'Music video creation started successfully',
                    data: {
                        taskId: sunoResponse.id,
                        status: sunoResponse.status || 'pending',
                        creditsUsed: creditCost,
                        estimatedTime: '5-10 minutes'
                    }
                });

            } catch (apiError) {
                console.error('Create video API error:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Create music video error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to start music video creation',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get Music Video Details
    async getMusicVideoDetails(req, res) {
        try {
            const { taskId } = req.params;

            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    message: 'Task ID is required'
                });
            }

            const sunoData = await sunoApi.getMusicVideoDetails(taskId);

            res.json({
                success: true,
                data: sunoData
            });

        } catch (error) {
            console.error('Get music video details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get music video details',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Music Video Generation Callback
    async videoCallback(req, res) {
        try {
            const callbackData = req.body;

            console.log('Music video generation callback received:', callbackData);

            if (callbackData.status === 'completed') {
                console.log('Music video generation completed:', {
                    taskId: callbackData.id,
                    videoUrl: callbackData.video_url,
                    thumbnailUrl: callbackData.thumbnail_url
                });
            } else if (callbackData.status === 'failed') {
                console.log('Music video generation failed:', {
                    taskId: callbackData.id,
                    error: callbackData.error_message
                });
            }

            res.json({ success: true });

        } catch (error) {
            console.error('Video callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get Video Styles
    async getVideoStyles(req, res) {
        try {
            const videoStyles = [
                {
                    id: 'abstract',
                    name: 'Abstract',
                    description: 'Flowing shapes and colors that move with the music',
                    preview: '/previews/abstract.gif',
                    popular: true
                },
                {
                    id: 'nature',
                    name: 'Nature',
                    description: 'Beautiful landscapes and natural scenes',
                    preview: '/previews/nature.gif',
                    popular: true
                },
                {
                    id: 'urban',
                    name: 'Urban',
                    description: 'City scenes and modern architecture',
                    preview: '/previews/urban.gif',
                    popular: false
                },
                {
                    id: 'retro',
                    name: 'Retro',
                    description: 'Vintage aesthetics and nostalgic visuals',
                    preview: '/previews/retro.gif',
                    popular: true
                },
                {
                    id: 'futuristic',
                    name: 'Futuristic',
                    description: 'Sci-fi inspired visuals and digital effects',
                    preview: '/previews/futuristic.gif',
                    popular: false
                },
                {
                    id: 'artistic',
                    name: 'Artistic',
                    description: 'Paint-like effects and creative visuals',
                    preview: '/previews/artistic.gif',
                    popular: false
                },
                {
                    id: 'minimal',
                    name: 'Minimal',
                    description: 'Clean, simple visuals with elegant movement',
                    preview: '/previews/minimal.gif',
                    popular: true
                },
                {
                    id: 'psychedelic',
                    name: 'Psychedelic',
                    description: 'Trippy patterns and vibrant color shifts',
                    preview: '/previews/psychedelic.gif',
                    popular: false
                }
            ];

            res.json({
                success: true,
                data: {
                    styles: videoStyles,
                    defaultStyle: 'abstract',
                    totalStyles: videoStyles.length
                }
            });

        } catch (error) {
            console.error('Get video styles error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get video styles',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Apply Video to Song
    async applyVideoToSong(req, res) {
        try {
            const { songId } = req.params;
            const { videoUrl, thumbnailUrl } = req.body;
            const userId = req.user.id;

            if (!videoUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Video URL is required'
                });
            }

            const song = await Song.findOne({ _id: songId, user: userId });
            if (!song) {
                return res.status(404).json({
                    success: false,
                    message: 'Song not found'
                });
            }

            // Update song with video
            song.videoUrl = videoUrl.trim();
            if (thumbnailUrl) {
                song.thumbnailUrl = thumbnailUrl.trim();
            }

            await song.save();
            await song.addLog('info', 'Video applied to song', {
                videoUrl,
                thumbnailUrl
            });

            res.json({
                success: true,
                message: 'Video applied to song successfully',
                data: {
                    songId: song._id,
                    videoUrl: song.videoUrl,
                    thumbnailUrl: song.thumbnailUrl
                }
            });

        } catch (error) {
            console.error('Apply video to song error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to apply video to song',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default new VideoController();
