

const {User} = require('../../model/User')
const nodemailer = require ('nodemailer')
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const loadForgetPasswordPage = async (req, res) => {
    try {
        const user = req.session.user || null;
        res.render('user/forgot-password', { user, message : null })
    } catch (error) {
        console.error('Error loading forget password page', error)
    }
}

function generateOtp() { 
    return Math.floor(100000 + Math.random() * 900000)
}

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true, 
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Forget Password OTP',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP is ${otp}</b>`,
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending verification email', error);
        return false;
    }
};

// -----
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash


    } catch (error) {

    }
};


const verifyForgetEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email });

        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp; // Consider encrypting this value
                req.session.email = email;
                console.log("OTP sent successfully", otp);
                res.render('user/forgot-pass-otp');
            } else {
                res.json({ success: false, message: "Error sending OTP" });
            }
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (error) {
        console.error('Error verifying forget email', error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        console.log("userOtp",req.session.userOtp);
        console.log("OTP",otp);

        if (otp == req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/change-password" }); // Send a JSON response with redirect URL
        } else {
            res.json({ success: false, message: "Invalid OTP. Please try again." }); // Error message for invalid OTP
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ success: false, message: "Internal server error. Please try again later." });
    }
};



const resendOtp = async (req, res) => {
    try {
        const email = req.session.email;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resent OTP:", otp);
            res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error Resending OTP:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const loadChangePasswordPage = async (req, res) => {
    try {
        res.render('user/new-pass')
    } catch (error) {
        console.error('Error loading change password page', error);
    }
}

const resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmNewPassword } = req.body;
        const email = req.session?.email;

        // Check if email exists in session
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please log in again.",
            });
        }

        // Validate passwords
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long.",
            });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match.",
            });
        }

        // Hash the new password
        const passwordHash = await securePassword(newPassword);

        // Update the user's password
        const user = await User.findOneAndUpdate(
            { email },
            { password: passwordHash }
        );

        if (user) {
            return res.status(200).json({
                success: true,
                redirectUrl: "/login",
            });
        }

        // Handle unexpected cases
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again.",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
        });
    }
};



module.exports = {
    loadForgetPasswordPage,
    verifyForgetEmail,
    verifyOtp,
    resendOtp,
    loadChangePasswordPage,
    resetPassword
}