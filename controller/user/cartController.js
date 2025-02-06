const { Product } = require("../../model/Product");
const Cart = require("../../model/Cart");
const Address = require("../../model/Address");
const Order = require("../../model/Order");
const Coupon = require("../../model/Coupon");
const { User } = require("../../model/User");
const Wallet = require ('../../model/Wallet')
const crypto = require("crypto");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
require("dotenv").config();

const addToCart = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      // res.redirect('/login')
      // return res.status(401).send("User not logged in");
      return res.render("unautherisedUser", {
        message: "You need to log in to access this page .",
        redirectUrl: "/login",
      });
    }

    const productId = req.params.id;
    const { size, quantity, price } = req.body;
    console.log("Submitted Data  ", req.body);

    // Check if the cart exists for the user
    let cart = await Cart.findOne({ userId: user._id });

    if (cart) {
      console.log("Cart already exists");

      // Check if the product and size already exist in the cart
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId && item.size === size
      );

      if (itemIndex > -1) {
        // Update the quantity if the product and size already exist
        cart.items[itemIndex].quantity += parseInt(quantity);
      } else {
        // Add a new item to the cart
        cart.items.push({
          productId,
          size,
          quantity: parseInt(quantity),
          price: parseFloat(price),
        });
      }

      await cart.save();
    } else {
      console.log("Creating a new cart");

      // Create a new cart for the user
      cart = new Cart({
        userId: user._id,
        items: [
          {
            productId,
            size,
            quantity: parseInt(quantity),
            price: parseFloat(price),
          },
        ],
      });

      await cart.save();
    }

    res.redirect("/cart");
  } catch (error) {
    console.error("Add to cart error", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadCart = async (req, res) => {
  try {
    const user = req.session.user;
    const FREE_SHIPPING_THRESHOLD = 1000;
    const SHIPPING_COST = 100;

    if (!user) {
      // return res.redirect("/login");
      // return res.status(401).json({ message: "You need to log in to access your cart." });
      return res.render("unautherisedUser", {
        message: "You need to log in to access your cart.",
        redirectUrl: "/login", // Redirect to login after SweetAlert
      });
    }

    const cartData = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );

    if (cartData) {
      // Filter out items with null productId
      cartData.items = cartData.items.filter((item) => item.productId !== null);

      // Calculate subtotal
      const subtotal = cartData.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );

      // Determine shipping cost
      const shippingCost =
        subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

      // Optional: Add shipping information to cartData for template rendering
      cartData.shippingCost = shippingCost;
      cartData.subtotal = subtotal + shippingCost;
      cartData.total = subtotal + shippingCost;
    }

    res.render("user/cart", {
      user,
      cartData,
    });
  } catch (error) {
    console.error("Error in loadCart", error);
    res.status(500).send("Internal Server Error");
  }
};

const validateCartStock = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not logged in",
      });
    }

    const cart = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const outOfStockItems = [];

    for (const item of cart.items) {
      if (!item.productId) continue;

      const variant = item.productId.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity < item.quantity) {
        outOfStockItems.push(
          `${item.productId.productName} (Size: ${item.size}) - Only ${
            variant ? variant.quantity : 0
          } available`
        );
      }
    }

    if (outOfStockItems.length > 0) {
      return res.json({
        success: false,
        outOfStockItems,
      });
    }

    return res.json({
      success: true,
      message: "All items are in stock",
    });
  } catch (error) {
    console.error("Validate cart stock error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const updateCart = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body; // Include `size` in the request body
    const user = req.session.user;

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId: user._id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Fetch the product to validate stock
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Find the matching variant by size
    const variant = product.variants.find((v) => v.size == size);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: `Variant with size ${size} not found.`,
      });
    }

    // Ensure the requested quantity doesn't exceed variant stock
    if (quantity > variant.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.quantity} items available in stock for size ${size}.`,
      });
    }

    // Update cart item quantity
    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId && item.size === size // Match by productId and size
    );

    if (cartItem) {
      cartItem.quantity = quantity;
      await cart.save();

      // Calculate totals
      const updatedItemTotal = cartItem.quantity * cartItem.price;
      const updatedSubtotal = cart.items.reduce(
        (acc, item) => acc + item.quantity * item.price,
        0
      );

      return res.json({
        success: true,
        updatedItemTotal,
        updatedSubtotal,
        message: "Cart updated successfully.",
      });
    }

    return res
      .status(404)
      .json({ success: false, message: "Item not found in cart." });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const itemId = req.params.itemId; // Assuming item's unique _id is passed in the route
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not logged in",
      });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId: user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    console.log("Cart items: ", cart.items);

    // Find the index of the item in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    // Save the updated cart
    await cart.save();

    console.log("Updated cart after removal: ", cart.items);

    return res.json({
      success: true,
      message: "Item removed from cart successfully",
    });
  } catch (error) {
    console.error("Remove from cart error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findOne({ _id: userId });

    const cart = await Cart.findOne({ userId: userId }).populate(
      "items.productId"
    );

    const wallet = await Wallet.findOne({userId:userId})

    if (!user) {
      return res.render("unautherisedUser", {
        message: "You need to log in to access this page.",
        redirectUrl: "/login",
      });
    }

    if (!cart || cart.items.length === 0) {
      return res.render("unautherisedUser", {
        message: "Your cart is empty.",
        redirectUrl: "/shop",
      });
    }

    const addressesDoc = await Address.findOne({ userId: user._id });
    const addresses = addressesDoc ? addressesDoc.address : [];

    // Get valid coupons
    const currentDate = new Date();
    
    // Find coupons already used by the user
    const usedCoupons = await Order.distinct('appliedCoupon', { 
      userId: userId,
      appliedCoupon: { $exists: true }
    });

    // Get available coupons, excluding used ones and filtering by current criteria
    let coupons = await Coupon.find({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      isList: true,
      name: { $nin: usedCoupons } // Exclude used coupons
    }).sort({ createdAt: -1 });

    // Validate products and calculate subtotal
    const outOfStockItems = [];
    let subtotal = 0;
    if (cart && cart.items.length > 0) {
      for (const item of cart.items) {
        const product = item.productId;
        if (!product) continue;

        const variant = product.variants.find((v) => v.size === item.size);
        if (!variant || variant.quantity < item.quantity) {
          outOfStockItems.push(`${product.productName} (${item.size})`);
        }

        // Calculate subtotal
        subtotal += product.salePrice * item.quantity;
      }
    }

    if (outOfStockItems.length > 0) {
      return res.render("user/cart", {
        error: `The following items are out of stock or have insufficient quantity: ${outOfStockItems.join(
          ", "
        )}`,
      });
    }

    // Filter coupons based on minimum price
    coupons = coupons.filter((coupon) => subtotal >= coupon.minPrice);

    res.render("user/checkout", {
      user,
      addresses,
      cart,
      subtotal,
      availableCoupons: coupons,
      wallet
    });
  } catch (error) {
    console.error("Checkout Page Error:", error);
    res.status(500).render("error", { message: "Error loading checkout page" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user;

    // Find the cart and calculate subtotal
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    let subtotal = 0;
    if (cart && cart.items.length > 0) {
      subtotal = cart.items.reduce(
        (total, item) => total + item.productId.salePrice * item.quantity,
        0
      );
    }

    // Find the coupon
    const currentDate = new Date();
    const coupon = await Coupon.findOne({
      name: couponCode,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      minPrice: { $lte: subtotal },
      isList: true,
    });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired coupon",
      });
    }

    // Check if the user has already used the coupon
    const userCouponUsage = coupon.usedBy.find((usage) =>
      usage.userId.equals(userId)
    );

    if (userCouponUsage && userCouponUsage.count >= 1) {
      return res.status(400).json({
        success: false,
        message: "You have already used this coupon.",
      });
    }

    // Calculate discounted total
    const discount = coupon.offerPrice;
    const finalTotal = Math.max(subtotal - discount, 0);

    res.json({
      success: true,
      discount,
      finalTotal,
      couponName: coupon.name,
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    res.status(500).json({
      success: false,
      message: "Error applying coupon",
    });
  }
};


const generateOrderId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD${timestamp}${random}`;
};


const checkout = async (req, res) => {
  try {
    const { selectedAddress, paymentMethod, couponCode } = req.body;
    const userId = req.session.user._id;

    // Fetch the selected address
    const userAddress = await Address.findOne({ userId });
    const address = userAddress.address.find(
      (addr) => addr._id.toString() === selectedAddress
    );

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Selected address not found.",
      });
    }

    // Fetch cart details
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Cart is empty." 
      });
    }

    // Check product variant availability
    const outOfStockItems = [];
    const productsToUpdate = new Map();

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants.find((v) => v.size === item.size);

      if (!variant || variant.quantity < item.quantity) {
        outOfStockItems.push(`${product.productName} (${item.size})`);
        continue;
      }

      variant.quantity -= item.quantity;
      productsToUpdate.set(product._id.toString(), product);
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following items are out of stock: ${outOfStockItems.join(", ")}`,
      });
    }

    await Promise.all(
      Array.from(productsToUpdate.values()).map((product) => product.save())
    );

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.productId.salePrice * item.quantity,
      0
    );

    // Add shipping charge if subtotal is below 1000
    const shippingCharge = subtotal < 1000 ? 100 : 0;
    let totalPrice = subtotal + shippingCharge;

    // Initialize coupon-related variables
    let appliedCoupon = null;
    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        name: couponCode,
        isList: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (coupon) {
        if (subtotal >= coupon.minPrice) {
          // Check if the user has already used the coupon
          const userCouponUsage = coupon.usedBy.find((usage) =>
            usage.userId.equals(userId)
          );

          if (userCouponUsage && userCouponUsage.count >= 1) {
            return res.status(400).json({
              success: false,
              message: "You have already used this coupon.",
            });
          }

          discount = coupon.offerPrice;
          totalPrice = Math.max(totalPrice - discount, 0); // Ensure totalPrice is non-negative
          appliedCoupon = coupon._id;

          // Update the coupon's usedBy array
          if (userCouponUsage) {
            userCouponUsage.count += 1;
          } else {
            coupon.usedBy.push({ userId, count: 1 });
          }

          await coupon.save();
        } else {
          console.log("Coupon not applicable: Minimum price not met.");
        }
      } else {
        console.log("Invalid or expired coupon.");
      }
    }

    // Explicitly set `couponApplied` status
    const couponApplied = Boolean(appliedCoupon);

    // Create the order
    const newOrder = new Order({
      userId,
      orderId: generateOrderId(),
      orderedItems: cart.items.map((item) => ({
        product: item.productId._id,
        quantity: item.quantity,
        size: item.size,
        price: item.productId.salePrice,
        orderStatus: "Pending",
        paymentStatus: "Pending",
      })),
      subtotal,
      shippingCharge,
      totalPrice,
      discount,
      appliedCoupon,
      address,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid",
      orderStatus: "Pending",
      couponApplied,
    });

    await newOrder.save();

    // Clear the cart
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Order placed successfully.",
      orderId: newOrder._id,
      subtotal,
      shippingCharge,
      totalPrice,
      discount,
      appliedCoupon: appliedCoupon ? couponCode : null,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to place order. Please try again.",
    });
  }
};


// Razorpay instance (replace with your Razorpay credentials)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const razorpayOrder = async (req, res) => {
  try {
    const { selectedAddress, couponCode } = req.body;
    const userId = req.session.user._id;

    // Validate selected address
    if (!selectedAddress) {
      return res
        .status(400)
        .json({ success: false, message: "No address selected." });
    }

    // Fetch the selected address
    const addressDoc = await Address.findOne({
      userId,
      "address._id": selectedAddress,
    });

    if (!addressDoc) {
      return res
        .status(400)
        .json({ success: false, message: "Selected address not found." });
    }

    const orderAddress = addressDoc.address.find(
      (addr) => addr._id.toString() === selectedAddress
    );

    if (!orderAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Address details not found." });
    }

    // Fetch cart details
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty." });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.productId.salePrice * item.quantity,
      0
    );

    // Add shipping charge if subtotal is below 1000
    const shippingCharge = subtotal < 1000 ? 100 : 0;
    let totalPrice = subtotal + shippingCharge;

    let appliedCoupon = null;
    let discount = 0;
    let couponApplied = false;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        name: couponCode,
        isList: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (coupon) {
        if (subtotal >= coupon.minPrice) {
          // Check if the user has already used the coupon
          const userCouponUsage = coupon.usedBy.find((usage) =>
            usage.userId.equals(userId)
          );

          if (userCouponUsage && userCouponUsage.count >= 1) {
            return res.status(400).json({
              success: false,
              message: "You have already used this coupon.",
            });
          }

          discount = coupon.offerPrice;
          totalPrice = Math.max(subtotal - discount, 0); // Ensure non-negative total
          appliedCoupon = couponCode;
          couponApplied = true;

          // Update the coupon's usedBy array
          if (userCouponUsage) {
            userCouponUsage.count += 1;
          } else {
            coupon.usedBy.push({ userId, count: 1 });
          }

          await coupon.save();
        }
      }
    }

    // Ensure `totalPrice` is valid
    const amountInPaise = Math.round(totalPrice * 100);
    if (!amountInPaise || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: "Order amount must be at least ₹1.",
      });
    }

    // Check product variant availability and reduce stock
    const outOfStockItems = [];
    const productsToSave = new Map();

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants.find((v) => v.size === item.size);

      if (!variant || variant.quantity < item.quantity) {
        outOfStockItems.push(`${product.productName} (${item.size})`);
        continue;
      }

      // Reduce variant quantity
      variant.quantity -= item.quantity;

      // Add product to save queue
      if (!productsToSave.has(product._id.toString())) {
        productsToSave.set(product._id.toString(), product);
      }
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following items are out of stock: ${outOfStockItems.join(
          ", "
        )}`,
      });
    }

    // Save all modified products only once
    await Promise.all(
      [...productsToSave.values()].map((product) => product.save())
    );

    // Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise, // Amount in paise
        currency: "INR",
        receipt: `order_rcpt_${Date.now()}`,
      });
    } catch (error) {
      console.error("Error in Razorpay API call:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create Razorpay order. Please try again.",
        error: error.message || error,
      });
    }

    // Save order to the database
    const newOrder = new Order({
      userId,
      orderId: razorpayOrder.id,
      orderedItems: cart.items.map((item) => ({
        product: item.productId._id,
        quantity: item.quantity,
        size: item.size,
        price: item.productId.salePrice,
        orderStatus: "Pending",
        paymentStatus: "Pending",
      })),
      subtotal,
      shippingCharge,
      totalPrice,
      discount,
      appliedCoupon,
      couponApplied,
      address: orderAddress,
      paymentMethod: "razorpay",
      paymentStatus: "Pending",
      orderStatus: "Pending",
    });

    await newOrder.save();

    // Clear the cart
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      id: razorpayOrder.id,
      orderId: newOrder.orderId,
      subtotal,
      shippingCharge,
      totalPrice,
      discount,
      appliedCoupon,
      couponApplied,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order. Please try again.",
    });
  }
};

const razorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;
    console.log("Razorpay Payment Data:", req.body);

    // Verify payment signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    const generatedSignature = hmac
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
        details: {
          generated: generatedSignature,
          received: razorpay_signature,
        },
      });
    }

    // Update order status to 'Paid'
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        paymentStatus: "Paid",
        orderStatus: "Pending",
        "orderedItems.$[].paymentStatus": "Paid",
        "orderedItems.$[].orderStatus": "Pending",
      },
      { new: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Payment verified successfully." });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res
      .status(500)
      .json({ success: false, message: "Payment verification failed." });
  }
};

const paymentFailed = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Update order status to "Pending"
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        paymentStatus: "Pending",
        orderStatus: "Pending",
        "orderedItems.$[].paymentStatus": "Pending",
        "orderedItems.$[].orderStatus": "Pending",
      },
      { new: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Order status updated to pending." });

    res.redirect("/orders");
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update order status." });
  }
};


const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "Order already paid" });
    }

    // If order doesn't have a Razorpay order ID, create one
    let razorpayOrderId = order.orderId;
    if (!razorpayOrderId) {
      const razorpayOrder = await razorpay.orders.create({
        amount: order.totalPrice * 100, // Amount in paise
        currency: "INR",
        receipt: `order_rcpt_${orderId}`,
      });

      razorpayOrderId = razorpayOrder.id;
      order.orderId = razorpayOrder.id;
      await order.save(); // Save the Razorpay Order ID in the database
    }

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      amount: order.totalPrice * 100, // Convert to paise
      currency: "INR",
      orderId: order._id, // Your internal order ID
      razorpayOrderId, // Existing or newly created Razorpay Order ID
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order details" });
  }
};




const razorpayPaymentinOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;
    
    console.log("Received Order ID:", orderId); // Debugging

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is missing." });
    }

    // Convert orderId to ObjectId if needed
    const objectId = mongoose.Types.ObjectId.isValid(orderId)
      ? new mongoose.Types.ObjectId(orderId)
      : orderId;

    console.log("Converted Object ID:", objectId); // Debugging

    // Verify Razorpay Signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    const generatedSignature = hmac
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // Find and update the order
    const order = await Order.findOneAndUpdate(
      { _id: objectId },
      {
        paymentStatus: "Paid",
        orderStatus: "Processing",
        "orderedItems.$[].paymentStatus": "Paid",
        "orderedItems.$[].orderStatus": "Processing",
      },
      { new: true }
    );

    if (!order) {
      console.log("Order not found in DB:", objectId);
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    res.status(200).json({ success: true, message: "Payment verified successfully." });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: "Payment verification failed." });
  }
};

const walletPayment = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { selectedAddress, couponCode } = req.body;

    const userAddress = await Address.findOne({ userId });
    const address = userAddress.address.find(
      (addr) => addr._id.toString() === selectedAddress
    );

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Selected address not found.",
      });
    }
    // console.log(selectedAddress)

    // Retrieve user's wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet not found' 
      });
    }

    // Fetch cart details with populated product information
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cart is empty' 
      });
    }

    // Check product variant availability and stock
    const outOfStockItems = [];
    const productsToUpdate = [];

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants.find((v) => v.size === item.size);

      if (!variant || variant.quantity < item.quantity) {
        outOfStockItems.push(`${product.productName} (${item.size})`);
        continue;
      }

      // Reduce product variant quantity
      variant.quantity -= item.quantity;
      productsToUpdate.push(product);
    }

    // Handle out of stock items
    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following items are out of stock: ${outOfStockItems.join(", ")}`
      });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.productId.salePrice * item.quantity,
      0
    );

    // Add shipping charge if subtotal is below 1000
    const shippingCharge = subtotal < 1000 ? 100 : 0;
    let totalPrice = subtotal + shippingCharge;

    // Initialize coupon-related variables
    let appliedCoupon = null;
    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        name: couponCode,
        isList: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });

      if (coupon && subtotal >= coupon.minPrice) {
        // Check coupon usage
        const userCouponUsage = coupon.usedBy.find((usage) =>
          usage.userId.equals(userId)
        );

        if (!userCouponUsage || userCouponUsage.count < 1) {
          discount = coupon.offerPrice;
          totalPrice = Math.max(totalPrice - discount, 0);
          appliedCoupon = coupon._id;

          // Update coupon usage
          if (userCouponUsage) {
            userCouponUsage.count += 1;
          } else {
            coupon.usedBy.push({ userId, count: 1 });
          }
          await coupon.save();
        }
      }
    }

    // Check wallet balance
    if (wallet.balance < totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Create order
    const newOrder = new Order({
      userId,
      orderId: generateOrderId(),
      orderedItems: cart.items.map((item) => ({
        product: item.productId._id,
        quantity: item.quantity,
        size: item.size,
        price: item.productId.salePrice,
        orderStatus: "Pending",
        paymentStatus: "Paid"
      })),
      subtotal,
      shippingCharge,
      totalPrice,
      discount,
      appliedCoupon,
      address,
      paymentMethod: 'wallet',
      paymentStatus: 'Paid',
      orderStatus: 'Pending',
      couponApplied: Boolean(appliedCoupon)
    });

    // Save updated products
    await Promise.all(productsToUpdate.map((product) => product.save()));

    // Perform wallet transaction
    await wallet.addTransaction({
      transactionType: 'DEBIT',
      transactionAmount: totalPrice,
      reference: newOrder.orderId,
      description: `Order payment for order ${newOrder.orderId}`
    });

    // Save the order
    await newOrder.save();

    // Clear the cart
    await Cart.findOneAndDelete({ userId });

    res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId: newOrder._id,
      subtotal,
      shippingCharge,
      totalPrice,
      discount,
      appliedCoupon: appliedCoupon ? couponCode : null
    });

  } catch (error) {
    console.error('Wallet payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: error.message
    });
  }
};

const removeCoupon = async (req, res) => {
  try {
      const userId = req.session.user;
      
      // Find the cart and calculate original total
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      let subtotal = 0;
      if (cart && cart.items.length > 0) {
          subtotal = cart.items.reduce(
              (total, item) => total + item.productId.salePrice * item.quantity,
              0
          );
      }

      // Add delivery charge if applicable
      const deliveryCharge = subtotal < 1000 ? 100 : 0;
      const total = subtotal + deliveryCharge;

      res.json({
          success: true,
          total,
          message: "Coupon removed successfully"
      });
  } catch (error) {
      console.error("Remove Coupon Error:", error);
      res.status(500).json({
          success: false,
          message: "Error removing coupon"
      });
  }
};

module.exports = {

  loadCart,
  addToCart,
  updateCart,
  removeFromCart,
  loadCheckoutPage,
  checkout,
  validateCartStock,
  // loadOrderSuccess,
  razorpayPayment,
  razorpayOrder,
  paymentFailed,
  applyCoupon,
  getOrderDetails,
  razorpayPaymentinOrder,
  walletPayment,
  removeCoupon
  
  
};
