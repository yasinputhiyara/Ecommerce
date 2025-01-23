const { Product } = require("../../model/Product");
const Cart = require("../../model/Cart");
const Address = require("../../model/Address");
const Order = require("../../model/Order");
const { User } = require("../../model/User");
const mongoose = require("mongoose");

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
        message: 'User not logged in' 
      });
    }

    const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    const outOfStockItems = [];
    
    for (const item of cart.items) {
      if (!item.productId) continue;
      
      const variant = item.productId.variants.find(v => v.size === item.size);
      if (!variant || variant.quantity < item.quantity) {
        outOfStockItems.push(
          `${item.productId.productName} (Size: ${item.size}) - Only ${variant ? variant.quantity : 0} available`
        );
      }
    }

    if (outOfStockItems.length > 0) {
      return res.json({
        success: false,
        outOfStockItems
      });
    }

    return res.json({
      success: true,
      message: 'All items are in stock'
    });
    
  } catch (error) {
    console.error('Validate cart stock error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
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
    const user = req.session.user;

    if (!user) {
      // return res.status(401).json({ error: "User not authenticated." });
      return res.redirect("/login");
    }


    const addressesDoc = await Address.findOne({ userId: user._id });
    const addresses = addressesDoc ? addressesDoc.address : [];

    const cart = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );

    // Validate products and quantities
    const outOfStockItems = [];
    if (cart && cart.items.length > 0) {
      for (const item of cart.items) {
        const product = item.productId;
        if (!product) continue;

        const variant = product.variants.find((v) => v.size === item.size);
        if (!variant || variant.quantity < item.quantity) {
          outOfStockItems.push(`${product.productName} (${item.size})`);
        }
      }
    }

    if (outOfStockItems.length > 0) {
      return res.render("user/cart", {
        error: `The following items are out of stock or have insufficient quantity: ${outOfStockItems.join(
          ", "
        )}`,
      });
    }

    res.render("user/checkout", { user, addresses, cart });
  } catch (error) {
    console.error("Checkout Page Error:", error);
    res.status(500).render("error", { message: "Error loading checkout page" });
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
    const { selectedAddress, paymentMethod } = req.body;
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    // Validate address
    const addressDoc = await Address.findOne({ userId: user._id });
    const deliveryAddress = addressDoc?.address.find(
      (addr) => addr._id.toString() === selectedAddress
    );
    if (!deliveryAddress) {
      return res.status(404).json({ error: "Selected address not found." });
    }

    // Group cart items by product ID to handle variants
    const productUpdates = new Map();
    const outOfStockItems = [];

    for (const item of cart.items) {
      const product = item.productId;

      if (!product) {
        console.warn(`Product ID is null for cart item: ${JSON.stringify(item)}`);
        continue;
      }

      const variantIndex = product.variants.findIndex(
        (v) => v.size === item.size
      );

      if (
        variantIndex === -1 ||
        product.variants[variantIndex].quantity < item.quantity
      ) {
        outOfStockItems.push(`${product.productName} (${item.size})`);
        continue;
      }

      // Group updates by product ID
      if (!productUpdates.has(product._id.toString())) {
        productUpdates.set(product._id.toString(), {
          product,
          updates: []
        });
      }

      // Add variant update to the product's update list
      productUpdates.get(product._id.toString()).updates.push({
        variantIndex,
        quantity: item.quantity
      });
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        error: `The following items are out of stock: ${outOfStockItems.join(", ")}`
      });
    }

    // Apply updates for each product
    const updates = [];
    for (const [, { product, updates: productVariantUpdates }] of productUpdates) {
      // Apply all variant updates for this product
      for (const update of productVariantUpdates) {
        product.variants[update.variantIndex].quantity -= update.quantity;
      }

      // Check if product should be marked as out of stock
      if (product.variants.every((v) => v.quantity === 0)) {
        product.status = "Out of Stock";
      }

      // Save product once with all variant updates
      updates.push(product.save());
    }

    // Wait for all product updates to complete
    await Promise.all(updates);

    // Calculate amounts
    const totalPrice = cart.items.reduce(
      (sum, item) => (item.productId ? sum + item.price * item.quantity : sum),
      0
    );
    const shippingCost = 0;
    const discount = 0;
    const finalAmount = totalPrice + shippingCost - discount;

    // Create order
    const newOrder = new Order({
      userId: user._id,
      orderId: generateOrderId(),
      orderedItems: cart.items
        .filter((item) => item.productId)
        .map((item) => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
        })),
      totalPrice,
      discount,
      finalAmount,
      address: deliveryAddress,
      status: "Pending",
      createdOn: new Date(),
      paymentMethod,
    });

    await newOrder.save();

    // Clear cart
    cart.items = [];
    await cart.save();

    // Respond based on payment method
    if (paymentMethod === "cod") {
      return res.status(200).json({
        success: true,
        message: "Order placed successfully!",
        order: newOrder,
      });
    } else if (paymentMethod === "razorpay") {
      return res.status(200).json({
        success: true,
        message: "Razorpay payment pending",
        order: newOrder,
      });
    }
  } catch (error) {
    console.error("Checkout Error:", error);
    return res.status(500).json({
      error: "An error occurred during checkout. Please try again.",
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
  validateCartStock
};
