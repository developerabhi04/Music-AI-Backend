// Controllers/MusicController.js
import Song from '../Models/Song.js';
import User from '../Models/User.js';
import Workspace from '../Models/Workspace.js';
import SunoApiClient from '../Config/SunoApi.js';


// ✅ Create instance after environment variables are loaded
const sunoApi = new SunoApiClient();



class MusicController {
  // ✅ Generate Music - Fixed with real Suno API integration
  async generateMusic(req, res) {
    try {
      const {
        prompt,
        model_version = 'v4',
        make_instrumental = false,
        wait_audio = false,
        tags = '',
        title = '',
        callback_url,
        workspace_id
      } = req.body;

      const userId = req.user.id;

      // Validation
      if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required for music generation'
        });
      }

      // Credit cost based on model version
      const creditCosts = {
        'v3_5': 10,
        'v4': 10,
        'v4_5': 15
      };
      const creditCost = creditCosts[model_version] || 10;

      // Check user credits
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.credits < creditCost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credits. You need at least ${creditCost} credits.`,
          required: creditCost,
          available: user.credits
        });
      }

      // Find or create workspace
      let workspace;
      if (workspace_id) {
        workspace = await Workspace.findOne({
          _id: workspace_id,
          user: userId,
          isTrashed: false
        });
        if (!workspace) {
          return res.status(404).json({
            success: false,
            message: 'Workspace not found'
          });
        }
      } else {
        workspace = await Workspace.findOne({
          user: userId,
          isDefault: true,
          isTrashed: false
        });

        if (!workspace) {
          workspace = new Workspace({
            name: 'My Workspace',
            description: 'Default workspace for your music creations',
            user: userId,
            isDefault: true
          });
          await workspace.save();

          user.workspaces.push(workspace._id);
          await user.save();
        }
      }

      // ✅ Create song record with correct URL format
      const song = new Song({
        title: title || 'Untitled Song',
        description: prompt,
        styleTags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        isInstrumental: make_instrumental,
        modelVersion: model_version,
        status: 'pending',
        creditsUsed: creditCost,
        user: userId,
        workspace: workspace._id
      });

      await song.save();

      // Add song to workspace
      workspace.songs.push(song._id);
      workspace.stats.totalSongs += 1;
      workspace.stats.lastActivityAt = new Date();
      await workspace.save();

      try {
        // ✅ Real Suno API call with callback URL
        const sunoParams = {
          prompt: prompt.trim(),
          model_version,
          make_instrumental,
          tags: tags.trim(),
          title: title.trim() || 'Untitled Song',
          callback_url: callback_url || `${process.env.CALLBACK_URL}`
        };

        console.log('🎵 Calling Suno API with params:', sunoParams);

        const sunoResponse = await sunoApi.generateMusic(sunoParams);

        console.log('✅ Suno API Response:', sunoResponse);

        // Update song with Suno task info
        song.sunoTaskId = sunoResponse.taskId;
        song.status = 'generating';
        // ✅ Set proper audio URL that will be updated by webhook
        song.audioUrl = `${process.env.BACKEND_URL}/generated-music/${song._id}.mp3`;
        await song.save();

        // Deduct credits
        user.credits -= creditCost;
        user.totalCreditsUsed += creditCost;
        await user.save();

        res.status(201).json({
          success: true,
          message: 'Music generation started successfully',
          data: {
            songId: song._id,
            sunoTaskId: song.sunoTaskId,
            status: 'generating',
            creditsUsed: creditCost,
            workspace: workspace.name,
            estimatedTime: '2-3 minutes',
            audioUrl: song.audioUrl
          }
        });

      } catch (apiError) {
        console.error('❌ Suno API Error:', apiError);

        // Update song status to failed
        song.status = 'failed';
        song.errorMessage = apiError.message;
        await song.save();

        // Don't deduct credits on API failure
        res.status(500).json({
          success: false,
          message: `Music generation failed: ${apiError.message}`,
          error: apiError.message
        });
      }

    } catch (error) {
      console.error('Generate music error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start music generation'
      });
    }
  }


  // ✅ Add status checking method
  async checkSongStatus(req, res) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;

      const song = await Song.findOne({ _id: songId, user: userId });
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // If still generating and has task ID, check with Suno API
      if (song.status === 'generating' && song.sunoTaskId) {
        try {
          console.log(`🔍 Checking status for task: ${song.sunoTaskId}`);

          const statusCheck = await sunoApi.getGenerationDetails(song.sunoTaskId);
          console.log('📊 Status check result:', statusCheck);

          if (statusCheck.success) {
            if (statusCheck.status === 'COMPLETED' && statusCheck.songs?.length > 0) {
              // Process completion manually
              const songData = statusCheck.songs[0];

              song.status = 'completed';
              song.completedAt = new Date();

              if (songData.audio_url) {
                try {
                  // Download audio file
                  const audioDir = path.join(__dirname, '..', 'public', 'generated-music');
                  if (!fs.existsSync(audioDir)) {
                    fs.mkdirSync(audioDir, { recursive: true });
                  }

                  const response = await axios({
                    method: 'GET',
                    url: songData.audio_url,
                    responseType: 'stream'
                  });

                  const audioPath = path.join(audioDir, `${song._id}.mp3`);
                  const writer = fs.createWriteStream(audioPath);
                  response.data.pipe(writer);

                  await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                  });

                  song.audioUrl = `${process.env.BACKEND_URL}/generated-music/${song._id}.mp3`;
                  console.log(`✅ Manual download complete: ${song.audioUrl}`);
                } catch (downloadError) {
                  console.error('❌ Manual download failed:', downloadError);
                  song.audioUrl = songData.audio_url; // Fallback to original URL
                }
              }

              if (songData.image_url) song.imageUrl = songData.image_url;
              if (songData.title) song.title = songData.title;
              if (songData.duration) song.duration = songData.duration;

              await song.save();

            } else if (statusCheck.status === 'FAILED') {
              song.status = 'failed';
              song.errorMessage = statusCheck.errorMessage || 'Generation failed';
              await song.save();
            }
          }
        } catch (statusError) {
          console.error('❌ Status check error:', statusError);
        }
      }

      res.json({
        success: true,
        data: song
      });

    } catch (error) {
      console.error('Check song status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check song status'
      });
    }
  }



  // ✅ Get Music Details - Enhanced with real-time status checking
  async getMusicDetails(req, res) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;

      if (!songId) {
        return res.status(400).json({
          success: false,
          message: 'Song ID is required'
        });
      }

      const song = await Song.findOne({ _id: songId, user: userId })
        .populate('workspace', 'name description color')
        .populate('user', 'username email');

      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // ✅ If song is still generating, check real status from Suno API
      if (song.status === 'generating' && song.sunoTaskId) {
        try {
          const statusCheck = await sunoApi.getGenerationDetails(song.sunoTaskId);

          if (statusCheck.success && statusCheck.status === 'COMPLETED') {
            // Update song with completion data
            song.status = 'completed';
            song.completedAt = new Date();

            if (statusCheck.songs && statusCheck.songs.length > 0) {
              const songData = statusCheck.songs[0];
              if (songData.audio_url) {
                // Keep the local URL format but mark as completed
                song.audioUrl = `${process.env.BACKEND_URL}/generated-music/${song._id}.mp3`;
              }
            }

            await song.save();
          } else if (statusCheck.status === 'FAILED') {
            song.status = 'failed';
            song.errorMessage = statusCheck.errorMessage || 'Generation failed';
            await song.save();
          }
        } catch (statusError) {
          console.error('Status check error:', statusError);
          // Don't fail the request if status check fails
        }
      }

      res.json({
        success: true,
        data: song
      });

    } catch (error) {
      console.error('Get music details error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get music details'
      });
    }
  }

  // Extend Music
  async extendMusic(req, res) {
    try {
      const {
        audio_url,
        prompt,
        model_version = 'v4',
        continue_at = 'auto',
        tags = '',
        title = '',
        callback_url,
        workspace_id
      } = req.body;

      const userId = req.user.id;
      const creditCost = 10;

      // Validation
      if (!audio_url || !prompt) {
        return res.status(400).json({
          success: false,
          message: 'Audio URL and prompt are required'
        });
      }

      // Check user credits
      const user = await User.findById(userId);
      if (user.credits < creditCost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credits. You need at least ${creditCost} credits.`
        });
      }

      // Find workspace
      let workspace = await Workspace.findOne({
        user: userId,
        isDefault: true,
        isTrashed: false
      });

      if (workspace_id) {
        workspace = await Workspace.findOne({
          _id: workspace_id,
          user: userId,
          isTrashed: false
        });
      }

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Create song record for extension
      const song = new Song({
        title: title || 'Extended Song',
        description: prompt,
        styleTags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        status: 'pending',
        modelVersion: model_version,
        creditsUsed: creditCost,
        user: userId,
        workspace: workspace._id,
        originalAudioUrl: audio_url
      });

      await song.save();

      // Add to workspace
      workspace.songs.push(song._id);
      await workspace.save();

      // Simulate extension process
      song.status = 'generating';
      song.sunoTaskId = `extend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await song.save();

      // Deduct credits
      user.credits -= creditCost;
      user.totalCreditsUsed += creditCost;
      await user.save();

      res.status(201).json({
        success: true,
        message: 'Music extension started successfully',
        data: {
          songId: song._id,
          sunoTaskId: song.sunoTaskId,
          status: 'generating',
          creditsUsed: creditCost,
          originalAudioUrl: audio_url
        }
      });

    } catch (error) {
      console.error('Extend music error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start music extension'
      });
    }
  }

  // Cover Audio
  async coverAudio(req, res) {
    try {
      const {
        audio_url,
        prompt,
        model_version = 'v4',
        callback_url
      } = req.body;

      const userId = req.user.id;
      const creditCost = 15;

      if (!audio_url || !prompt) {
        return res.status(400).json({
          success: false,
          message: 'Audio URL and prompt are required'
        });
      }

      const user = await User.findById(userId);
      if (user.credits < creditCost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credits. You need at least ${creditCost} credits.`
        });
      }

      let workspace = await Workspace.findOne({
        user: userId,
        isDefault: true,
        isTrashed: false
      });

      const song = new Song({
        title: 'Audio Cover',
        description: prompt,
        status: 'pending',
        modelVersion: model_version,
        creditsUsed: creditCost,
        user: userId,
        workspace: workspace._id,
        originalAudioUrl: audio_url
      });

      await song.save();

      workspace.songs.push(song._id);
      await workspace.save();

      song.status = 'generating';
      song.sunoTaskId = `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await song.save();

      user.credits -= creditCost;
      user.totalCreditsUsed += creditCost;
      await user.save();

      res.status(201).json({
        success: true,
        message: 'Audio cover started successfully',
        data: {
          songId: song._id,
          sunoTaskId: song.sunoTaskId,
          status: 'generating',
          creditsUsed: creditCost
        }
      });

    } catch (error) {
      console.error('Cover audio error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start audio cover'
      });
    }
  }

  // Get Music Details
  async getMusicDetails(req, res) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;

      if (!songId) {
        return res.status(400).json({
          success: false,
          message: 'Song ID is required'
        });
      }

      const song = await Song.findOne({ _id: songId, user: userId })
        .populate('workspace', 'name description color')
        .populate('user', 'username email');

      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // If song is still generating, you could check with Suno API for real updates
      // For now, we'll just return the current status

      res.json({
        success: true,
        data: song
      });

    } catch (error) {
      console.error('Get music details error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get music details'
      });
    }
  }

  // Get User Songs
  async getUserSongs(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        workspace,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = { user: userId };

      // Filters
      if (workspace) query.workspace = workspace;
      if (status) query.status = status;

      // Search
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { styleTags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const songs = await Song.find(query)
        .populate('workspace', 'name description color')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-__v');

      const total = await Song.countDocuments(query);

      res.json({
        success: true,
        data: {
          songs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get user songs error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user songs'
      });
    }
  }

  // Update Song
  async updateSong(req, res) {
    try {
      const { songId } = req.params;
      const { title, description, tags, notes, rating, isFavorite } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (notes !== undefined) updateData.notes = notes.trim();
      if (rating !== undefined) updateData.rating = rating;
      if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
      if (tags) {
        updateData.styleTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      const song = await Song.findOneAndUpdate(
        { _id: songId, user: userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      res.json({
        success: true,
        message: 'Song updated successfully',
        data: song
      });

    } catch (error) {
      console.error('Update song error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update song'
      });
    }
  }

  // Delete Song
  async deleteSong(req, res) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;

      const song = await Song.findOne({ _id: songId, user: userId });
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Remove from workspace
      if (song.workspace) {
        await Workspace.findByIdAndUpdate(
          song.workspace,
          {
            $pull: { songs: songId },
            $inc: { 'stats.totalSongs': -1 }
          }
        );
      }

      // Delete the song
      await Song.findByIdAndDelete(songId);

      res.json({
        success: true,
        message: 'Song deleted successfully'
      });

    } catch (error) {
      console.error('Delete song error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete song'
      });
    }
  }

  // Toggle Favorite
  async toggleFavorite(req, res) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;

      const song = await Song.findOne({ _id: songId, user: userId });
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      song.isFavorite = !song.isFavorite;
      await song.save();

      res.json({
        success: true,
        message: song.isFavorite ? 'Added to favorites' : 'Removed from favorites',
        data: {
          songId: song._id,
          isFavorite: song.isFavorite
        }
      });

    } catch (error) {
      console.error('Toggle favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle favorite'
      });
    }
  }

  // Music Generation Callback
  async musicGenerationCallback(req, res) {
    try {
      const { songId } = req.params;
      const callbackData = req.body;

      console.log(`Received callback for song ${songId}:`, callbackData);

      const song = await Song.findById(songId);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Update song based on callback data
      if (callbackData.status === 'completed') {
        song.status = 'completed';
        song.audioUrl = callbackData.audio_url;
        song.duration = callbackData.duration || 0;
        song.completedAt = new Date();

        // Update workspace stats
        if (song.workspace) {
          await Workspace.findByIdAndUpdate(song.workspace, {
            $inc: {
              'stats.completedSongs': 1,
              'stats.totalDuration': song.duration
            }
          });
        }

      } else if (callbackData.status === 'failed') {
        song.status = 'failed';
        song.errorMessage = callbackData.error_message || 'Generation failed';

        // Refund credits on failure
        const user = await User.findById(song.user);
        if (user && song.creditsUsed > 0) {
          user.credits += song.creditsUsed;
          user.totalCreditsUsed -= song.creditsUsed;
          await user.save();
        }
      }

      await song.save();

      res.json({ success: true });

    } catch (error) {
      console.error('Music callback error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get User Stats
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await Song.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalSongs: { $sum: 1 },
            completedSongs: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            },
            totalDuration: { $sum: '$duration' },
            totalCreditsUsed: { $sum: '$creditsUsed' },
            favoriteSongs: {
              $sum: {
                $cond: [{ $eq: ['$isFavorite', true] }, 1, 0]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalSongs: 0,
        completedSongs: 0,
        totalDuration: 0,
        totalCreditsUsed: 0,
        favoriteSongs: 0
      };

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user stats'
      });
    }
  }
}

// Export as default
export default new MusicController();
