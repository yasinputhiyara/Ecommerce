const { Brand, Category, Product } = require("../../model/Product");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const loadProducts = async (req, res) => {
  try {
    // Extract search query and page number
    const searchQuery = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Number of items per page
    const skip = (page - 1) * limit;

    // Build the search filter
    const searchFilter = searchQuery
      ? { productName: { $regex: searchQuery, $options: "i" } } // Case-insensitive search
      : {};

    // Fetch filtered and paginated products
    const productData = await Product.find(searchFilter)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total number of products for pagination calculation
    const totalProducts = await Product.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch categories and brands
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("admin/view-products", {
        data: productData,
        cat: category,
        brand: brand,
        currentPage: page,
        totalPages: totalPages,
        searchQuery: searchQuery, // Pass the search query to the template
      });
    } else {
      res.send("error");
    }
  } catch (error) {
    console.error("Error loading products:", error);
    res.status(500).send("An error occurred");
  }
};

const loadAddProduct = async (req, res) => {
  try {
    const category = await Category.find({});
    const brand = await Brand.find({ isBlocked: false });
    res.render("admin/add-product", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Get Add product page error", error);
  }
};

const addProduct = async (req, res) => {
  try {
    const products = req.body;
    console.log("Submitted Data ", products);

    // Check if the product already exists
    const productExists = await Product.findOne({
      productName: products.productName,
    });
    if (productExists) {
      return res
        .status(400)
        .json("Product already exists, please try with another name");
    }

    // Process images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        // The images are already cropped and resized from the frontend
        // Just move them to the final destination
        const imagePath = file.filename;
        images.push(imagePath);
      }
    } else {
      return res.status(400).json("Please upload at least one image.");
    }

    // Validate category
    const category = await Category.findOne({ name: products.category });
    if (!category) {
      return res.status(400).json({ message: "Invalid category name" });
    }

    // Parse variants
    let variants = [];
    if (products.variants) {
      try {
        variants = JSON.parse(products.variants);
      } catch (error) {
        return res.status(400).json({ message: "Invalid variants format" });
      }

      if (!Array.isArray(variants) || variants.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one variant is required" });
      }

      variants.forEach((variant) => {
        if (!variant.size || !variant.quantity) {
          throw new Error("Each variant must have a size and quantity");
        }
      });
    }

    // Create new product object
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: category._id,
      subCategory: products.subCategory,
      regularPrice: products.regularPrice,
      salePrice: products.salePrice,
      createdOn: Date.now(),
      quantity: products.quantity,
      color: products.color,
      productImages: images,
      variants: variants,
      status: "Available",
    });

    await newProduct.save();
    console.log("Product added successfully:", newProduct);

    return res
      .status(201)
      .json({ message: "Product added successfully", product: newProduct });
  } catch (error) {
    console.error("Error adding product:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// const addProduct = async (req, res) => {
//   try {
//     const products = req.body;

//     const productExists = await Product.findOne({
//       productName: products.productName,
//     });

//     if (productExists) {
//       return res
//         .status(400)
//         .json("Product already exists, please try with another name");
//     }

//     const images = [];
//     if (req.files && req.files.length > 0) {
//       for (let i = 0; i < req.files.length; i++) {
//         const originaImagePath = path.join(
//           "public",
//           "product-images",
//           req.files[i].filename
//         );
//         const resizedImagePath = path.join(
//           "public",
//           "resized-images",
//           req.files[i].filename
//         );
//         await sharp(originaImagePath)
//           .resize({ width: 440, height: 440 })
//           .toFile(resizedImagePath);

//         // Replace backslashes with forward slashes
//         const imagePath = path.join(req.files[i].filename);
//         images.push(imagePath);
//       }
//     }
//     // else {
//     //   return res.status(400).json("Please upload at least one image.");
//     // }

//     const categoryId = await Category.findOne({ name: products.category });
//     if (!categoryId) {
//       return res.status(400).json({ message: "Invalid category name" });
//     }

//     // Create new product object
//     const newProduct = new Product({
//       productName: products.productName,
//       description: products.description,
//       brand: products.brand,
//       category: categoryId._id,
//       subCategory: products.subCategory,
//       regularPrice: products.regularPrice,
//       salePrice: products.salePrice,
//       createdOn: Date.now(),
//       quantity: products.quantity,
//       color: products.color,
//       productImages: images,
//       status: "Available",
//     });

//     await newProduct.save();
//     console.log(newProduct);
//     return res.redirect("/admin/view-products");
//   } catch (error) {
//     console.error("Error adding product: ", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/view-products");
  } catch (error) {}
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/view-products");
  } catch (error) {}
};

const loadEditProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    if (!product) {
      return res.redirect("/admin/view-products");
    }
    const categoryId = await Category.findOne({ _id: product.category });
    const category = await Category.find({});
    const brand = await Brand.find({});

    res.render("admin/sample/edit-product", {
      product: product,
      cat: category,
      brand: brand,
      category: categoryId,
    });
  } catch (error) {
    console.error("Error loading edit product:", error);
    res.redirect("/admin/view-products");
  }
};

const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // Get the existing product to preserve current images
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Handle variants
    let variants = [];
    if (updatedData.variants) {
      try {
        variants = JSON.parse(updatedData.variants);
        if (!Array.isArray(variants)) {
          throw new Error("Invalid variants format");
        }
        variants.forEach((variant) => {
          if (!variant.size || !variant.quantity) {
            throw new Error("Each variant must have size and quantity");
          }
          variant.quantity = parseInt(variant.quantity);
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid variants format",
        });
      }
    }

    // Handle new images
    let productImages = [...existingProduct.productImages]; // Start with existing images

    if (req.files && req.files.length > 0) {
      // Add new images
      const newImages = req.files.map((file) => file.filename);
      productImages = [...productImages, ...newImages];
    }

    // Update product with all data including images
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        productName: updatedData.productName,
        description: updatedData.description,
        brand: updatedData.brand,
        category: updatedData.category,
        subCategory: updatedData.subCategory,
        regularPrice: updatedData.regularPrice,
        salePrice: updatedData.salePrice,
        color: updatedData.color,
        variants: variants,
        productImages: productImages, // Updated images array
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error editing product:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const { productId, imageName } = req.params;

    // Validate parameters
    if (!productId || !imageName) {
      return res.status(400).json({
        success: false,
        message: "Product ID and image name are required",
      });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Remove image from array
    const imageIndex = product.productImages.indexOf(imageName);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found in product",
      });
    }

    // Remove from database
    product.productImages.splice(imageIndex, 1);
    await product.save();

    // Delete physical files
    const imagePaths = [path.join("public", "product-images", imageName)];

    await Promise.all(
      imagePaths.map((filepath) =>
        fs.promises
          .unlink(filepath)
          .catch((err) => console.error(`Failed to delete ${filepath}:`, err))
      )
    );

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product image:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
};

module.exports = {
  loadProducts,
  loadAddProduct,
  addProduct,
  blockProduct,
  unblockProduct,
  loadEditProduct,
  editProduct,
  deleteProductImage,
};
