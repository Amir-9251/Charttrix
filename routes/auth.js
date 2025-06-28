const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Configure Google Strategy only if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('Google OAuth profile received:', {
                id: profile.id,
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value
            });

            // Check if user already exists
            let user = await User.findOne({ googleId: profile.id });
            
            if (user) {
                console.log('Existing Google user found:', user.username);
                // Update user's online status and socket info
                user.isOnline = true;
                user.lastSeen = new Date();
                await user.save();
                return done(null, user);
            }

            // Check if user exists with same email but different auth method
            const existingUser = await User.findOne({ email: profile.emails[0].value });
            if (existingUser) {
                console.log('Linking Google account to existing user:', existingUser.username);
                // Link Google account to existing user
                existingUser.googleId = profile.id;
                existingUser.googleEmail = profile.emails[0].value;
                existingUser.profilePicture = profile.photos[0]?.value || null;
                existingUser.isOnline = true;
                existingUser.lastSeen = new Date();
                await existingUser.save();
                return done(null, existingUser);
            }

            // Create new user
            const newUser = new User({
                username: profile.displayName || profile.emails[0].value.split('@')[0],
                email: profile.emails[0].value,
                googleId: profile.id,
                googleEmail: profile.emails[0].value,
                profilePicture: profile.photos[0]?.value || null,
                isOnline: true,
                lastSeen: new Date()
            });

            await newUser.save();
            console.log('New Google user created:', newUser.username);
            return done(null, newUser);
        } catch (error) {
            console.error('Google OAuth error:', error);
            return done(error, null);
        }
    }));
} else {
    console.log('Google OAuth is disabled: Missing client ID or client secret');
}

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth routes - only enable if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get('/google',
        passport.authenticate('google', { 
            scope: ['profile', 'email'],
            prompt: 'select_account' // Force account selection screen
        })
    );

    router.get('/google/callback',
        (req, res, next) => {
            console.log('OAuth callback received with query:', req.query);
            console.log('OAuth callback received with params:', req.params);
            next();
        },
        passport.authenticate('google', { 
            failureRedirect: `${process.env.CLIENT_URL}/login-error`,
            failureFlash: true
        }),
        (req, res) => {
            console.log('OAuth successful, user:', req.user);
            // Successful authentication
            const token = jwt.sign(
                { userId: req.user._id, username: req.user.username },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Redirect to frontend with token
            res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}&userId=${req.user._id}&username=${req.user.username}&email=${req.user.email}`);
        }
    );
} else {
    // Placeholder routes that return error when Google OAuth is not configured
    router.get('/google', (req, res) => {
        res.status(501).json({ error: 'Google OAuth is not configured' });
    });
    
    router.get('/google/callback', (req, res) => {
        res.status(501).json({ error: 'Google OAuth is not configured' });
    });
}

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -otp -otpExpiration');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Debug route to check OAuth configuration
router.get('/debug', (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set',
        clientUrl: process.env.CLIENT_URL || 'Not set',
        jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set',
        callbackUrl: '/auth/google/callback'
    });
});

module.exports = router; 