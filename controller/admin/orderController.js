const Order = require("../../model/Order");
const { Product } = require("../../model/Product");
const { User } = require("../../model/User");
const Address = require("../../model/Address");
const Wallet = require('../../model/Wallet')

const viewOrders = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1; // Default to page 1
    let limit = parseInt(req.query.limit) || 10; // Default limit to 10 orders per page

    let totalOrders = await Order.countDocuments(); // Get total count of orders
    let totalPages = Math.ceil(totalOrders / limit); // Calculate total pages

    const orders = await Order.find({})
      .populate("orderedItems.product", "productName productImages")
      .populate("userId", "username")
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("admin/view-orders", { 
      orders, 
      currentPage: page, 
      totalPages, 
      limit 
    });
  } catch (error) {
    console.log("Admin Order Error ", error);
    res.status(500).send("Internal Server Error");
  }
};


const orderDetails = async (req, res) => {
  try {
    // Fetch the order and populate necessary fields
    let order = await Order.findById(req.params.id)
      .populate("userId", "username email phone") // Populate user details
      .populate("orderedItems.product", "productName productImages"); // Populate product details

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("admin/order-details", { order, address: null });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Internal Server Error");
  }
};


const updateOrderStatus = async (req, res) => {
  const { orderId, orderStatus } = req.body;

  try {
    // Fetch the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Business logic restrictions
    if (order.orderStatus === "Delivered" || order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a Delivered or Cancelled order.",
      });
    }

    if (
      order.orderStatus === "Shipped" &&
      (orderStatus === "Pending" || orderStatus === "Processing")
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot change a Shipped order back to Pending or Processing.",
      });
    }

    // Update order status
    order.orderStatus = orderStatus;

    // Update each ordered item’s status, except if its current status is "Cancelled"
    order.orderedItems.forEach((item) => {
      if (item.orderStatus !== "Cancelled") {
        item.orderStatus = orderStatus;
      }
    });

    // If the order is COD and is being marked as Delivered, update payment status
    if (order.paymentMethod === "cod" && orderStatus === "Delivered") {
      order.paymentStatus = "Paid";

      // Update each product's order status and payment status
      order.orderedItems.forEach((item) => {
        item.orderStatus = "Delivered";
        item.paymentStatus = "Paid";
      });
    }

    await order.save();

    res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



const handleReturnRequest = async (req, res) => {
  try {
      const { productId } = req.params;
      const { isAccepted } = req.body;

      // Find the order containing this product
      const order = await Order.findOne({ "orderedItems._id": productId });
      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Find the product in the order
      const item = order.orderedItems.find((p) => p._id.toString() === productId);
      if (!item) {
          return res.status(404).json({ success: false, message: "Product not found" });
      }

      if (item.orderStatus !== "Return Request") {
          return res.status(400).json({ success: false, message: "Invalid return request" });
      }

      if (isAccepted) {
          // Approve return: Update status to "Returned"
          item.orderStatus = "Returned";

          // Refund logic (if payment was made via Razorpay)
          if (order.paymentMethod === "razorpay" || order.paymentMethod === "cod" && order.paymentStatus === "Paid") {
              let wallet = await Wallet.findOne({ userId: order.userId });

              if (!wallet) {
                  wallet = new Wallet({
                      userId: order.userId,
                      balance: 0,
                      transactionHistory: [],
                  });
              }

              // Calculate refund amount
              const refundAmount = item.price * item.quantity;

              // Credit refund to wallet
              wallet.balance += refundAmount;
              wallet.transactionHistory.push({
                  transactionType: "CREDIT",
                  transactionAmount: refundAmount,
                  description: `Refund for product ${item._id} in order ${order._id}`,
              });

              // Update order details after refund
              item.paymentStatus = "Refunded"; 
              order.totalPrice -= refundAmount
              // order.subtotal -= refundAmount
              

              await wallet.save();
          }
      } else {
          // Reject return: Reset product status
          item.orderStatus = "Delivered";
      }

      await order.save();

      return res.status(200).json({
          success: true,
          message: isAccepted ? "Return approved, refund processed, and order updated." : "Return request rejected.",
      });
  } catch (error) {
      console.error("Error handling return request:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
 

module.exports = {
  viewOrders,
  orderDetails,
  updateOrderStatus,
  handleReturnRequest
};
