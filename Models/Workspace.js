import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Workspace name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
        minlength: [1, 'Name must be at least 1 character']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    color: {
        type: String,
        trim: true,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color'],
        default: '#ff6b35'
    },
    icon: {
        type: String,
        trim: true,
        maxlength: [50, 'Icon cannot exceed 50 characters'],
        default: 'music'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true
    },
    songs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song'
    }],
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },
    isTrashed: {
        type: Boolean,
        default: false,
        index: true
    },
    isShared: {
        type: Boolean,
        default: false
    },
    shareToken: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    shareSettings: {
        isPublic: {
            type: Boolean,
            default: false
        },
        allowComments: {
            type: Boolean,
            default: false
        },
        allowDownloads: {
            type: Boolean,
            default: false
        },
        expiresAt: Date
    },
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['viewer', 'editor', 'admin'],
            default: 'viewer'
        },
        permissions: {
            canCreateSongs: {
                type: Boolean,
                default: false
            },
            canEditSongs: {
                type: Boolean,
                default: false
            },
            canDeleteSongs: {
                type: Boolean,
                default: false
            },
            canManageWorkspace: {
                type: Boolean,
                default: false
            },
            canInviteUsers: {
                type: Boolean,
                default: false
            }
        },
        invitedAt: {
            type: Date,
            default: Date.now
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: Date,
        lastAccessedAt: Date
    }],
    settings: {
        autoSave: {
            type: Boolean,
            default: true
        },
        defaultModelVersion: {
            type: String,
            enum: ['v3_5', 'v4', 'v4_5'],
            default: 'v4'
        },
        defaultAudioMode: {
            type: String,
            enum: ['byline', 'full'],
            default: 'full'
        },
        allowPublicSongs: {
            type: Boolean,
            default: false
        },
        notifications: {
            onSongCompleted: {
                type: Boolean,
                default: true
            },
            onCollaboratorJoined: {
                type: Boolean,
                default: true
            },
            onWorkspaceShared: {
                type: Boolean,
                default: true
            }
        }
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    stats: {
        totalSongs: {
            type: Number,
            default: 0,
            min: 0
        },
        completedSongs: {
            type: Number,
            default: 0,
            min: 0
        },
        totalDuration: {
            type: Number,
            default: 0,
            min: 0
        },
        creditsUsed: {
            type: Number,
            default: 0,
            min: 0
        },
        lastActivityAt: {
            type: Date,
            default: Date.now
        }
    },
    template: {
        isTemplate: {
            type: Boolean,
            default: false
        },
        templateName: {
            type: String,
            trim: true,
            maxlength: [100, 'Template name cannot exceed 100 characters']
        },
        templateDescription: {
            type: String,
            trim: true,
            maxlength: [500, 'Template description cannot exceed 500 characters']
        },
        templateTags: [{
            type: String,
            trim: true,
            maxlength: [30, 'Template tag cannot exceed 30 characters']
        }],
        isPublicTemplate: {
            type: Boolean,
            default: false
        },
        usageCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    trashedAt: Date,
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
workspaceSchema.index({ user: 1, name: 1 });
workspaceSchema.index({ user: 1, isTrashed: 1 });
workspaceSchema.index({ user: 1, isDefault: 1 });
workspaceSchema.index({ isShared: 1, 'shareSettings.isPublic': 1 });
workspaceSchema.index({ 'template.isTemplate': 1, 'template.isPublicTemplate': 1 });
workspaceSchema.index({ 'stats.lastActivityAt': -1 });
workspaceSchema.index({ createdAt: -1 });

// Compound indexes
workspaceSchema.index({ user: 1, isTrashed: 1, createdAt: -1 });
workspaceSchema.index({ 'collaborators.user': 1, isTrashed: 1 });

// Virtual for songs count
workspaceSchema.virtual('songsCount').get(function () {
    return this.songs ? this.songs.length : 0;
});

// Virtual for collaborators count
workspaceSchema.virtual('collaboratorsCount').get(function () {
    return this.collaborators ? this.collaborators.length : 0;
});

// Virtual for formatted last activity
workspaceSchema.virtual('formattedLastActivity').get(function () {
    if (!this.stats.lastActivityAt) return 'Never';

    const now = new Date();
    const diff = now - this.stats.lastActivityAt;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
});

// Virtual for total duration formatted
workspaceSchema.virtual('formattedTotalDuration').get(function () {
    const totalSeconds = this.stats.totalDuration || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Pre-save middleware to update lastModifiedAt
workspaceSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.lastModifiedAt = new Date();
    }

    // Set trashedAt when moving to trash
    if (this.isModified('isTrashed') && this.isTrashed && !this.trashedAt) {
        this.trashedAt = new Date();
    }

    // Clear trashedAt when restoring
    if (this.isModified('isTrashed') && !this.isTrashed && this.trashedAt) {
        this.trashedAt = undefined;
    }

    next();
});

// Pre-save middleware to ensure only one default workspace per user
workspaceSchema.pre('save', async function (next) {
    if (this.isModified('isDefault') && this.isDefault) {
        // Set all other workspaces for this user to non-default
        await this.constructor.updateMany(
            {
                user: this.user,
                _id: { $ne: this._id },
                isDefault: true
            },
            { $set: { isDefault: false } }
        );
    }
    next();
});

// Instance method to add song
workspaceSchema.methods.addSong = async function (songId) {
    if (!this.songs.includes(songId)) {
        this.songs.push(songId);
        this.stats.totalSongs += 1;
        this.stats.lastActivityAt = new Date();
        return this.save();
    }
    return this;
};

// Instance method to remove song
workspaceSchema.methods.removeSong = async function (songId) {
    const index = this.songs.indexOf(songId);
    if (index > -1) {
        this.songs.splice(index, 1);
        this.stats.totalSongs = Math.max(0, this.stats.totalSongs - 1);
        this.stats.lastActivityAt = new Date();
        return this.save();
    }
    return this;
};

// Instance method to add collaborator
workspaceSchema.methods.addCollaborator = function (userId, role = 'viewer', invitedBy = null) {
    // Check if user is already a collaborator
    const existingCollaborator = this.collaborators.find(
        c => c.user.toString() === userId.toString()
    );

    if (existingCollaborator) {
        throw new Error('User is already a collaborator');
    }

    const permissions = this.getDefaultPermissions(role);

    this.collaborators.push({
        user: userId,
        role,
        permissions,
        invitedBy,
        invitedAt: new Date()
    });

    return this.save();
};

// Instance method to remove collaborator
workspaceSchema.methods.removeCollaborator = function (userId) {
    this.collaborators = this.collaborators.filter(
        c => c.user.toString() !== userId.toString()
    );
    return this.save();
};

// Instance method to update collaborator role
workspaceSchema.methods.updateCollaboratorRole = function (userId, newRole) {
    const collaborator = this.collaborators.find(
        c => c.user.toString() === userId.toString()
    );

    if (!collaborator) {
        throw new Error('Collaborator not found');
    }

    collaborator.role = newRole;
    collaborator.permissions = this.getDefaultPermissions(newRole);

    return this.save();
};

// Instance method to get default permissions for role
workspaceSchema.methods.getDefaultPermissions = function (role) {
    const defaultPermissions = {
        viewer: {
            canCreateSongs: false,
            canEditSongs: false,
            canDeleteSongs: false,
            canManageWorkspace: false,
            canInviteUsers: false
        },
        editor: {
            canCreateSongs: true,
            canEditSongs: true,
            canDeleteSongs: false,
            canManageWorkspace: false,
            canInviteUsers: false
        },
        admin: {
            canCreateSongs: true,
            canEditSongs: true,
            canDeleteSongs: true,
            canManageWorkspace: true,
            canInviteUsers: true
        }
    };

    return defaultPermissions[role] || defaultPermissions.viewer;
};

// Instance method to check user permissions
workspaceSchema.methods.hasPermission = function (userId, permission) {
    // Owner has all permissions
    if (this.user.toString() === userId.toString()) {
        return true;
    }

    const collaborator = this.collaborators.find(
        c => c.user.toString() === userId.toString()
    );

    if (!collaborator) {
        return false;
    }

    return collaborator.permissions[permission] || false;
};

// Instance method to update stats
workspaceSchema.methods.updateStats = async function () {
    const Song = mongoose.model('Song');

    const stats = await Song.aggregate([
        { $match: { workspace: this._id } },
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
                creditsUsed: { $sum: '$creditsUsed' }
            }
        }
    ]);

    const result = stats[0] || {
        totalSongs: 0,
        completedSongs: 0,
        totalDuration: 0,
        creditsUsed: 0
    };

    this.stats = {
        ...this.stats,
        ...result,
        lastActivityAt: new Date()
    };

    return this.save();
};

// Static method to create default workspace for user
workspaceSchema.statics.createDefault = async function (userId, name = 'My Workspace') {
    return this.create({
        name,
        description: 'Default workspace for your music creations',
        user: userId,
        isDefault: true
    });
};

// Static method to find user's workspaces
workspaceSchema.statics.findByUser = function (userId, includeShared = true) {
    const query = {
        $or: [
            { user: userId },
            ...(includeShared ? [{ 'collaborators.user': userId }] : [])
        ],
        isTrashed: false
    };

    return this.find(query)
        .populate('user', 'username email avatar')
        .populate('collaborators.user', 'username email avatar')
        .populate({
            path: 'songs',
            select: 'title status duration createdAt',
            options: { sort: { createdAt: -1 }, limit: 10 }
        })
        .sort({ isDefault: -1, createdAt: -1 });
};

// Static method to find public templates
workspaceSchema.statics.findPublicTemplates = function (limit = 20) {
    return this.find({
        'template.isTemplate': true,
        'template.isPublicTemplate': true,
        isTrashed: false
    })
        .select('name description template.templateName template.templateDescription template.templateTags template.usageCount createdAt')
        .sort({ 'template.usageCount': -1, createdAt: -1 })
        .limit(limit);
};

export default mongoose.model('Workspace', workspaceSchema);
