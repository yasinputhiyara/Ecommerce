const { Brand, Category, Product } = require("../../model/Product");
const Wishlist = require("../../model/Wishlist");

// const loadProductDetail = async (req, res) => {
//     try {
//         const productId = req.params.id;
//         const product = await Product.findById(productId).populate('category');
//         const products = await Product.find({}).limit(4);
//         const user = req.session.user;
//         const category = await Category.findOne({})

//         const similarProducts = await Product.find({}).limit(4)

//         res.render('user/view-productDetails', {
//             product,
//             user,
//             similarProducts,
//             products

//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// };

// const loadProductDetail = async (req, res) => {
//     try {
//         const productId = req.params.id;
//         const product = await Product.findById(productId)
//             .populate('category')
//             // .populate('reviews.userId')
//             .populate('variants');

//         const similarProducts = await Product.find({
//             category: product.category,
//             _id: { $ne: product._id }
//         }).limit(4);

//         // Calculate average rating
//         // const averageRating = product.reviews.reduce((acc, review) =>
//         //     acc + review.rating, 0) / (product.reviews.length || 1);

//         res.render('user/view-productDetails', {
//             product: {
//                 ...product._doc,
//                 // averageRating
//             },
//             user: req.session.user,
//             products:similarProducts
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// };

const loadProductDetail = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const productId = req.params.id;
    const product = await Product.findById(productId).populate("category");

    if (!product || product.isBlocked) {
      return res.status(404).send("Product not found");
    }

    // Check if the product is in the user's wishlist
    let isInWishlist = false;
    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).select("products");

      if (wishlist) {
        isInWishlist = wishlist.products.some(
          (p) => p.productId.toString() === productId
        );
      }
    }

    // Dummy review data
    const dummyReviews = [
      {
        userName: "John Smith",
        rating: 5,
        comment:
          "Excellent product! The quality exceeded my expectations. Would definitely recommend to others.",
        createdAt: new Date("2024-12-15"),
      },
      {
        userName: "Sarah Johnson",
        rating: 4,
        comment: "Great fit and comfortable material. Shipping was fast too.",
        createdAt: new Date("2024-12-10"),
      },
      {
        userName: "Mike Brown",
        rating: 3,
        comment:
          "Decent product for the price. Could be better in terms of durability.",
        createdAt: new Date("2024-12-05"),
      },
    ];

    // Calculate average rating
    const averageRating =
      dummyReviews.reduce((acc, review) => acc + review.rating, 0) /
      dummyReviews.length;

    // Combine real product data with dummy data
    const enrichedProduct = {
      ...product._doc,
      reviews: dummyReviews,
      averageRating: averageRating,
    };

    const similarProducts = await Product.find({
      _id: { $ne: productId },
      category: product.category,
    }).limit(4);

    // console.log("Wishlist Check:", {
    //   userId,
    //   productId,
    //   isInWishlist,
    // });

    res.render("user/view-productDetails", {
      product: enrichedProduct,
      user: req.session.user,
      products: similarProducts,
      isInWishlist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

const search = async (req, res) => {
  try {
    const { query, category, brand, minPrice, maxPrice, subCategory, color } =
      req.query;

    let filter = {};

    // 🔹 Search by Product Name
    if (query) {
      filter.productName = { $regex: query, $options: "i" };
    }

    // 🔹 Search by Category Name
    if (category) {
      const categoryData = await Category.findOne({
        name: { $regex: category, $options: "i" },
      });
      if (categoryData) {
        filter.category = categoryData._id; // Filter by ObjectId of category
      }
    }

    // 🔹 Search by Brand Name
    if (brand) {
      const brandData = await Brand.findOne({
        brandName: { $regex: brand, $options: "i" },
      });
      if (brandData) {
        filter.brand = brandData.brandName; // Filter by brand name
      }
    }

    // 🔹 Filter by Price Range (Regular or Sale Price)
    if (minPrice || maxPrice) {
      filter.$or = [
        { regularPrice: { $gte: minPrice || 0, $lte: maxPrice || Infinity } },
        { salePrice: { $gte: minPrice || 0, $lte: maxPrice || Infinity } },
      ];
    }

    // 🔹 Filter by Subcategory
    if (subCategory) {
      filter.subCategory = { $regex: subCategory, $options: "i" };
    }

    // 🔹 Filter by Color
    if (color) {
      filter.color = { $regex: color, $options: "i" };
    }

    // 🔹 Query Products with Filters
    const results = await Product.find(filter)
      .populate("category") // Populate Category Details
      .sort({ createdAt: -1 }); // Sort by Newest Products

    res.json(results); // Return JSON response
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  loadProductDetail,
  search,
};
