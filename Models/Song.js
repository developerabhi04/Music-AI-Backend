import mongoose from 'mongoose';

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  prompt: {
    type: String,
    trim: true,
    maxlength: [2000, 'Prompt cannot exceed 2000 characters']
  },
  lyrics: {
    type: String,
    trim: true,
    maxlength: [10000, 'Lyrics cannot exceed 10000 characters']
  },
  timestampedLyrics: [{
    timestamp: {
      type: Number, // in milliseconds
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    duration: Number // duration of this line in milliseconds
  }],
  styleTags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Style tag cannot exceed 50 characters']
  }],
  inspirationTags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Inspiration tag cannot exceed 50 characters']
  }],
  genre: {
    type: String,
    trim: true,
    maxlength: [50, 'Genre cannot exceed 50 characters']
  },
  mood: {
    type: String,
    trim: true,
    maxlength: [50, 'Mood cannot exceed 50 characters']
  },
  tempo: {
    type: String,
    enum: ['slow', 'medium', 'fast', 'variable'],
    default: 'medium'
  },
  key: {
    type: String,
    trim: true,
    maxlength: [10, 'Key cannot exceed 10 characters']
  },
  isInstrumental: {
    type: Boolean,
    default: false
  },
  audioMode: {
    type: String,
    enum: ['byline', 'full'],
    default: 'full'
  },
  modelVersion: {
    type: String,
    enum: ['v3_5', 'v4', 'v4_5'],
    default: 'v4',
    required: true
  },
  audioUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Audio URL must be a valid URL'
    }
  },
  wavUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'WAV URL must be a valid URL'
    }
  },
  vocalUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Vocal URL must be a valid URL'
    }
  },
  instrumentalUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Instrumental URL must be a valid URL'
    }
  },
  videoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Video URL must be a valid URL'
    }
  },
  coverUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Cover URL must be a valid URL'
    }
  },
  thumbnailUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Thumbnail URL must be a valid URL'
    }
  },
  originalAudioUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Original audio URL must be a valid URL'
    }
  },
  duration: {
    type: Number, // in seconds
    default: 0,
    min: [0, 'Duration cannot be negative']
  },
  fileSize: {
    type: Number, // in bytes
    default: 0,
    min: [0, 'File size cannot be negative']
  },
  bitrate: {
    type: Number, // in kbps
    min: [0, 'Bitrate cannot be negative']
  },
  sampleRate: {
    type: Number, // in Hz
    min: [0, 'Sample rate cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed', 'processing'],
    default: 'pending',
    required: true,
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100']
  },
  sunoTaskId: {
    type: String,
    trim: true,
    sparse: true
  },
  sunoTaskIds: [{
    type: {
      type: String,
      enum: ['generate', 'extend', 'cover', 'lyrics', 'wav', 'separate', 'video', 'boost'],
      required: true
    },
    taskId: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  processingLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error'],
      default: 'info'
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    details: mongoose.Schema.Types.Mixed
  }],
  errorMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Error message cannot exceed 500 characters']
  },
  errorCode: {
    type: String,
    trim: true,
    maxlength: [50, 'Error code cannot exceed 50 characters']
  },
  retryCount: {
    type: Number,
    default: 0,
    min: [0, 'Retry count cannot be negative'],
    max: [5, 'Maximum 5 retries allowed']
  },
  creditsUsed: {
    type: Number,
    default: 0,
    min: [0, 'Credits used cannot be negative']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  parentSong: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  },
  childSongs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  },
  playCount: {
    type: Number,
    default: 0,
    min: [0, 'Play count cannot be negative']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'owner'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  sharing: {
    isShared: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      trim: true
    },
    shareExpiresAt: Date,
    sharePermissions: {
      canPlay: {
        type: Boolean,
        default: true
      },
      canDownload: {
        type: Boolean,
        default: false
      },
      canView: {
        type: Boolean,
        default: true
      }
    }
  },
  completedAt: Date,
  lastPlayedAt: Date,
  lastModifiedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
songSchema.index({ user: 1, createdAt: -1 });
songSchema.index({ workspace: 1, createdAt: -1 });
songSchema.index({ status: 1, createdAt: -1 });
songSchema.index({ user: 1, status: 1 });
songSchema.index({ user: 1, isFavorite: 1 });
songSchema.index({ user: 1, isArchived: 1 });
songSchema.index({ isPublic: 1, createdAt: -1 });
songSchema.index({ modelVersion: 1, status: 1 });
songSchema.index({ styleTags: 1 });
songSchema.index({ title: 'text', description: 'text', lyrics: 'text' });

// Virtual for formatted duration
songSchema.virtual('formattedDuration').get(function () {
  if (!this.duration) return '0:00';

  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for file size in MB
songSchema.virtual('fileSizeMB').get(function () {
  return this.fileSize ? (this.fileSize / (1024 * 1024)).toFixed(2) : 0;
});

// Virtual for progress percentage
songSchema.virtual('progressPercentage').get(function () {
  return `${this.progress}%`;
});

// Virtual for is completed
songSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

// Virtual for is failed
songSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

// Virtual for is processing
songSchema.virtual('isProcessing').get(function () {
  return ['pending', 'generating', 'processing'].includes(this.status);
});

// Pre-save middleware to update lastModifiedAt
songSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedAt = new Date();
  }

  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

// Instance method to add processing log
songSchema.methods.addLog = function (level, message, details = null) {
  this.processingLogs.push({
    level,
    message,
    details
  });

  // Keep only last 50 logs
  if (this.processingLogs.length > 50) {
    this.processingLogs = this.processingLogs.slice(-50);
  }

  return this.save();
};

// Instance method to add Suno task
songSchema.methods.addSunoTask = function (type, taskId, status = 'pending') {
  this.sunoTaskIds.push({
    type,
    taskId,
    status
  });
  return this.save();
};

// Instance method to update Suno task status
songSchema.methods.updateSunoTaskStatus = function (taskId, status) {
  const task = this.sunoTaskIds.find(t => t.taskId === taskId);
  if (task) {
    task.status = status;
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to increment play count
songSchema.methods.incrementPlayCount = function () {
  this.playCount += 1;
  this.lastPlayedAt = new Date();
  return this.save();
};

// Instance method to increment download count
songSchema.methods.incrementDownloadCount = function () {
  this.downloadCount += 1;
  return this.save();
};

// Instance method to toggle favorite
songSchema.methods.toggleFavorite = function () {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

// Static method to get user's song stats
songSchema.statics.getUserStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
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
        totalPlays: { $sum: '$playCount' },
        totalDownloads: { $sum: '$downloadCount' },
        favoriteSongs: {
          $sum: {
            $cond: [{ $eq: ['$isFavorite', true] }, 1, 0]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalSongs: 0,
    completedSongs: 0,
    totalDuration: 0,
    totalCreditsUsed: 0,
    totalPlays: 0,
    totalDownloads: 0,
    favoriteSongs: 0
  };
};

// Static method to find songs by tags
songSchema.statics.findByTags = function (tags, limit = 20) {
  return this.find({
    $or: [
      { styleTags: { $in: tags } },
      { inspirationTags: { $in: tags } },
      { tags: { $in: tags } }
    ],
    status: 'completed',
    isPublic: true
  })
    .limit(limit)
    .sort({ createdAt: -1 });
};

export default mongoose.model('Song', songSchema);
