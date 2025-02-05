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


    const orderStatusLabels = orderStatusBreakdown.map((status) => status._id);
    const orderStatusCounts = orderStatusBreakdown.map(
      (status) => status.count
    );

    // console.log("Sttus " , orderStatusLabels , "count " , orderStatusCounts);
    // Render the dashboard

    const getRevenueAnalytics = async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
    
      // Daily Revenue (Last 7 days)
      const dailyRevenue = await Order.aggregate([
        {
          $match: {
            paymentStatus: "Paid",
            orderStatus: { $nin: ["Cancelled", "Returned"] },
            createdAt: { 
              $gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000) 
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$totalPrice" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    
      // Weekly Revenue (Last 4 weeks)
      const weeklyRevenue = await Order.aggregate([
        {
          $match: {
            paymentStatus: "Paid",
            orderStatus: { $nin: ["Cancelled", "Returned"] },
            createdAt: { 
              $gte: new Date(currentDate.getTime() - 28 * 24 * 60 * 60 * 1000) 
            }
          }
        },
        {
          $group: {
            _id: { $week: "$createdAt" },
            total: { $sum: "$totalPrice" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    
      // Monthly Revenue (Last 12 months)
      const monthlyRevenue = await Order.aggregate([
        {
          $match: {
            paymentStatus: "Paid",
            orderStatus: { $nin: ["Cancelled", "Returned"] },
            createdAt: { 
              $gte: new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000) 
            }
          }
        },
        {
          $group: {
            _id: { 
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            total: { $sum: "$totalPrice" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);
    
      // Yearly Revenue (Last 4 years)
      const yearlyRevenue = await Order.aggregate([
        {
          $match: {
            paymentStatus: "Paid",
            orderStatus: { $nin: ["Cancelled", "Returned"] },
            createdAt: { 
              $gte: new Date(currentYear - 3, 0, 1) 
            }
          }
        },
        {
          $group: {
            _id: { $year: "$createdAt" },
            total: { $sum: "$totalPrice" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    
      return {
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        yearly: yearlyRevenue
      };
    };
    
    // Add this to your loadDashboard function
    const revenueAnalytics = await getRevenueAnalytics();

    // console.log('revenue analytics ' , revenueAnalytics)


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
      orderStatusCounts,
      revenueAnalytics: JSON.stringify(revenueAnalytics)

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
    
    const searchQuery = req.query.search || ""; 
    const page = parseInt(req.query.page) || 1; 
    const limit = 5;
    const skip = (page - 1) * limit; 

    // Build the search filter for the query
    const searchFilter = searchQuery
      ? { username: { $regex: searchQuery, $options: "i" } } 
      : {};

    
    const users = await User.find(searchFilter)
      .sort({ createdOn: -1 }) 
      .skip(skip) 
      .limit(limit);

    // Get the total count of users for pagination calculation
    const totalUsers = await User.countDocuments(searchFilter); 
    const totalPages = Math.ceil(totalUsers / limit); 

    
    res.render("admin/view-users", {
      users,
      searchQuery, 
      currentPage: page,
      totalPages, 
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
