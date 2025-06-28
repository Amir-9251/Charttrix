const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/emailService');
const { broadcastNewUser } = require('./chatHandlers');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

const authHandlers = (io, socket) => {
    // Store temporary registration data
    const pendingRegistrations = new Map();

    // Google OAuth login handler
    socket.on('google_login', async (data) => {
        try {
            const { token } = data;
            
            if (!token) {
                socket.emit('google_login_error', { error: 'No token provided' });
                return;
            }

            // Verify the JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                socket.emit('google_login_error', { error: 'User not found' });
                return;
            }

            // Update user's socket ID and online status
            await User.findByIdAndUpdate(user._id, {
                socketId: socket.id,
                isOnline: true,
                lastSeen: new Date()
            });

            // Emit user joined event
            io.emit('user_joined', {
                id: socket.id,
                username: user.username,
                timestamp: new Date()
            });

            // Get all users
            const users = await User.find({}, {
                password: 0,
                otp: 0,
                otpExpiration: 0
            }).sort({ isOnline: -1, lastSeen: -1 });

            socket.emit('users_list', users);
            socket.emit('google_login_success', {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profilePicture: user.profilePicture
                }
            });

        } catch (error) {
            console.error('Google login error:', error);
            socket.emit('google_login_error', { error: error.message });
        }
    });

    // Register
    socket.on('register', async (data) => {
        try {
            const { username, email, password } = data;

            const existingUser = await User.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                socket.emit('register_error', {
                    error: 'User with this email or username already exists'
                });
                return;
            }

            const otp = generateOTP();
            const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

            // Store registration data temporarily
            pendingRegistrations.set(email, {
                username,
                email,
                password,
                otp: otp.toString(),
                otpExpiration,
                socketId: socket.id
            });

            const emailSent = await sendOTPEmail(email, otp);
            if (!emailSent) {
                pendingRegistrations.delete(email);
                socket.emit('register_error', { error: 'Failed to send OTP email' });
                return;
            }

            socket.emit('register_success', {
                message: 'OTP sent to your email',
                email: email
            });

        } catch (error) {
            console.error('Registration error:', error);
            socket.emit('register_error', { error: error.message });
        }
    });

    // Login
    socket.on('login', async (data) => {
        try {
            const { email, password } = data;
            console.log('Login request received:', { email, password });
            const user = await User.findOne({ email });
            console.log('User found:', user);
            if (!user) {
                socket.emit('login_error', { error: 'Invalid credentials' });
                return;
            }

            // Check if user is a Google OAuth user
            if (user.googleId && !user.password) {
                socket.emit('login_error', { error: 'This account uses Google login. Please use Google OAuth to sign in.' });
                return;
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                socket.emit('login_error', { error: 'Invalid credentials' });
                return;
            }

            const otp = generateOTP();
            const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                {
                    otp: otp.toString(),
                    otpExpiration,
                    socketId: socket.id,
                    isOnline: true,
                    lastSeen: new Date()
                },
                { new: true }
            );

            const emailSent = await sendOTPEmail(email, otp);
            if (!emailSent) {
                socket.emit('login_error', { error: 'Failed to send OTP email' });
                return;
            }

            socket.emit('login_success', {
                message: 'OTP sent to your email',
                email: updatedUser.email,
                user: {
                    id: updatedUser._id,
                    username: updatedUser.username,
                    email: updatedUser.email
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            socket.emit('login_error', { error: error.message });
        }
    });

    // OTP Verification
    socket.on('verify_otp', async (data) => {
        try {
            const { otp } = data;
            console.log('OTP verification request received:', { otp, socketId: socket.id });

            // Check if this is a registration verification
            // Search through all pending registrations to find one with matching OTP and socketId
            let foundEmail = null;
            console.log('Pending registrations count:', pendingRegistrations.size);
            
            for (const [email, regData] of pendingRegistrations.entries()) {
                console.log('Checking registration:', { 
                    email, 
                    regOtp: regData.otp, 
                    regSocketId: regData.socketId,
                    currentSocketId: socket.id,
                    otpMatch: regData.otp === otp.toString(),
                    socketMatch: regData.socketId === socket.id
                });
                
                if (regData.otp === otp.toString() && regData.socketId === socket.id) {
                    foundEmail = email;
                    break;
                }
            }

            console.log('Registration verification result:', { foundEmail });

            if (foundEmail) {
                const pendingRegistration = pendingRegistrations.get(foundEmail);
                
                if (new Date() > pendingRegistration.otpExpiration) {
                    pendingRegistrations.delete(foundEmail);
                    socket.emit('verify_otp_error', { error: 'OTP has expired' });
                    return;
                }

                // Create the user after successful OTP verification
                const user = new User({
                    username: pendingRegistration.username,
                    email: pendingRegistration.email,
                    password: pendingRegistration.password,
                    socketId: socket.id,
                    isOnline: true,
                    lastSeen: new Date()
                });

                const savedUser = await user.save();
                console.log('New user created:', savedUser._id);
                pendingRegistrations.delete(foundEmail);

                // Broadcast the new user to all connected clients
                broadcastNewUser(io, savedUser);

                const token = jwt.sign(
                    { userId: savedUser._id, username: savedUser.username },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                io.emit('user_joined', {
                    id: socket.id,
                    username: savedUser.username,
                    timestamp: new Date()
                });

                const users = await User.find({}, {
                    password: 0,
                    otp: 0,
                    otpExpiration: 0
                }).sort({ isOnline: -1, lastSeen: -1 });

                socket.emit('users_list', users);

                socket.emit('verify_otp_success', {
                    token,
                    user: {
                        id: savedUser._id,
                        username: savedUser.username,
                        email: savedUser.email
                    }
                });
                return;
            }

            // Handle login verification - find user by socket ID
            console.log('Attempting login verification by socket ID:', socket.id);
            const user = await User.findOne({ socketId: socket.id });
            
            if (!user) {
                console.log('User not found by socket ID. Trying to find any user with matching OTP...');
                // Try to find user by OTP as fallback
                const userByOtp = await User.findOne({ otp: otp.toString() });
                
                if (userByOtp) {
                    console.log('Found user by OTP:', userByOtp._id);
                    // Update the socket ID for this user since they might have reconnected
                    userByOtp.socketId = socket.id;
                    await userByOtp.save();
                    
                    // Continue verification with this user
                    if (new Date() > userByOtp.otpExpiration) {
                        socket.emit('verify_otp_error', { error: 'OTP has expired' });
                        return;
                    }
                    
                    const token = jwt.sign(
                        { userId: userByOtp._id, username: userByOtp.username },
                        process.env.JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    
                    await User.findByIdAndUpdate(userByOtp._id, {
                        otp: null,
                        otpExpiration: null,
                        isOnline: true,
                        lastSeen: new Date()
                    });
                    
                    io.emit('user_joined', {
                        id: socket.id,
                        username: userByOtp.username,
                        timestamp: new Date()
                    });
                    
                    const users = await User.find({}, {
                        password: 0,
                        otp: 0,
                        otpExpiration: 0
                    }).sort({ isOnline: -1, lastSeen: -1 });
                    
                    socket.emit('users_list', users);
                    
                    socket.emit('verify_otp_success', {
                        token,
                        user: {
                            id: userByOtp._id,
                            username: userByOtp.username,
                            email: userByOtp.email
                        }
                    });
                    return;
                }
                
                socket.emit('verify_otp_error', { error: 'User not found' });
                return;
            }

            console.log('User found:', { id: user._id, username: user.username });
            console.log('OTP comparison:', { userOtp: user.otp, providedOtp: otp, match: user.otp === otp.toString() });

            if (user.otp !== otp.toString()) {
                socket.emit('verify_otp_error', { error: 'Invalid OTP' });
                return;
            }

            if (new Date() > user.otpExpiration) {
                socket.emit('verify_otp_error', { error: 'OTP has expired' });
                return;
            }

            const token = jwt.sign(
                { userId: user._id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            await User.findByIdAndUpdate(user._id, {
                otp: null,
                otpExpiration: null,
                isOnline: true,
                lastSeen: new Date()
            });

            io.emit('user_joined', {
                id: socket.id,
                username: user.username,
                timestamp: new Date()
            });

            const users = await User.find({}, {
                password: 0,
                otp: 0,
                otpExpiration: 0
            }).sort({ isOnline: -1, lastSeen: -1 });

            socket.emit('users_list', users);

            socket.emit('verify_otp_success', {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('OTP verification error:', error);
            socket.emit('verify_otp_error', { error: error.message });
        }
    });
};

module.exports = authHandlers;
