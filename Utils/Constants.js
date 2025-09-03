// Model Versions
export const MODEL_VERSIONS = {
    V3_5: 'v3_5',
    V4: 'v4',
    V4_5: 'v4_5'
};

export const MODEL_INFO = {
    [MODEL_VERSIONS.V3_5]: {
        name: 'v3.5 - Balanced',
        description: 'Solid arrangements with creative diversity, up to 4 minutes duration',
        maxDuration: 240,
        credits: 10
    },
    [MODEL_VERSIONS.V4]: {
        name: 'v4 - High Quality',
        description: 'Best audio quality with refined song structure, up to 4 minutes duration',
        maxDuration: 240,
        credits: 10
    },
    [MODEL_VERSIONS.V4_5]: {
        name: 'v4.5 - Advanced',
        description: 'Superior genre blending with smarter prompts, up to 8 minutes duration',
        maxDuration: 480,
        credits: 15
    }
};

// Credit Costs
export const CREDIT_COSTS = {
    GENERATE_MUSIC: 10,
    EXTEND_MUSIC: 10,
    COVER_AUDIO: 15,
    GENERATE_COVER: 15,
    GENERATE_LYRICS: 5,
    TIMESTAMPED_LYRICS: 3,
    CONVERT_WAV: 2,
    SEPARATE_VOCALS: 8,
    BOOST_STYLE: 12,
    ADD_INSTRUMENTAL: 10,
    ADD_VOCALS: 10,
    CREATE_VIDEO: 20
};

// Audio Modes
export const AUDIO_MODES = {
    BY_LINE: 'byline',
    FULL_SONG: 'full'
};

// Song Status
export const SONG_STATUS = {
    PENDING: 'pending',
    GENERATING: 'generating',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// Upload Types
export const UPLOAD_TYPES = {
    BASE64: 'base64',
    STREAM: 'stream',
    URL: 'url'
};

// Video Styles
export const VIDEO_STYLES = [
    'default',
    'abstract',
    'nature',
    'urban',
    'retro',
    'futuristic',
    'artistic',
    'minimal',
    'psychedelic'
];

// User Roles
export const USER_ROLES = {
    FREE: 'free',
    BASIC: 'basic',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
};

// Workspace Permissions
export const WORKSPACE_PERMISSIONS = {
    VIEWER: 'viewer',
    EDITOR: 'editor',
    ADMIN: 'admin'
};

export default {
    MODEL_VERSIONS,
    MODEL_INFO,
    CREDIT_COSTS,
    AUDIO_MODES,
    SONG_STATUS,
    UPLOAD_TYPES,
    VIDEO_STYLES,
    USER_ROLES,
    WORKSPACE_PERMISSIONS
};
