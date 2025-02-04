const { User } = require("../../model/User");
const Order = require("../../model/Order");
const { Product, Brand, Category } = require("../../model/Product");
const bcrypt = require("bcrypt");

const loadLogin = async (req, res) => {
  try {
    const error = req.session.error || null;
    req.session.error = null;

    if (req.session.admin) {
      return res.redirect("/admin");
    }

    res.render("admin/login", { error });
  } catch (error) {
    console.error("Error Admin Login", error);
  }
};

const verifyAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ensure admin login
    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      req.session.error = "Invalid email or password";
      return res.redirect("/admin/login");
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      req.session.error = "Invalid email or password";
      return res.redirect("/admin/login");
    }

    // Store admin session
    req.session.admin = {
      _id: admin._id,
      username: admin.username,
      email: admin.email,
    };
    res.redirect("/admin");
  } catch (err) {
    console.error("Admin Login Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

const loadDashboard = async (req, res) => {
  try {
    // Total Orders
    const totalOrders = await Order.countDocuments();

    // Total Deliveries
    const totalDeliveries = await Order.countDocuments({
      orderStatus: "Delivered",
    });

    // Total Products
    const totalProducts = await Product.countDocuments();

    // New Customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newCustomers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const totalUsers = await User.countDocuments();

    // Earnings
    const totalEarnings = await Order.aggregate([
      {
        $match: {
          paymentStatus: "Paid",
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    // Top Products (by number of times ordered)
    const topProducts = await Order.aggregate([
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$orderedItems.product",
          popularity: { $sum: "$orderedItems.quantity" },
        },
      },
      { $sort: { popularity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $project: {
          name: { $arrayElemAt: ["$productDetails.productName", 0] },
          popularity: 1,
        },
      },
    ]);

    // console.log("Top Product",topProducts)

    // Top Categories (by number of products)
    const topCategories = await Category.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $project: {
          categoryName: "$name",
          productCount: { $size: "$products" },
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 },
    ]);

    // Top Brands (by number of products)
    const topBrands = await Brand.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "brandName",
          foreignField: "brand",
          as: "products",
        },
      },
      {
        $project: {
          brandName: 1,
          productCount: { $size: "$products" },
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 },
    ]);

    // Customer Data
    const customers = await User.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "userId",
          as: "orders",
        },
      },
      {
        $project: {
          username: 1,
          email: 1,
          orderCount: { $size: "$orders" },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 },
    ]);

    // Trending Products (newest products)
    const products = await Product.find().sort({ createdAt: -1 }).limit(8);

    const orderStatusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const visitorData = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          visitorCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]);

    const orderStatusLabels = orderStatusBreakdown.map((status) => status._id);
    const orderStatusCounts = orderStatusBreakdown.map(
      (status) => status.count
    );

    console.log("Sttus " , orderStatusLabels , "count " , orderStatusCounts);
    // Render the dashboard
    res.render("admin/dashboard", {
      totalOrders,
      totalDeliveries,
      totalProducts,
      totalUsers,
      newCustomers,
      earningsAmount: totalEarnings[0]?.total || 0,
      topProducts,
      topCategories,
      topBrands,
      customers,
      products,
      orderStatusLabels,
      orderStatusCounts

    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).render("error", {
      message: "Error loading dashboard",
      error: error.message,
    });
  }
};

const viewUsers = async (req, res) => {
  try {
    // Extract search query and page number from query parameters
    const searchQuery = req.query.search || ""; // Search query from the URL, defaulting to an empty string
    const page = parseInt(req.query.page) || 1; // Page number, defaulting to 1 if not provided
    const limit = 5; // Number of users per page
    const skip = (page - 1) * limit; // Skip calculation for pagination

    // Build the search filter for the query
    const searchFilter = searchQuery
      ? { username: { $regex: searchQuery, $options: "i" } } // Case-insensitive search for username
      : {}; // Empty filter if no search query is provided

    // Fetch the users with the search filter, sorting by creation date, and paginated
    const users = await User.find(searchFilter)
      .sort({ createdOn: -1 }) // Sort by creation date in descending order
      .skip(skip) // Skip records for pagination
      .limit(limit); // Limit the number of records per page

    // Get the total count of users for pagination calculation
    const totalUsers = await User.countDocuments(searchFilter); // Total number of users matching the search filter
    const totalPages = Math.ceil(totalUsers / limit); // Total number of pages

    // Render the view with users, search query, pagination details, and other necessary data
    res.render("admin/view-users", {
      users,
      searchQuery, // Pass the search query to the template
      currentPage: page, // Current page number
      totalPages, // Total pages for pagination
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("An error occurred while fetching users");
  }
};

const loadUpdateUser = async (req, res) => {
  try {
    const userId = req.params._id;
    const user = await User.findOne({ _id: userId });
    res.render("admin/update-user", { userId, user });
  } catch (error) {}
};

// const updateUser = async (req, res) => {
//     try {
//         const userId = req.params._id;
//         const { username, email } = req.body

//         const updatedUser = await User.findByIdAndUpdate(
//             { _id: userId },
//             { username, email },
//             { new: true, runValidators: true }
//         );

//         console.log(updatedUser)
//         res.redirect("/admin/view-users")
//     } catch (error) {
//         console.error('Error updating user:', error);

//     }
// }

module.exports = {
  loadLogin,
  verifyAdminLogin,
  loadDashboard,
  viewUsers,
  loadUpdateUser,
  // updateUser
};
