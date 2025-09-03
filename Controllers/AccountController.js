import sunoApi from '../Config/SunoApi.js';
import User from '../Models/User.js';
import Song from '../Models/Song.js';



class AccountController {
    // Get Credits
    async getCredits(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Get Suno API credits as well
            let sunoCredits = null;
            try {
                const sunoData = await sunoApi.getCredits();
                sunoCredits = sunoData;
            } catch (error) {
                console.warn('Error fetching Suno credits:', error.message);
            }

            res.json({
                success: true,
                data: {
                    localCredits: user.credits,
                    totalCreditsUsed: user.totalCreditsUsed,
                    isPro: user.isPro,
                    isProActive: user.isProActive(),
                    proExpiresAt: user.proExpiresAt,
                    subscription: user.subscription,
                    sunoCredits,
                    username: user.username,
                    email: user.email,
                    joinedAt: user.createdAt
                }
            });

        } catch (error) {
            console.error('Get credits error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get account information',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Purchase Credits
    async purchaseCredits(req, res) {
        try {
            const { amount, paymentMethod, transactionId } = req.body;
            const userId = req.user.id;

            // Validation
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credit amount'
                });
            }

            if (amount > 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 10,000 credits can be purchased at once'
                });
            }

            // Here you would integrate with a payment processor like Stripe
            // For development, we'll just add credits directly

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const oldBalance = user.credits;
            await user.addCredits(amount);

            // Log the transaction (in production, save to a transactions table)
            console.log('Credit purchase:', {
                userId,
                amount,
                paymentMethod,
                transactionId,
                oldBalance,
                newBalance: user.credits,
                timestamp: new Date()
            });

            res.json({
                success: true,
                message: `Successfully added ${amount} credits to your account`,
                data: {
                    creditsAdded: amount,
                    previousBalance: oldBalance,
                    newBalance: user.credits,
                    transactionId: transactionId || `tx_${Date.now()}`
                }
            });

        } catch (error) {
            console.error('Purchase credits error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to purchase credits',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Upgrade to Pro
    async upgradeToPro(req, res) {
        try {
            const { plan = 'pro', duration = 'monthly' } = req.body;
            const userId = req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (user.isProActive()) {
                return res.status(400).json({
                    success: false,
                    message: 'User is already a Pro member'
                });
            }

            // Calculate pro expiration date
            let proExpiresAt;
            const bonusCredits = 100;

            switch (duration) {
                case 'monthly':
                    proExpiresAt = new Date();
                    proExpiresAt.setMonth(proExpiresAt.getMonth() + 1);
                    break;
                case 'yearly':
                    proExpiresAt = new Date();
                    proExpiresAt.setFullYear(proExpiresAt.getFullYear() + 1);
                    break;
                case 'lifetime':
                    proExpiresAt = null; // Lifetime pro
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid duration'
                    });
            }

            // Update user to pro
            user.isPro = true;
            user.proExpiresAt = proExpiresAt;
            user.subscription = {
                plan: plan,
                status: 'active',
                startDate: new Date(),
                endDate: proExpiresAt,
                autoRenew: true
            };

            // Add bonus credits for pro users
            await user.addCredits(bonusCredits);

            await user.save();

            res.json({
                success: true,
                message: `Successfully upgraded to ${plan.toUpperCase()}!`,
                data: {
                    isPro: user.isPro,
                    proExpiresAt: user.proExpiresAt,
                    subscription: user.subscription,
                    bonusCreditsAdded: bonusCredits,
                    newBalance: user.credits
                }
            });

        } catch (error) {
            console.error('Upgrade to pro error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upgrade to Pro',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Cancel Subscription
    async cancelSubscription(req, res) {
        try {
            const userId = req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (!user.isPro) {
                return res.status(400).json({
                    success: false,
                    message: 'User does not have an active subscription'
                });
            }

            // Update subscription status
            user.subscription.status = 'canceled';
            user.subscription.autoRenew = false;

            // Keep pro benefits until expiration date
            await user.save();

            res.json({
                success: true,
                message: 'Subscription canceled successfully. Pro benefits will remain active until expiration.',
                data: {
                    subscription: user.subscription,
                    proExpiresAt: user.proExpiresAt
                }
            });

        } catch (error) {
            console.error('Cancel subscription error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel subscription',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get Account Statistics
    async getAccountStats(req, res) {
        try {
            const userId = req.user.id;

            // Get user stats
            const userStats = await Song.getUserStats(userId);

            // Get usage by month (last 12 months)
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const monthlyUsage = await Song.aggregate([
                {
                    $match: {
                        user: userId,
                        createdAt: { $gte: twelveMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        songsCreated: { $sum: 1 },
                        creditsUsed: { $sum: '$creditsUsed' }
                    }
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1 }
                }
            ]);

            // Get favorite genres/styles
            const topStyles = await Song.aggregate([
                {
                    $match: {
                        user: userId,
                        status: 'completed'
                    }
                },
                {
                    $unwind: '$styleTags'
                },
                {
                    $group: {
                        _id: '$styleTags',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            res.json({
                success: true,
                data: {
                    overview: userStats,
                    monthlyUsage,
                    topStyles: topStyles.map(item => ({
                        style: item._id,
                        count: item.count
                    })),
                    generatedAt: new Date()
                }
            });

        } catch (error) {
            console.error('Get account stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get account statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get Usage History
    async getUsageHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 50, startDate, endDate } = req.query;

            const query = { user: userId };

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const songs = await Song.find(query)
                .select('title status creditsUsed modelVersion createdAt completedAt')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Song.countDocuments(query);

            res.json({
                success: true,
                data: {
                    usage: songs,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get usage history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get usage history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Export Account Data
    async exportAccountData(req, res) {
        try {
            const userId = req.user.id;

            const user = await User.findById(userId)
                .select('-password -emailVerificationToken -passwordResetToken')
                .populate('workspaces', 'name description createdAt');

            const songs = await Song.find({ user: userId })
                .populate('workspace', 'name')
                .select('-processingLogs -metadata');

            const exportData = {
                user: user.toObject(),
                songs: songs.map(song => song.toObject()),
                exportedAt: new Date(),
                version: '1.0'
            };

            res.json({
                success: true,
                message: 'Account data exported successfully',
                data: exportData
            });

        } catch (error) {
            console.error('Export account data error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export account data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default new AccountController();
