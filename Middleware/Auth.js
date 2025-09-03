// Middleware/Auth.js
import jwt from 'jsonwebtoken';
import User from '../Models/User.js';

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid token format.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id)
            .select('-password -emailVerificationToken -passwordResetToken');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid. User not found.'
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Token is not valid.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export default auth;
