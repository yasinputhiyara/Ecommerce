const Orders = require("../../model/Order");
const Address = require("../../model/Address");
const Wallet = require("../../model/Wallet");
const { Product } = require("../../model/Product");

const loadOrders = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }

    const orders = await Orders.find({ userId: user._id })
      .populate("orderedItems.product")
      .populate("address")
      .sort({ createdOn: -1 });

    orders.forEach((order, index) => {
      let addressId = order.address;

      console.log(`Order ${index + 1} AddressId:`, addressId);
    });

    res.render("user/account/orders", { user, orders });
  } catch (error) {
    console.error("Order Page Error:", error);
    res.status(500).send("An error occurred while loading the orders.");
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }

    const orderId = req.params.id;

    // Find the order and populate product details including productImages
    const order = await Orders.findOne({ _id: orderId }).populate({
      path: "orderedItems.product",
      select: "productName salePrice productImages", // Include required fields
    });

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    console.log("Order Details:", order);

    // Extract the address ID from the order
    const addressId = order.address;
    // console.log("Order AddressId:", addressId);

    // Find the address using the user ID and address ID
    const addressDoc = await Address.findOne({
      userId: user._id,
      "address._id": addressId,
    });

    if (!addressDoc) {
      return res.status(404).send("Address not found.");
    }

    const orderAddress = addressDoc.address.find(
      (addr) => addr._id.toString() === addressId.toString()
    );

    if (!orderAddress) {
      return res.status(404).send("Order address not found.");
    }

    // Extract products and their images
    const products = order.orderedItems.map((item) => ({
      productName: item.product.productName,
      salePrice: item.product.salePrice,
      productImages: item.product.productImages,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    // Render the order details page
    res.render("user/account/order-detail", {
      user,
      order,
      products,
      orderAddress,
    });
  } catch (error) {
    console.error("Order Details Page Error:", error);
    res.status(500).send("An error occurred while loading the order details.");
  }
};


const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    console.log("Cancelling order:", orderId);

    // Find the order and populate product details
    const order = await Orders.findById(orderId).populate("orderedItems.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Check if order is already cancelled
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled.",
      });
    }

    // Keep track of all products to be updated
    const productsToUpdate = new Map();

    // Update inventory for each item
    for (const item of order.orderedItems) {
      if (item.status !== "Cancelled") {
        console.log("Processing item:", {
          productId: item.product._id,
          size: item.size,
          quantity: item.quantity,
        });

        // Find product or use cached version
        let product;
        if (productsToUpdate.has(item.product._id.toString())) {
          product = productsToUpdate.get(item.product._id.toString());
        } else {
          product = await Product.findById(item.product._id);
          if (product) {
            productsToUpdate.set(item.product._id.toString(), product);
          }
        }

        if (!product) {
          console.log(`Product not found for item: ${item.product._id}`);
          continue;
        }

        // Update inventory
        const variant = product.variants.find(
          (v) => v.size.toLowerCase() === item.size.toLowerCase()
        );

        if (variant) {
          variant.quantity += item.quantity;
        }

        // Mark item as cancelled
        item.status = "Cancelled";
      }
    }

    // Update order status and amounts
    order.orderStatus = "Cancelled";

    if (order.paymentStatus === "Paid") {
      // Refund to wallet
      const wallet = await Wallet.findOne({ userId: order.userId });
      if (wallet) {
        wallet.balance += order.totalPrice;
        wallet.transactionHistory.push({
          transactionType: "CREDIT",
          transactionAmount: order.totalPrice,
          description: `Refund for Order ID: ${order._id}`,
        });
        await wallet.save();
      }
    }

    order.paymentStatus = "Refunded";
    order.totalPrice = 0;
    order.finalAmount = 0;

    // Save all modified products and the order
    const savePromises = [
      ...Array.from(productsToUpdate.values()).map((product) => product.save()),
      order.save(),
    ];

    await Promise.all(savePromises);

    return res.status(200).json({
      success: true,
      message: "Order cancelled and refund processed successfully.",
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


const cancelProduct = async (req, res) => {
  try {
    const { orderId, productIndex } = req.params;

    console.log("Cancelling product:", { orderId, productIndex });

    const order = await Orders.findById(orderId).populate("orderedItems.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const index = parseInt(productIndex);
    if (isNaN(index) || index < 0 || index >= order.orderedItems.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid product index.",
      });
    }

    const item = order.orderedItems[index];

    if (item.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Product is already cancelled.",
      });
    }

    // Find product and update inventory
    const product = await Product.findById(item.product._id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const variant = product.variants.find(
      (v) => v.size.toLowerCase() === item.size.toLowerCase()
    );

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Product variant not found.",
      });
    }

    variant.quantity += item.quantity;

    // Calculate refund for this product
    const refundAmount = item.price * item.quantity;
    order.totalPrice -= refundAmount;
    order.finalAmount = order.totalPrice;

    // Update item status
    order.orderedItems[index].status = "Cancelled";

    // Process refund if payment was made
    if (order.paymentStatus === "Paid") {
      const wallet = await Wallet.findOne({ userId: order.userId });
      if (wallet) {
        wallet.balance += refundAmount;
        wallet.transactionHistory.push({
          transactionType: "CREDIT",
          transactionAmount: refundAmount,
          description: `Refund for Product in Order ID: ${order._id}`,
        });
        await wallet.save();
      }
    }

    // Check if all items are cancelled
    const allItemsCancelled = order.orderedItems.every(
      (item) => item.status === "Cancelled"
    );
    if (allItemsCancelled) {
      order.status = "Cancelled";
      order.paymentStatus = "Refunded";
    }

    // Save both product and order
    await Promise.all([product.save(), order.save()]);

    return res.status(200).json({
      success: true,
      message: "Product cancelled successfully.",
      updatedTotal: order.totalPrice,
      orderStatus: order.status,
    });
  } catch (error) {
    console.error("Error cancelling product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};



module.exports = {
  loadOrders,
  loadOrderDetails,
  cancelOrder,
  cancelProduct,
};
