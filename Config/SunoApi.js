import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({
    path: "./Config/.env",
});

class SunoApiClient {
    constructor() {
        console.log('🔑 Initializing SunoApiClient...');
        this.apiKey = process.env.SUNO_API_KEY;
        // ✅ FIXED: Use correct base URL from official docs
        this.baseURL = process.env.SUNO_API_URL || 'https://api.sunoapi.org';
        this.timeout = 60000;

        if (!this.apiKey) {
            console.error('❌ SUNO_API_KEY missing! Check environment variables.');
            console.error('Available env keys:', Object.keys(process.env).filter(k => k.includes('SUNO')));
            throw new Error(`
❌ SUNO_API_KEY is required in environment variables!

🔧 Fix steps:
1. Check .env file exists at: ${process.cwd()}/.env  
2. Ensure it contains: SUNO_API_KEY=your_actual_key
3. Restart server completely
4. Make sure dotenv.config() is called first in server.js
      `);
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'MusicAI-Backend/1.0'
            },
            timeout: this.timeout
        });

        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                console.log(`🚀 Suno API Request: ${config.method?.toUpperCase()} ${config.url}`);
                if (config.data) {
                    console.log('📤 Request Data:', JSON.stringify(config.data, null, 2));
                }
                return config;
            },
            (error) => {
                console.error('❌ Suno API Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                console.log(`✅ Suno API Response: ${response.status} - ${response.config.url}`);
                if (response.data) {
                    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
                }
                return response;
            },
            (error) => {
                console.error('❌ Suno API Response Error:', error.response?.data || error.message);
                return Promise.reject(error);
            }
        );

        console.log('✅ SunoApiClient initialized successfully');
    }

    // ✅ FIXED: Generate Music (Based on official docs)
    async generateMusic(params) {
        try {
            // Validate required parameters
            if (!params || typeof params !== 'object') {
                throw new Error('Invalid parameters provided to generateMusic');
            }

            // Map parameters to match official API format
            const requestData = {
                prompt: params.prompt || params.description,
                style: params.style || params.tags,
                title: params.title || '',
                customMode: params.customMode !== false, // Default to true
                instrumental: params.instrumental || params.make_instrumental || false,
                model: this.mapModelVersion(params.model || params.model_version || 'V3_5'),
                negativeTags: params.negativeTags || '',
                vocalGender: params.vocalGender || 'm',
                styleWeight: params.styleWeight || 0.65,
                weirdnessConstraint: params.weirdnessConstraint || 0.65,
                audioWeight: params.audioWeight || 0.65,
                callBackUrl: params.callBackUrl || process.env.CALLBACK_URL
            };

            console.log('🎵 Generating music with params:', requestData);


            const response = await this.client.post('/api/v1/generate', requestData);

            // Handle official API response format
            if (response.data.code === 200) {
                return {
                    success: true,
                    taskId: response.data.data.taskId,
                    id: response.data.data.taskId,
                    message: response.data.msg || 'Music generation started successfully'
                };
            } else {
                throw new Error(response.data.msg || 'Music generation failed');
            }

        } catch (error) {
            console.error('Generate music error:', error);
            throw this.handleError(error);
        }
    }

    // Helper method to map model versions
    mapModelVersion(version) {
        const modelMap = {
            'v3': 'V3',
            'v3_5': 'V3_5',
            'v4': 'V4',
            'v4_5': 'V4_5'
        };

        return modelMap[version?.toLowerCase()] || 'V3_5';
    }

    // ✅ FIXED: Generate Lyrics
    async generateLyrics(params) {
        try {
            const requestData = {
                prompt: params.prompt || params.description,
                style: params.style || '',
                theme: params.theme || ''
            };

            const response = await this.client.post('/api/v1/make-lyrics', requestData);

            if (response.data.code === 200) {
                return {
                    success: true,
                    taskId: response.data.data.taskId || response.data.data,
                    lyrics: response.data.data.text || '',
                    message: response.data.msg || 'Lyrics generated successfully'
                };
            } else {
                throw new Error(response.data.msg || 'Lyrics generation failed');
            }

        } catch (error) {
            console.error('Generate lyrics error:', error);
            throw this.handleError(error);
        }
    }

    // ✅ FIXED: Extend Music
    async extendMusic(params) {
        try {
            const requestData = {
                audioId: params.audioId || params.audio_id,
                prompt: params.prompt || '',
                continueAt: params.continueAt || params.continue_at || 0
            };

            const response = await this.client.post('/api/v1/extend', requestData);

            if (response.data.code === 200) {
                return {
                    success: true,
                    taskId: response.data.data.taskId,
                    message: response.data.msg || 'Music extension started successfully'
                };
            } else {
                throw new Error(response.data.msg || 'Music extension failed');
            }

        } catch (error) {
            console.error('Extend music error:', error);
            throw this.handleError(error);
        }
    }

    // ✅ FIXED: Generate Cover
    async generateCover(params) {
        try {
            const requestData = {
                audioId: params.audioId || params.audio_id,
                style: params.style || params.tags || '',
                callBackUrl: params.callBackUrl || process.env.CALLBACK_URL
            };

            const response = await this.client.post('/api/v1/suno/cover/generate', requestData);

            if (response.data.code === 200) {
                return {
                    success: true,
                    taskId: response.data.data.taskId,
                    message: response.data.msg || 'Cover generation started successfully'
                };
            } else {
                throw new Error(response.data.msg || 'Cover generation failed');
            }

        } catch (error) {
            console.error('Generate cover error:', error);
            throw this.handleError(error);
        }
    }

    // ✅ FIXED: Get Generation Details
    async getGenerationDetails(taskId) {
        try {
            const response = await this.client.get(`/api/v1/generate/record-info?taskId=${taskId}`);

            if (response.data.code === 200) {
                const data = response.data.data;

                return {
                    success: true,
                    status: data.response?.status || data.status || 'PROCESSING',
                    songs: data.response?.sunoData || data.sunoData || [],
                    data: data.response?.sunoData || data.sunoData || [],
                    taskId: data.taskId || taskId,
                    errorMessage: data.response?.errorMessage || data.errorMessage,
                    message: response.data.msg
                };
            } else {
                return {
                    success: false,
                    status: 'FAILED',
                    message: response.data.msg || 'Failed to get generation details'
                };
            }

        } catch (error) {
            console.error('Get generation details error:', error);
            throw this.handleError(error);
        }
    }

    // ✅ FIXED: Get Credits
    async getCredits() {
        try {
            const response = await this.client.get('/api/v1/get-credits');

            if (response.data.code === 200) {
                return {
                    success: true,
                    credits: response.data.data.credits || 0,
                    message: response.data.msg || 'Credits retrieved successfully'
                };
            } else {
                throw new Error(response.data.msg || 'Failed to get credits');
            }

        } catch (error) {
            console.error('Get credits error:', error);
            throw this.handleError(error);
        }
    }

    // Helper method to map model versions
    mapModelVersion(version) {
        const modelMap = {
            'v3': 'V3',
            'v3_5': 'V3_5',
            'v4': 'V4',
            'v4_5': 'V4_5',
            'chirp-v3': 'V3',
            'chirp-v3-5': 'V3_5',
            'chirp-v4': 'V4'
        };

        return modelMap[version?.toLowerCase()] || 'V3_5';
    }

    // ✅ Enhanced Error Handler (Matches API response format)
    handleError(error) {
        let message = 'Suno API Error';
        let status = 500;

        if (error.response) {
            // Server responded with error status
            status = error.response.status;
            const data = error.response.data;

            // Handle official API error format
            if (data && typeof data === 'object') {
                message = data.msg || data.message || data.error || 'Unknown API error';

                // Log detailed error info
                console.error(`❌ Suno API Error ${status}:`, message);
                console.error('Error Code:', data.code);
                console.error('Response data:', data);
            } else {
                message = error.response.statusText || 'HTTP Error';
            }

        } else if (error.request) {
            // Request made but no response
            message = 'No response received from Suno API - Check network connection';
            console.error('❌ Network Error:', error.message);
        } else {
            // Request setup error
            message = error.message;
            console.error('❌ Request Error:', message);
        }

        const customError = new Error(message);
        customError.status = status;
        customError.isApiError = true;
        return customError;
    }

    async healthCheck() {
        try {
            const response = await this.client.get('/api/v1/get-credits');

            if (response.data.code === 200) {
                return {
                    success: true,
                    status: 'healthy',
                    credits: response.data.data?.credits || 0,
                    baseURL: this.baseURL,
                    hasApiKey: !!this.apiKey
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'unhealthy',
                error: error.message,
                baseURL: this.baseURL,
                hasApiKey: !!this.apiKey
            };
        }
    }



    // Additional utility methods based on docs
    async getLyricsDetails(taskId) {
    try {
        const response = await this.client.get(`/api/v1/make-lyrics/record-info?taskId=${taskId}`);

        if (response.data.code === 200) {
            return {
                success: true,
                data: response.data.data,
                message: response.data.msg
            };
        } else {
            throw new Error(response.data.msg || 'Failed to get lyrics details');
        }
    } catch (error) {
        throw this.handleError(error);
    }
}

    async getCoverDetails(taskId) {
    try {
        const response = await this.client.get(`/api/v1/suno/cover/record-info?taskId=${taskId}`);

        if (response.data.code === 200) {
            return {
                success: true,
                data: response.data.data,
                message: response.data.msg
            };
        } else {
            throw new Error(response.data.msg || 'Failed to get cover details');
        }
    } catch (error) {
        throw this.handleError(error);
    }
}
}

export default new SunoApiClient();
