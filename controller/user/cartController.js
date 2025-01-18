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

    res.render("user/cart", {
      user,
      cartData,
    });
  } catch (error) {
    console.error("Error in loadCart", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = req.session.user;

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User not logged in' });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId: user._id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: 'Cart not found' });
    }

    // Fetch the product to check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    // Ensure requested quantity doesn't exceed stock
    if (quantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} items available in stock.`,
      });
    }

    // Update cart item quantity
    const cartItem = cart.items.find((item) => item.productId.toString() === productId);
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
        message: 'Cart updated successfully.',
      });
    }

    return res
      .status(404)
      .json({ success: false, message: 'Item not found in cart.' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};


const removeFromCart = async (req, res) => {
  try {
    const itemId = req.params.itemId; // Assuming you pass the item's unique _id in the request parameters
    const user = req.session.user;
    console.log("Item ID : ", itemId);
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

    console.log("cart.items ", cart.items);

    // Check if the item exists in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    // Save the updated cart
    await cart.save();

    return res.json({
      success: true,
      message: "Item removed from cart successfully",
    });
  } catch (error) {
    console.error("Remove from cart error", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const loadCheckoutPage = async (req, res) => {
  try {
    const user = req.session.user;
    console.log("Checkout page user", user);
    const addressesDoc = await Address.findOne({ userId: user._id });
    const addresses = addressesDoc ? addressesDoc.address : [];
    const addressId = addresses.map((address) => address._id).toString();
    // console.log("Addresses ", addresses);
    const cart = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    ); // Assuming products are referenced

    res.render("user/checkout", { user, addresses, cart, addressId });
  } catch (error) {
    console.error("Checkout Page Error", error);
  }
};

const checkout = async (req, res) => {
  try {
    const { selectedAddress, paymentMethod } = req.body;
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    // Validate the selected address
    const addressDoc = await Address.findOne({
      userId: user._id,
      "address._id": selectedAddress,
    });

    if (!addressDoc) {
      return res.status(404).json({ error: "Address not found." });
    }

    const address = addressDoc.address.find(
      (addr) => addr._id.toString() === selectedAddress
    );

    if (!address) {
      return res.status(404).json({ error: "Address not found in user's data." });
    }

    // Get the cart and validate it
    const cart = await Cart.findOne({ userId: user._id }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    // Calculate total price, discount, and final amount
    const totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = 0; // Add discount logic if needed
    const finalAmount = totalPrice - discount;

    // Create a new order
    const newOrder = new Order({
      userId: user._id,
      orderedItems: cart.items.map((item) => ({
        product: item.productId._id,
        quantity: item.quantity,
        price: item.price,
      })),
      totalPrice,
      discount,
      finalAmount,
      address: selectedAddress,
      status: paymentMethod === "cod" ? "Pending" : "Processing",
      createdOn: new Date(),
      couponApplied: false, // Adjust as per your logic
    });


    await newOrder.save();

    // Clear the cart after successful order creation
    await Cart.updateOne({ userId: user._id }, { $set: { items: [] } });

    // Handle redirection based on payment method
    if (paymentMethod === "cod") {
      return res.render("user/order-success", { order: newOrder });
    } else {
      // For non-COD methods, redirect to the payment gateway or another page
      return res.status(200).json({ message: "Redirect to payment gateway", order: newOrder });
    }
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};



module.exports = {
  loadCart,
  addToCart,
  updateCart,
  removeFromCart,
  loadCheckoutPage,
  checkout,
};
