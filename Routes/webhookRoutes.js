import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import Song from '../Models/Song.js';
import Workspace from '../Models/Workspace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// ✅ Enhanced audio download with better error handling
async function downloadAudio(audioUrl, songId) {
    try {
        console.log(`📥 Downloading audio from: ${audioUrl}`);

        const response = await axios({
            method: 'GET',
            url: audioUrl,
            responseType: 'stream',
            timeout: 60000, // 60 second timeout
            headers: {
                'User-Agent': 'MusicAI-Backend/1.0'
            }
        });

        const filename = `${songId}.mp3`;
        const audioDir = path.join(__dirname, '..', 'public', 'generated-music');
        const audioPath = path.join(audioDir, filename);

        // Ensure directory exists
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
            console.log(`✅ Created directory: ${audioDir}`);
        }

        // Save audio file
        const writer = fs.createWriteStream(audioPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                const fileSize = fs.statSync(audioPath).size;
                console.log(`✅ Audio saved: ${audioPath} (${fileSize} bytes)`);

                if (fileSize === 0) {
                    reject(new Error('Downloaded file is empty'));
                    return;
                }

                resolve(`${process.env.BACKEND_URL}/generated-music/${filename}`);
            });

            writer.on('error', (error) => {
                console.error('❌ Error writing audio file:', error);
                reject(error);
            });

            // Handle download timeout
            setTimeout(() => {
                writer.destroy();
                reject(new Error('Audio download timeout'));
            }, 60000);
        });

    } catch (error) {
        console.error('❌ Error downloading audio:', error.message);
        throw error;
    }
}

// ✅ Enhanced song processing
async function processSongCallback(songData) {
    try {
        console.log('🎵 Processing song callback:', songData);

        const { id, audio_url, image_url, title, tags, duration, video_url } = songData;

        // Find the song record by Suno task ID
        const song = await Song.findOne({ sunoTaskId: id });

        if (!song) {
            console.error(`❌ Song not found for taskId: ${id}`);
            return;
        }

        console.log(`📝 Updating song: ${song.title} (${song._id})`);

        // ✅ Download the actual audio file
        let localAudioUrl = `${process.env.BACKEND_URL}/generated-music/${song._id}.mp3`;

        if (audio_url) {
            try {
                localAudioUrl = await downloadAudio(audio_url, song._id);
                console.log(`✅ Audio downloaded for song: ${song.title}`);
            } catch (downloadError) {
                console.error('❌ Failed to download audio:', downloadError.message);

                // If download fails, mark as failed rather than completed
                song.status = 'failed';
                song.errorMessage = `Failed to download audio: ${downloadError.message}`;
                await song.save();
                return;
            }
        }

        // Update song with generated data
        song.status = 'completed';
        song.audioUrl = localAudioUrl;
        song.imageUrl = image_url;
        song.videoUrl = video_url;
        song.title = title || song.title;
        song.duration = duration || 180;
        song.completedAt = new Date();

        if (tags && Array.isArray(tags)) {
            song.tags = tags;
        }

        await song.save();

        // Update workspace stats
        if (song.workspace) {
            await Workspace.findByIdAndUpdate(song.workspace, {
                $inc: {
                    'stats.completedSongs': 1,
                    'stats.totalDuration': song.duration,
                    'stats.creditsUsed': song.creditsUsed
                },
                'stats.lastActivityAt': new Date()
            });
        }

        console.log(`✅ Song completed successfully: ${song.title} -> ${localAudioUrl}`);

    } catch (error) {
        console.error('❌ Error processing song callback:', error);
    }
}

// ✅ Enhanced Suno Webhook Handler
router.post('/suno', async (req, res) => {
    try {
        console.log('🎵 Suno Webhook Received:', JSON.stringify(req.body, null, 2));

        const { code, msg, data } = req.body;

        if (code === 200 && data) {
            // Handle different callback data structures
            let songsToProcess = [];

            if (data.data && Array.isArray(data.data)) {
                songsToProcess = data.data;
            } else if (data.data) {
                songsToProcess = [data.data];
            } else if (Array.isArray(data)) {
                songsToProcess = data;
            } else {
                songsToProcess = [data];
            }

            console.log(`📊 Processing ${songsToProcess.length} song(s) from callback`);

            // Process each song
            for (const songData of songsToProcess) {
                await processSongCallback(songData);
            }

            console.log('✅ Successfully processed all songs from Suno callback');

        } else if (code !== 200) {
            console.error('❌ Suno generation failed:', msg);

            // Handle failed generations
            if (data && data.task_id) {
                const song = await Song.findOne({ sunoTaskId: data.task_id });
                if (song) {
                    song.status = 'failed';
                    song.errorMessage = msg || 'Generation failed';
                    await song.save();
                }
            }

        } else {
            console.log('📨 Suno webhook received with no processable data:', req.body);
        }

        // Always respond with 200 OK to acknowledge receipt
        res.status(200).json({
            success: true,
            message: 'Callback received and processed successfully',
            processed: songsToProcess?.length || 0
        });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error processing webhook'
        });
    }
});

// ✅ Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook endpoints are working',
        timestamp: new Date().toISOString(),
        routes: {
            suno: 'POST /api/webhooks/suno'
        }
    });
});

export default router;
