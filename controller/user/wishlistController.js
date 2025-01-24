const { User } = require("../../model/User");
const { Product } = require("../../model/Product");
const Wishlist = require("../../model/Wishlist");

const loadWishlist = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    // Fetch the user's wishlist
    const wishlist = await Wishlist.findOne({ userId: user._id }).populate({
      path: "products.productId", // Assuming your wishlist schema has products array with `productId` references
      select: "productName salePrice productImages", // Fetch only relevant fields
    });

    // Handle empty wishlist scenario
    const products = wishlist ? wishlist.products : [];

    res.render("user/wishlist", {
      user, // Pass user info
      products, // Pass the wishlist products
    });
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.redirect("/error");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id; // Ensure user is logged in
    if (!userId) {
      return res.redirect("/login");
    }

    const { productId } = req.body;

    // Check if the product exists and is not blocked
    const productExists = await Product.findOne({
      _id: productId,
      isBlocked: false,
    });
    if (!productExists) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
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
      return res
        .status(400)
        .json({ success: false, message: "Product already in wishlist." });
    }

    // Add product to the wishlist
    wishlist.products.push({ productId });
    await wishlist.save();

    res
      .status(200)
      .json({ success: true, message: "Product added to wishlist." });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.redirect("/login");
    }

    const { productId } = req.body;

    // Find the user's wishlist
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found." });
    }

    // Check if the product is in the wishlist
    const productIndex = wishlist.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not in wishlist." });
    }

    // Remove the product from the wishlist
    wishlist.products.splice(productIndex, 1);
    await wishlist.save();

    res
      .status(200)
      .json({ success: true, message: "Product removed from wishlist." });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const isProductInWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in." });
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.json({ inWishlist: false });
    }

    const inWishlist = wishlist.products.some(
      (item) => item.productId.toString() === productId
    );

    res.json({ inWishlist });
  } catch (error) {
    console.error("Error checking wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const removeProductFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in." });
    }

    const { productId } = req.body;

    // Find and update the user's wishlist
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found." });
    }

    const productIndex = wishlist.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not in wishlist." });
    }

    wishlist.products.splice(productIndex, 1);
    await wishlist.save();

    res
      .status(200)
      .json({ success: true, message: "Product removed from wishlist." });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
  isProductInWishlist,
  removeProductFromWishlist
};
