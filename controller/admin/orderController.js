const Order = require("../../model/Order");
const { Product } = require("../../model/Product");
const { User } = require("../../model/User");
const Address = require("../../model/Address");

const viewOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("orderedItems.product", "productName productImages") // Populate product details
      .populate("userId", "username") // Populate user details
      .sort({ createdOn: -1 });

    // console.log("Admin Orders", orders);

    res.render("admin/view-orders", { orders }); // Pass orders to the view
  } catch (error) {
    console.log("Admin Order Error ", error);
    res.status(500).send("Internal Server Error");
  }
};

const orderDetails = async (req, res) => {
  try {
    // Fetch the order and populate necessary fields
    let order = await Order.findById(req.params.id)
      .populate("userId", "username email contactNumber") // Populate user details
      .populate("orderedItems.product", "productName productImages"); // Populate product details

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Fetch the specific address matching the ObjectId in order.address
    let addressDoc = await Address.findOne(
      { "address._id": order.address }, // Match nested address._id
      { "address.$": 1 } // Return only the matching address
    );

    if (!addressDoc || !addressDoc.address.length) {
      return res.status(404).send("Address not found");
    }

    // Extract the matched address
    const matchedAddress = addressDoc.address[0];
    console.log("Matched Address:", matchedAddress);

    // Render the order details along with the matched address
    res.render("admin/order-details", { order, address: matchedAddress });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId, orderStatus } = req.body;
  console.log("Order ID:", req.body);

  try {
    const order = await Order.findByIdAndUpdate(orderId, { orderStatus }, { new: true });
    if (order) {
      res.json({ success: true, message: 'Order status updated successfully' });
    } else {
      res.json({ success: false, message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
module.exports = {
  viewOrders,
  orderDetails,
  updateOrderStatus
};
