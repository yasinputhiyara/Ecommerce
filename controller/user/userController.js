const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { User } = require("../../model/User");
const Wishlist = require("../../model/Wishlist");
require("dotenv").config();

const { Brand, Category, Product } = require("../../model/Product");

const loadLogin = async (req, res) => {
  const errorMessage = req.session.errorMessage || null; 
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
  res.render("user/otp-verify",{user:null});
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
        .json({ success: false, message: "Email not found in session" });
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
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP, please try again",
        redirect: "/register", // Adding redirect flag
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
    const brand = await Brand.find({ isBlocked: false }).limit(5);
    console.log(brand);
    const user = req.session.user;
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({ isBlocked: false })
      .sort({ createdAt: -1 })
      .limit(8);

    res.render("user/home", { products: productData, user, brand });
  } catch (error) {
    console.error("Error in loading Home Page", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadShop = async (req, res) => {
  try {
    const user = req.session.user;
    const itemsPerPage = 9;
    const page = parseInt(req.query.page) || 1;

    // Build filter query
    const filterQuery = { isBlocked: false };

    // Resolve category filter
    if (req.query.category) {
      const category = await Category.findOne({ name: req.query.category });
      if (category) {
        filterQuery.category = category._id;
      } else {
        filterQuery.category = null;
      }
    }

    // Brand filter
    if (req.query.brand) {
      filterQuery.brand = req.query.brand;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filterQuery.salePrice = {};
      if (req.query.minPrice)
        filterQuery.salePrice.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice)
        filterQuery.salePrice.$lte = parseInt(req.query.maxPrice);
    }

    // Build sort query
    let sortQuery = {};
    switch (req.query.sort) {
      case "price-low-high":
        sortQuery = { salePrice: 1 };
        break;
      case "price-high-low":
        sortQuery = { salePrice: -1 };
        break;
      case "newest":
        sortQuery = { createdAt: -1 };
        break;
      case "a-z":
        sortQuery = { productName: 1 };
        break;
      case "z-a":
        sortQuery = { productName: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    // Count total filtered products
    const totalProducts = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    // Fetch filtered and sorted products
    const products = await Product.find(filterQuery)
      .sort(sortQuery)
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    // Fetch user's wishlist
    let wishlistProductIds = [];
    if (user) {
      const wishlist = await Wishlist.findOne({ userId: user._id }).select(
        "products"
      );
      wishlistProductIds = wishlist
     ? wishlist.products.map((p) => p.productId.toString()) // Ensure correct field
     : [];
    }

    // Add `isInWishlist` property to each product
    const updatedProducts = products.map((product) => ({
      ...product.toObject(),
      isInWishlist: wishlistProductIds.includes(product._id.toString()),
    }));

    res.render("user/shop", {
      products: updatedProducts, // Use updated product list
      categories,
      brands,
      totalProducts,
      totalPages,
      currentPage: page,
      user,
      filters: {
        category: req.query.category || "",
        brand: req.query.brand || "",
        minPrice: req.query.minPrice || "",
        maxPrice: req.query.maxPrice || "",
        sort: req.query.sort || "",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id; // Ensure user is logged in
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in." });
    }

    const { productId } = req.body;

    // Check if the product exists and is not blocked
    const productExists = await Product.findOne({ _id: productId, isBlocked: false });
    if (!productExists) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    // Find or create the user's wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    // Check if the product is already in the wishlist
    const productAlreadyInWishlist = wishlist.products.some(
      (item) => item.productId.toString() === productId
    );

    if (productAlreadyInWishlist) {
      return res.status(400).json({ success: false, message: "Product already in wishlist." });
    }

    // Add product to the wishlist
    wishlist.products.push({ productId });
    await wishlist.save();

    res.status(200).json({ success: true, message: "Product added to wishlist." });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};


const removeToWishlist = async (req,res)=>{
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in." });
    }

    const { productId } = req.body;

    // Find the user's wishlist
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found." });
    }

    // Check if the product is in the wishlist
    const productIndex = wishlist.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not in wishlist." });
    }

    // Remove the product from the wishlist
    wishlist.products.splice(productIndex, 1);
    await wishlist.save();

    res.status(200).json({ success: true, message: "Product removed from wishlist." });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}




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
  addToWishlist,
  removeToWishlist
};
