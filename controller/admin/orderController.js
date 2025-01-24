const Order = require("../../model/Order");
const { Product } = require("../../model/Product");
const { User } = require("../../model/User");

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
      let order = await Order.findById(req.params.id)
        .populate("userId", "username email contactNumber") // Populate user details
        .populate("orderedItems.product", "productName productImages") // Populate product details
        .populate("address", "name city landMark state pincode phone"); // Populate address details directly
  
      console.log("Order Details:", order);
  
      res.render("admin/order-details", { order }); // Pass the populated order to the view
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  

module.exports = {
  viewOrders,
  orderDetails,
};
