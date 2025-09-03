import crypto from 'crypto';

// Generate random string
export const generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Format duration from seconds to MM:SS
export const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Format file size from bytes to human readable
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate email format
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Generate slug from text
export const generateSlug = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
};

// Calculate time ago
export const timeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

// Sanitize HTML
export const sanitizeHTML = (html) => {
    return html
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// Parse tags from string
export const parseTags = (tagsString) => {
    if (!tagsString) return [];
    return tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .slice(0, 20); // Limit to 20 tags
};

// Generate color from string (for avatars, etc.)
export const generateColorFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
        '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#118AB2',
        '#073B4C', '#EF476F', '#FFD166', '#06D6A0', '#7209B7'
    ];

    return colors[Math.abs(hash) % colors.length];
};

// Debounce function
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Deep clone object
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
};

// Validate audio URL
export const isValidAudioUrl = (url) => {
    if (!url) return false;

    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const urlLower = url.toLowerCase();

    return audioExtensions.some(ext => urlLower.includes(ext)) ||
        urlLower.includes('audio') ||
        /^https?:\/\/.+/.test(url);
};

// Get file extension from URL
export const getFileExtension = (url) => {
    if (!url) return '';

    const matches = url.match(/\.([^.?]+)(\?|$)/);
    return matches ? matches[1].toLowerCase() : '';
};

// Generate unique filename
export const generateUniqueFilename = (originalName, extension = '') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const baseName = originalName ? originalName.replace(/[^a-zA-Z0-9]/g, '_') : 'file';
    const ext = extension || getFileExtension(originalName);

    return `${baseName}_${timestamp}_${random}${ext ? '.' + ext : ''}`;
};

export default {
    generateRandomString,
    formatDuration,
    formatFileSize,
    isValidEmail,
    generateSlug,
    timeAgo,
    sanitizeHTML,
    parseTags,
    generateColorFromString,
    debounce,
    deepClone,
    isValidAudioUrl,
    getFileExtension,
    generateUniqueFilename
};
