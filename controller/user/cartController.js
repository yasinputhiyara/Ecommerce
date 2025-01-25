const { Product } = require("../../model/Product");
const Cart = require("../../model/Cart");
const Address = require("../../model/Address");
const Order = require("../../model/Order");
const Coupon = require("../../model/Coupon");
const { User } = require("../../model/User");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
require("dotenv").config();

const addToCart = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).send("User not logged in");
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

    if (!user) {
      return res.redirect("/login");
    }

    // Fetch the cart and populate the productId field
    const cartData = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );

    if (cartData) {
      // Filter out items with null productId
      cartData.items = cartData.items.filter((item) => item.productId !== null);
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

    if (!user) {
      return res.redirect("/login");
    }

    const addressesDoc = await Address.findOne({ userId: user._id });
    const addresses = addressesDoc ? addressesDoc.address : [];

    const cart = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );

    // Get valid coupons
    const currentDate = new Date();
    let coupons = await Coupon.find({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      isList: true,
    }).sort({ createdAt: -1 });

    // Validate products and quantities
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
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    let subtotal = 0;
    if (cart && cart.items.length > 0) {
      subtotal = cart.items.reduce((total, item) => 
        total + (item.productId.salePrice * item.quantity), 0);
    }

    // Find the coupon
    const currentDate = new Date();
    const coupon = await Coupon.findOne({
      name: couponCode,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      minPrice: { $lte: subtotal },
      isList: true
    });

    if (!coupon) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired coupon" 
      });
    }

    // Check if user has already used the coupon (if user-specific)
    if (coupon.userId && coupon.userId.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already used this coupon" 
      });
    }

    // Calculate discounted total
    const discount = coupon.offerPrice;
    const finalTotal = Math.max(subtotal - discount, 0);

    res.json({
      success: true,
      discount,
      finalTotal,
      couponName: coupon.name
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error applying coupon" 
    });
  }
};

// const loadCheckoutPage = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     const user = await User.findOne({_id: userId});
//     // console.log("User", user);

//     if (!user) {
//       // return res.status(401).json({ error: "User not authenticated." });
//       return res.redirect("/login");
//     }

//     const addressesDoc = await Address.findOne({ userId: user._id });
//     const addresses = addressesDoc ? addressesDoc.address : [];

//     // console.log("Addresses", addresses);

//     const cart = await Cart.findOne({ userId: user._id }).populate(
//       "items.productId"
//     );
//     // console.log("Cart", cart);

//     let coupons = await Coupon.find({}).sort({ createdAt: -1 });

//     // Validate products and quantities
//     const outOfStockItems = [];
//     if (cart && cart.items.length > 0) {
//       for (const item of cart.items) {
//         const product = item.productId;
//         if (!product) continue;

//         const variant = product.variants.find((v) => v.size === item.size);
//         if (!variant || variant.quantity < item.quantity) {
//           outOfStockItems.push(`${product.productName} (${item.size})`);
//         }
//       }
//     }

//     if (outOfStockItems.length > 0) {
//       return res.render("user/cart", {
//         error: `The following items are out of stock or have insufficient quantity: ${outOfStockItems.join(", "  )}`,
//       });
//     }

//     res.render("user/checkout", { user : user, addresses , cart ,availableCoupons:coupons });
//   } catch (error) {
//     console.error("Checkout Page Error:", error);
//     res.status(500).render("error", { message: "Error loading checkout page" });
//   }
// };

const generateOrderId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD${timestamp}${random}`;
};

// Razorpay instance (replace with your Razorpay credentials)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const checkout = async (req, res) => {
  try {
    const { selectedAddress, paymentMethod } = req.body;
    const userId = req.session.user._id;

    // Fetch cart details
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty." });
    }

    // Check product variant availability
    const outOfStockItems = [];
    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants.find((v) => v.size === item.size);

      if (!variant || variant.quantity < item.quantity) {
        outOfStockItems.push(`${product.productName} (${item.size})`);
        continue;
      }

      // Reduce variant quantity
      variant.quantity -= item.quantity;
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following items are out of stock: ${outOfStockItems.join(
          ", "
        )}`,
      });
    }

    // Save updated products
    await Promise.all(cart.items.map((item) => item.productId.save()));

    // Calculate total price
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.productId.salePrice * item.quantity,
      0
    );

    // Save order
    const newOrder = new Order({
      userId,
      orderId: generateOrderId(),
      orderedItems: cart.items.map((item) => ({
        product: item.productId._id,
        quantity: item.quantity,
        size: item.size,
        price: item.productId.salePrice,
      })),
      totalPrice,
      address: selectedAddress,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid",
      orderStatus: "Pending",
    });

    await newOrder.save();

    // Clear cart after order
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Order placed successfully.",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to place order. Please try again.",
    });
  }
};

// const loadOrderSuccess = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const orderId = req.query.orderId;
//     const order = await Order.findOne({ orderId: orderId });

//     if (!user) {
//       return res.redirect("/login");
//     }

//     res.render("user/order-success", { user, order });
//   } catch (error) {
//     console.error("Order Success Error:", error);
//     res
//       .status(500)
//       .render("error", { message: "Error loading order success page" });
//   }
// };

// const razorpayPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =  req.body;

//     // Verify payment signature
//     const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
//     hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
//     const generatedSignature = hmac.digest("hex");

//     if (generatedSignature !== razorpay_signature) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid payment signature." });
//     }

//     // Update order payment status in the database
//     const order = await Order.findOneAndUpdate(
//       { orderId: razorpay_order_id },
//       { paymentStatus: "Paid", status: "Processing" },
//       { new: true }
//     );

//     if (!order) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found." });
//     }

//     // Update product variant quantities
//     for (const item of order.orderedItems) {
//       const product = await Product.findById(item.product);
//       const variant = product.variants.find((v) => v.size === item.size);

//       if (variant) {
//         variant.quantity -= item.quantity;
//         if (variant.quantity < 0) variant.quantity = 0;
//       }

//       await product.save();
//     }

//     // Clear the cart for the user
//     const cart = await Cart.findOne({ userId: order.userId });
//     if (cart) {
//       cart.items = [];
//       await cart.save();
//     }

//     res.status(200).json({
//       success: true,
//       message: "Payment verified and order placed successfully.",
//     });
//   } catch (error) {
//     console.error("Error verifying payment:", error);
//     res.status(500).json({
//       success: false,
//       message: "Payment verification failed.",
//     });
//   }
// };

const razorpayOrder = async (req, res) => {
  try {
    const { selectedAddress } = req.body;
    const userId = req.session.user._id;

    // Validate selected address
    if (!selectedAddress) {
      return res
        .status(400)
        .json({ success: false, message: "No address selected." });
    }

    // Fetch cart details
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty." });
    }

    // Check product variant availability
    const outOfStockItems = [];
    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants.find((v) => v.size === item.size);

      if (!variant || variant.quantity < item.quantity) {
        outOfStockItems.push(`${product.productName} (${item.size})`);
        continue;
      }

      // Reduce variant quantity
      variant.quantity -= item.quantity;
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following items are out of stock: ${outOfStockItems.join(
          ", "
        )}`,
      });
    }

    // Save updated products
    await Promise.all(cart.items.map((item) => item.productId.save()));

    // Calculate total price
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.productId.salePrice * item.quantity,
      0
    );

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalPrice * 100, // Amount in paise
      currency: "INR",
      receipt: `order_rcpt_${Date.now()}`,
    });

    // Save order to the database
    const newOrder = new Order({
      userId,
      orderId: razorpayOrder.id,
      orderedItems: cart.items.map((item) => ({
        product: item.productId._id,
        quantity: item.quantity,
        size: item.size,
        price: item.productId.salePrice,
      })),
      totalPrice,
      address: selectedAddress,
      paymentMethod: "razorpay",
      paymentStatus: "Pending", // Mark as pending until payment verification
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
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order. Please try again.",
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
    console.log("Razorpay Payment Data", req.body);

    // Verify payment signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);

    // Important: Use the correct signature generation method
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
        orderStatus: "Processing",
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
      { paymentStatus: "Pending", orderStatus: "Pending" },
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
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update order status." });
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
  applyCoupon
};
