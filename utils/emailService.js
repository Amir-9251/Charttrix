const nodemailer = require('nodemailer');

// Create reusable transporter object
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    // Add timeout and other options for better reliability
    pool: true, // Use pooled connections
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // How many messages to send per second
    rateLimit: 5 // Max number of messages per rateDelta
});

// Verify transporter configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('Email service configuration error:', error);
    } else {
        console.log('Email service is ready to send messages');
    }
});

const sendOTPEmail = async (email, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('Email configuration missing: EMAIL_USER or EMAIL_PASSWORD not set');
        return false;
    }

    const appName = process.env.APP_NAME || 'Our Application'; // Get app name from env or use default

    const mailOptions = {
        from: `"${appName}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP for Authentication',
        html: `
            <h1>${appName} - OTP Verification</h1>
            <p>Your OTP for authentication is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Email sending error:', {
            error: error.message,
            code: error.code,
            command: error.command,
            recipient: email
        });
        return false;
    }
};

module.exports = { sendOTPEmail }; 