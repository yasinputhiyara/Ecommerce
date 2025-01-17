const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { User } = require("../../model/User");
require("dotenv").config();

const { Brand, Category, Product } = require("../../model/Product");

const loadLogin = async (req, res) => {
  const errorMessage = req.session.errorMessage || null; // Retrieve and clear error
  req.session.errorMessage = null;
  res.render("user/login", { message: errorMessage, user: null });
};

const loadRegister = async (req, res) => {
  const error = req.session.errorMessage || null;
  req.session.errorMessage = null;
  res.render("user/register", { error, user: null });
};

// OTP Generation
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//Send OTP

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
        // user:"yasinputhiyara@gmail.com",
        // pass:"tteb fuqd yeug qtpu"
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      // from:"yasinputhiyara@gmail.com",
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b> Your OTP ${otp} </b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

// -----
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const verifyLogin = async (req, res) => {
  try {
    req.session.userData = req.body;
    req.session.loggedIn = true;
    const { email, password } = req.body;

    const user = await User.findOne({ email, isAdmin: false }); // Ensure it's not an admin

    if (!user) {
      req.session.errorMessage = "User not found";
      return res.redirect("/login");
    }

    if (user.isBlocked) {
      req.session.errorMessage = "You are Blocked By Admin";
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      req.session.errorMessage = "Incorrect Password";
      return res.redirect("/login");
    }

    // Store user session
    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };
    res.redirect("/");
  } catch (error) {
    console.error("Login Error", error);
    res.status(500).send("Internal Server Error");
  }
};

const verifyRegister = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Store error message in session
      req.session.errorMessage = "User already exists";
      return res.redirect("/register");
    }

    // Generate OTP and send verification email
    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      req.session.errorMessage =
        "Error sending verification email. Please try again.";
      return res.redirect("/register");
    }

    // Store OTP and user data in the session
    req.session.userOtp = otp;
    req.session.userData = { username, email, password };

    console.log(req.session.userData);
    console.log("OTP Sent:", otp);

    // Redirect to the OTP verification page
    return res.redirect("/otp-verify");
  } catch (error) {
    console.error("Signup Error", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadOtpPage = async (req, res) => {
  res.render("user/otp-verify");
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log("Provided OTP:", otp);
    console.log("Session Data:", req.session);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      console.log("Verify - otp user:", user);

      const passwordHash = await securePassword(user.password);
      console.log("Password Hash:", passwordHash);

      const saveUserData = new User({
        username: user.username,
        email: user.email,
        password: passwordHash,
      });

      try {
        await saveUserData.save();
        console.log("User Saved Successfully:", saveUserData);
      } catch (error) {
        console.error("Error Saving User:", error);
        return res
          .status(500)
          .json({ success: false, message: "Error saving user" });
      }

      req.session.user = {
        _id: saveUserData._id,
        username: saveUserData.username,
      };
      console.log("Session User:", req.session.user);

      return res.json({ success: true, redirectUrl: "/" });
    } else {
      console.error("Invalid OTP");
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP, please try again" });
    }
  } catch (error) {
    console.error("Error Verifying OTP:", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, massage: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP ", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to resend OTP , please try again",
        });
    }
  } catch (error) {
    console.error("Error Resending OTP ", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const loadHome = async (req, res) => {
  try {
    if (User.isBlocked) {
      console.log("User is Blocked by Admin");
      req.session.destroy();
      return res.redirect("/login");
    }
    const user = req.session.user;
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({ isBlocked: false })
      .sort({ createdAt: -1 })
      .limit(4);

    res.render("user/home", { products: productData, user });
  } catch (error) {
    console.error("Error in loading Home Page", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadShop = async (req, res) => {
  try {
    const user = req.session.user;

    // Pagination Logic
    const itemsPerPage = 9; // Number of products per page
    const page = parseInt(req.query.page) || 1; // Current page, default is 1

    // Fetch total count of products (excluding blocked ones)
    const totalProducts = await Product.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    // Fetch products for the current page
    const products = await Product.find({ isBlocked: false })
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    // Fetch categories and brands
    const categories = await Category.find({});
    const brands = await Brand.find({ isBlocked: false });

    // console.log(totalProducts, totalPages , categories , brands);

    // Render the shop view
    res.render("user/shop", {
      products,
      categories,
      brands,
      totalProducts,
      totalPages,
      currentPage: page,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  loadLogin,
  loadRegister,
  verifyRegister,
  loadOtpPage,
  verifyOtp,
  resendOtp,
  verifyLogin,
  loadHome,
  loadShop,
};
