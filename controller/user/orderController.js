const Orders = require("../../model/Order");

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

module.exports = {
  loadOrders,
};
