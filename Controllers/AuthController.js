import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import validator from 'validator';
import User from '../Models/User.js';
import Workspace from '../Models/Workspace.js';

class AuthController {
    // Register User
    async register(req, res) {
        try {
            const { username, email, password, firstName, lastName } = req.body;

            // Validation
            const errors = [];

            if (!username || username.length < 3) {
                errors.push('Username must be at least 3 characters long');
            }

            if (!email || !validator.isEmail(email)) {
                errors.push('Please provide a valid email');
            }

            if (!password || password.length < 6) {
                errors.push('Password must be at least 6 characters long');
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [
                    { email: email.toLowerCase() },
                    { username: username.toLowerCase() }
                ]
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email or username'
                });
            }

            // Create new user
            const user = new User({
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password,
                firstName: firstName?.trim(),
                lastName: lastName?.trim(),
                emailVerificationToken: crypto.randomBytes(32).toString('hex'),
                emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
            });

            await user.save();

            // Create default workspace
            const defaultWorkspace = await Workspace.createDefault(user._id);

            // Add workspace to user
            user.workspaces.push(defaultWorkspace._id);
            await user.save();

            // Generate JWT token
            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            // Remove password from response
            const userResponse = user.toObject();
            delete userResponse.password;

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    token,
                    user: userResponse
                }
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Registration failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Login User
    async login(req, res) {
        try {
            const { email, password, rememberMe = false } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            if (!validator.isEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email'
                });
            }

            // Find user and validate password
            const user = await User.findByCredentials(email, password);

            // Generate JWT token
            const expiresIn = rememberMe ? '30d' : '7d';
            const token = jwt.sign(
                {
                    id: user._id,
                    email: user.email,
                    username: user.username
                },
                process.env.JWT_SECRET,
                { expiresIn }
            );

            // Update last login
            user.lastLogin = new Date();
            user.lastActivity = new Date();
            await user.save();

            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.emailVerificationToken;
            delete userResponse.passwordResetToken;

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: userResponse,
                    expiresIn: rememberMe ? '30 days' : '7 days'
                }
            });

        } catch (error) {
            console.error('Login error:', error);

            // Handle specific authentication errors
            if (error.message.includes('credentials') || error.message.includes('locked')) {
                return res.status(401).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Login failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get Current User
    async getCurrentUser(req, res) {
        try {
            const user = await User.findById(req.user.id)
                .populate('workspaces', 'name description isDefault')
                .select('-password -emailVerificationToken -passwordResetToken');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update last activity
            user.lastActivity = new Date();
            await user.save();

            res.json({
                success: true,
                data: {
                    user
                }
            });

        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user information',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Profile
    async updateProfile(req, res) {
        try {
            const { firstName, lastName, avatar } = req.body;
            const userId = req.user.id;

            const updateData = {};

            if (firstName !== undefined) updateData.firstName = firstName?.trim();
            if (lastName !== undefined) updateData.lastName = lastName?.trim();
            if (avatar !== undefined) updateData.avatar = avatar?.trim();

            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            ).select('-password -emailVerificationToken -passwordResetToken');

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    user
                }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Preferences
    async updatePreferences(req, res) {
        try {
            const { defaultModelVersion, autoSavePrompts, emailNotifications, theme } = req.body;
            const userId = req.user.id;

            const updateData = {};

            if (defaultModelVersion) updateData['preferences.defaultModelVersion'] = defaultModelVersion;
            if (autoSavePrompts !== undefined) updateData['preferences.autoSavePrompts'] = autoSavePrompts;
            if (emailNotifications !== undefined) updateData['preferences.emailNotifications'] = emailNotifications;
            if (theme) updateData['preferences.theme'] = theme;

            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            ).select('-password -emailVerificationToken -passwordResetToken');

            res.json({
                success: true,
                message: 'Preferences updated successfully',
                data: {
                    user
                }
            });

        } catch (error) {
            console.error('Update preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update preferences',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Change Password
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            // Validation
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters long'
                });
            }

            // Get user with password
            const user = await User.findById(userId).select('+password');
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify current password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Update password
            user.password = newPassword;
            await user.save();

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to change password',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Forgot Password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email || !validator.isEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email'
                });
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                // Don't reveal if user exists or not for security
                return res.json({
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            user.passwordResetToken = resetToken;
            user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour

            await user.save();

            // In a real application, you would send an email here
            console.log(`Password reset token for ${email}: ${resetToken}`);

            res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent',
                // In development, include the token
                ...(process.env.NODE_ENV === 'development' && { resetToken })
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process password reset request',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Reset Password
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Reset token and new password are required'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
            }

            // Find user with valid reset token
            const user = await User.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Password reset token is invalid or has expired'
                });
            }

            // Update password and clear reset token
            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.loginAttempts = 0; // Reset login attempts
            user.lockUntil = undefined;

            await user.save();

            res.json({
                success: true,
                message: 'Password has been reset successfully'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset password',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Refresh Token
    async refreshToken(req, res) {
        try {
            const userId = req.user.id;

            // Generate new token
            const token = jwt.sign(
                {
                    id: userId,
                    email: req.user.email,
                    username: req.user.username
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    token,
                    expiresIn: '7 days'
                }
            });

        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh token',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Logout (Optional - for token blacklisting if implemented)
    async logout(req, res) {
        try {
            // In a stateless JWT implementation, logout is handled client-side
            // Here you could implement token blacklisting if needed

            res.json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete Account
    async deleteAccount(req, res) {
        try {
            const { password } = req.body;
            const userId = req.user.id;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required to delete account'
                });
            }

            // Get user with password
            const user = await User.findById(userId).select('+password');
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is incorrect'
                });
            }

            // Soft delete - deactivate account
            user.isActive = false;
            user.email = `deleted_${Date.now()}_${user.email}`;
            user.username = `deleted_${Date.now()}_${user.username}`;
            await user.save();

            // TODO: Clean up user's data, workspaces, songs, etc.

            res.json({
                success: true,
                message: 'Account has been deactivated successfully'
            });

        } catch (error) {
            console.error('Delete account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete account',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default new AuthController();
