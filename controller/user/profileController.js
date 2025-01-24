const { User } = require("../../model/User");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const session = require("express-session");
const Address = require("../../model/Address");
const { single } = require("../../middleware/multer");
require("dotenv").config();

const loadForgetPasswordPage = async (req, res) => {
  try {
    const user = req.session.user || null;
    res.render("user/forgot-password", { user, message: null });
  } catch (error) {
    console.error("Error loading forget password page", error);
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000);
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Forget Password OTP",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP is ${otp}</b>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending verification email", error);
    return false;
  }
};

// -----
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
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
        res.render("user/forgot-pass-otp");
      } else {
        res.json({ success: false, message: "Error sending OTP" });
      }
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Error verifying forget email", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log("userOtp", req.session.userOtp);
    console.log("OTP", otp);

    if (otp == req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/change-password" }); // Send a JSON response with redirect URL
    } else {
      res.json({ success: false, message: "Invalid OTP. Please try again." }); // Error message for invalid OTP
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const email = req.session.email;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resent OTP:", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resent Successfully" });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error Resending OTP:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const loadChangePasswordPage = async (req, res) => {
  try {
    res.render("user/new-pass");
  } catch (error) {
    console.error("Error loading change password page", error);
  }
};

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

const loadDashboard = async (req, res) => {
  try {
    const user = req.session.user || null;
    console.log("User:", user);
    let findUser = await User.findOne({ _id: user._id });
    res.render("user/account/dashboard", { userData: findUser, user });
  } catch (error) {
    console.error("Error loading dashboard", error);
  }
};

const loadProfilePage = async (req, res) => {
  try {
    // const userId = req.session.user ;
    // console.log(user);
    // const user = await User.findOne({ _id: userId });
    
    const user = req.session.user ;

    const userData = await User.findOne({ _id: user._id });
    res.render("user/account/profile", { user, userData });
  } catch (error) {
    console.error("Error loading profile page", error);
  }
};

const loadAddressPage = async (req, res) => {
  try {
    const user = req.session.user || null;
    console.log(user);
    const addressesDoc = await Address.findOne({ userId: user._id });
    const addresses = addressesDoc ? addressesDoc.address : [];
    // Extract the address array or default to an empty array
    const addressId = addresses.map((address) => address._id).toString();
    console.log(addressId);
    res.render("user/account/address", { user, addresses });
  } catch (error) {
    console.error("Error loading address page", error);
  }
};

const loadWalletPage = async (req, res) => {
  try {
    const user = req.session.user || null;
    res.render("user/account/wallet", { user });
  } catch (error) {
    console.error("Error loading wallet page", error);
  }
};

// const updateProfile = async (req, res) => {
//   try {
//     const user = req.session.user || null;
//     const { name, phone } = req.body;

//     const updatedUser = await User.findOneAndUpdate(
//       { email: user.email },
//       { username: name, phone: phone },
//       { new: true } // Return the updated user
//     );

//     if (updatedUser) {
//       res.status(200).json({
//         message: "Profile updated successfully",
//         user: updatedUser,
//       });
//     } else {
//       res.status(400).json({
//         message: "User not found or update failed",
//       });
//     }

//     req.session.user = {
//       ...req.session.user,
//       username: name,
//     };
//   } catch (error) {
//     console.error("Error updating profile:", error);
//     res.status(500).json({
//       message: "An error occurred while updating profile",
//     });
//   }
// };

const updateProfile = async (req, res) => {
  try {
    const user = req.session.user || null;
    const { name, phone } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { email: user.email },
      { username: name, phone: phone },
      { new: true } // Return the updated user
    );

    if (updatedUser) {
      // Update session with new username
      req.session.user.username = updatedUser.username;

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } else {
      res.status(400).json({
        message: "User not found or update failed",
      });
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      message: "An error occurred while updating profile",
    });
  }
};


const updatePassword = async (req, res) => {
  try {
    const user = req.session.user || null;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
        newPassword
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character",
      });
    }

    const userData = await User.findOne({ email: user.email });
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, userData.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { email: user.email },
      { password: passwordHash },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating password",
    });
  }
};

const addAddress = async (req, res) => {
  try {
    console.log(req.body);
    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;

    const userId = req.session.user._id || req.body.userId;
    console.log(userId);

    // Validate required fields
    if (
      !userId ||
      !addressType ||
      !name ||
      !city ||
      !landMark ||
      !state ||
      !pincode ||
      !phone ||
      !altPhone
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare the new address object
    const newAddress = {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    };

    // Check if the user already has an address document
    let addressDoc = await Address.findOne({ userId });

    if (addressDoc) {
      // Add the new address to the existing document
      addressDoc.address.push(newAddress);
    } else {
      // Create a new address document
      addressDoc = new Address({
        userId,
        address: [newAddress],
      });
    }

    // Save the address document
    await addressDoc.save();

    res
      .status(201)
      .json({ message: "Address added successfully", address: addressDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAddressById = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user._id;

    const addressDoc = await Address.findOne(
      {
        userId,
        "address._id": addressId,
      },
      { "address.$": 1 }
    );

    console.log('Edit Address details' ,addressDoc )

    if (!addressDoc) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json({ address: addressDoc.address[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const editAddress = async (req, res) => {
  try {
    const {
      addressId, // You'll need to add this to identify which address to update
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;

    const userId = req.session.user._id || req.body.userId;

    // Validate required fields
    if (
      !userId ||
      !addressId ||
      !addressType ||
      !name ||
      !city ||
      !landMark ||
      !state ||
      !pincode ||
      !phone ||
      !altPhone
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Find and update the specific address in the array
    const result = await Address.findOneAndUpdate(
      {
        userId,
        "address._id": addressId,
      },
      {
        $set: {
          "address.$": {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
          },
        },
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.status(200).json({
      message: "Address updated successfully",
      address: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user._id;

    // Find the address document and pull the specific address from the array
    const result = await Address.findOneAndUpdate(
      { userId },
      { $pull: { address: { _id: addressId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.status(200).json({ 
      message: "Address deleted successfully", 
      address: result 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  loadForgetPasswordPage,
  verifyForgetEmail,
  verifyOtp,
  resendOtp,
  loadChangePasswordPage,
  resetPassword,
  loadProfilePage,
  loadDashboard,
  loadAddressPage,
  loadWalletPage,
  updateProfile,
  updatePassword,
  addAddress,
  getAddressById,
  editAddress,
  deleteAddress
};
