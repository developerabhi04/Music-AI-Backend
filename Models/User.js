import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  avatar: {
    type: String,
    default: null
  },
  credits: {
    type: Number,
    default: 30,
    min: [0, 'Credits cannot be negative']
  },
  totalCreditsUsed: {
    type: Number,
    default: 0,
    min: [0, 'Total credits used cannot be negative']
  },
  isPro: {
    type: Boolean,
    default: false
  },
  proExpiresAt: {
    type: Date,
    default: null
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'canceled', 'past_due'],
      default: 'inactive'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  preferences: {
    defaultModelVersion: {
      type: String,
      enum: ['v3_5', 'v4', 'v4_5'],
      default: 'v4'
    },
    autoSavePrompts: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['dark', 'light', 'auto'],
      default: 'dark'
    }
  },
  workspaces: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  lastActivity: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ isActive: 1 });
userSchema.index({ isPro: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActivity: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.username;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastActivity
userSchema.pre('save', function (next) {
  if (this.isNew || this.isModified()) {
    this.lastActivity = new Date();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to deduct credits
userSchema.methods.deductCredits = async function (amount) {
  if (this.credits < amount) {
    throw new Error('Insufficient credits');
  }

  this.credits -= amount;
  this.totalCreditsUsed += amount;
  return this.save();
};

// Instance method to add credits
userSchema.methods.addCredits = async function (amount) {
  this.credits += amount;
  return this.save();
};

// Instance method to check if user is pro
userSchema.methods.isProActive = function () {
  if (!this.isPro) return false;
  if (!this.proExpiresAt) return true; // Lifetime pro
  return this.proExpiresAt > new Date();
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({
    email: email.toLowerCase(),
    isActive: true
  }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if account is locked
  if (user.isLocked) {
    throw new Error('Account is temporarily locked due to too many failed login attempts');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    throw new Error('Invalid credentials');
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  return user;
};

// Static method to get user stats
userSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        proUsers: {
          $sum: {
            $cond: [{ $eq: ['$isPro', true] }, 1, 0]
          }
        },
        totalCreditsUsed: { $sum: '$totalCreditsUsed' },
        averageCredits: { $avg: '$credits' }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    proUsers: 0,
    totalCreditsUsed: 0,
    averageCredits: 0
  };
};

export default mongoose.model('User', userSchema);
