import sunoApi from '../Config/SunoApi.js';
import Song from '../Models/Song.js';
import User from '../Models/User.js';
import { CREDIT_COSTS } from '../Utils/Constants.js';

class LyricsController {
  // Generate Lyrics
  async generateLyrics(req, res) {
    try {
      const {
        prompt,
        tags = '',
        style = '',
        theme = '',
        callback_url
      } = req.body;

      const userId = req.user.id;
      const creditCost = CREDIT_COSTS.GENERATE_LYRICS;

      // Validation
      if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required for lyrics generation'
        });
      }

      // Check user credits
      const user = await User.findById(userId);
      if (user.credits < creditCost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credits. You need at least ${creditCost} credits.`,
          required: creditCost,
          available: user.credits
        });
      }

      // Call Suno API
      const sunoParams = {
        prompt: prompt.trim(),
        tags: tags.trim(),
        style: style.trim(),
        theme: theme.trim(),
        callback_url: callback_url || `${process.env.BACKEND_URL}/api/lyrics/callback`
      };

      try {
        const sunoResponse = await sunoApi.generateLyrics(sunoParams);

        // Deduct credits
        await user.deductCredits(creditCost);

        res.status(201).json({
          success: true,
          message: 'Lyrics generation started successfully',
          data: {
            taskId: sunoResponse.id,
            status: sunoResponse.status || 'pending',
            creditsUsed: creditCost,
            estimatedTime: '30-60 seconds'
          }
        });

      } catch (apiError) {
        console.error('Suno API lyrics error:', apiError);
        throw apiError;
      }

    } catch (error) {
      console.error('Generate lyrics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start lyrics generation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Lyrics Details
  async getLyricsDetails(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return res.status(400).json({
          success: false,
          message: 'Task ID is required'
        });
      }

      const sunoData = await sunoApi.getLyricsDetails(taskId);

      res.json({
        success: true,
        data: sunoData
      });

    } catch (error) {
      console.error('Get lyrics details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get lyrics details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Timestamped Lyrics
  async getTimestampedLyrics(req, res) {
    try {
      const {
        audio_url,
        callback_url
      } = req.body;

      const userId = req.user.id;
      const creditCost = CREDIT_COSTS.TIMESTAMPED_LYRICS;

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
        callback_url: callback_url || `${process.env.BACKEND_URL}/api/lyrics/timestamped-callback`
      };

      try {
        const sunoResponse = await sunoApi.getTimestampedLyrics(sunoParams);

        await user.deductCredits(creditCost);

        res.json({
          success: true,
          message: 'Timestamped lyrics generation started',
          data: {
            taskId: sunoResponse.id,
            status: sunoResponse.status || 'pending',
            creditsUsed: creditCost
          }
        });

      } catch (apiError) {
        console.error('Timestamped lyrics API error:', apiError);
        throw apiError;
      }

    } catch (error) {
      console.error('Get timestamped lyrics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start timestamped lyrics generation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lyrics Generation Callback
  async lyricsCallback(req, res) {
    try {
      const callbackData = req.body;
      
      console.log('Lyrics generation callback received:', callbackData);

      // Handle lyrics generation completion
      if (callbackData.status === 'completed' && callbackData.text) {
        console.log('Lyrics generated successfully:', {
          taskId: callbackData.id,
          length: callbackData.text.length
        });
      } else if (callbackData.status === 'failed') {
        console.log('Lyrics generation failed:', {
          taskId: callbackData.id,
          error: callbackData.error_message
        });
      }

      res.json({ success: true });

    } catch (error) {
      console.error('Lyrics callback error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  }

  // Timestamped Lyrics Callback
  async timestampedLyricsCallback(req, res) {
    try {
      const callbackData = req.body;
      
      console.log('Timestamped lyrics callback received:', callbackData);

      if (callbackData.status === 'completed') {
        console.log('Timestamped lyrics generated successfully:', {
          taskId: callbackData.id,
          segments: callbackData.segments?.length || 0
        });
      } else if (callbackData.status === 'failed') {
        console.log('Timestamped lyrics generation failed:', {
          taskId: callbackData.id,
          error: callbackData.error_message
        });
      }

      res.json({ success: true });

    } catch (error) {
      console.error('Timestamped lyrics callback error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  }

  // Apply Lyrics to Song
  async applyLyricsToSong(req, res) {
    try {
      const { songId } = req.params;
      const { lyrics, timestampedLyrics } = req.body;
      const userId = req.user.id;

      if (!lyrics && !timestampedLyrics) {
        return res.status(400).json({
          success: false,
          message: 'Lyrics or timestamped lyrics are required'
        });
      }

      const song = await Song.findOne({ _id: songId, user: userId });
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Update song with lyrics
      if (lyrics) {
        song.lyrics = lyrics.trim();
      }

      if (timestampedLyrics && Array.isArray(timestampedLyrics)) {
        song.timestampedLyrics = timestampedLyrics.map(segment => ({
          timestamp: segment.timestamp,
          text: segment.text.trim(),
          duration: segment.duration || null
        }));
      }

      await song.save();
      await song.addLog('info', 'Lyrics applied to song', {
        hasLyrics: !!lyrics,
        hasTimestamped: !!timestampedLyrics,
        timestampedCount: timestampedLyrics?.length || 0
      });

      res.json({
        success: true,
        message: 'Lyrics applied to song successfully',
        data: {
          songId: song._id,
          hasLyrics: !!song.lyrics,
          hasTimestamped: song.timestampedLyrics.length > 0
        }
      });

    } catch (error) {
      console.error('Apply lyrics to song error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply lyrics to song',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Popular Lyrics Prompts
  async getPopularPrompts(req, res) {
    try {
      const { limit = 20, category = 'all' } = req.query;

      // This would typically come from a database of popular prompts
      const popularPrompts = [
        {
          id: 1,
          text: "Write a love song about missing someone far away",
          category: "love",
          uses: 1250,
          tags: ["romantic", "longing", "distance"]
        },
        {
          id: 2,
          text: "Create upbeat lyrics about overcoming challenges",
          category: "motivational",
          uses: 980,
          tags: ["inspirational", "upbeat", "growth"]
        },
        {
          id: 3,
          text: "Write melancholic lyrics about lost friendships",
          category: "sad",
          uses: 856,
          tags: ["melancholic", "friendship", "loss"]
        },
        {
          id: 4,
          text: "Create party anthem lyrics about celebration",
          category: "party",
          uses: 745,
          tags: ["party", "celebration", "energetic"]
        },
        {
          id: 5,
          text: "Write introspective lyrics about personal growth",
          category: "personal",
          uses: 623,
          tags: ["introspective", "growth", "self-reflection"]
        }
      ];

      let filteredPrompts = popularPrompts;
      
      if (category !== 'all') {
        filteredPrompts = popularPrompts.filter(p => p.category === category);
      }

      filteredPrompts = filteredPrompts
        .sort((a, b) => b.uses - a.uses)
        .slice(0, parseInt(limit));

      res.json({
        success: true,
        data: {
          prompts: filteredPrompts,
          categories: ['all', 'love', 'motivational', 'sad', 'party', 'personal'],
          total: filteredPrompts.length
        }
      });

    } catch (error) {
      console.error('Get popular prompts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get popular prompts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new LyricsController();
