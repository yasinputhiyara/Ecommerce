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
    const category = await Category.find({  });
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

    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (productExists) {
      return res
        .status(400)
        .json("Product already exists, please try with another name");
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const originaImagePath = path.join(
          "public",
          "product-images",
          req.files[i].filename
        );
        const resizedImagePath = path.join(
          "public",
          "resized-images",
          req.files[i].filename
        );
        await sharp(originaImagePath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedImagePath);

        // Replace backslashes with forward slashes
        const imagePath = path.join(req.files[i].filename);
        images.push(imagePath);
      }
    }
    // else {
    //   return res.status(400).json("Please upload at least one image.");
    // }

    const categoryId = await Category.findOne({ name: products.category });
    if (!categoryId) {
      return res.status(400).json({ message: "Invalid category name" });
    }

    // Create new product object
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: categoryId._id,
      subCategory: products.subCategory,
      regularPrice: products.regularPrice,
      salePrice: products.salePrice,
      createdOn: Date.now(),
      quantity: products.quantity,
      color: products.color,
      productImages: images,
      status: "Available",
    });

    await newProduct.save();
    console.log(newProduct);
    return res.redirect("/admin/view-products");
  } catch (error) {
    console.error("Error adding product: ", error);
    return res.status(500).json({ message: "Server error" });
  }
};

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
    const id = req.query.id;
    const product = await Product.findOne({ _id: id });
    const category = await Category.find({});

    const brand = await Brand.find({});

    res.render("admin/edit-product", {
      product: product,
      cat: category,
      brand: brand,
    });
  } catch (error) {}
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id; // Product ID from request parameters
    const updatedData = req.body;

    // Check if the product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if a product with the new name already exists (excluding the current product)
    const existingProduct = await Product.findOne({
      productName: updatedData.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res
        .status(400)
        .json({ message: "A product with this name already exists." });
    }

    // Handle image uploads
    const newImages = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const originaImagePath = path.join(
          "public",
          "product-images",
          req.files[i].filename
        );
        const resizedImagePath = path.join(
          "public",
          "resized-images",
          req.files[i].filename
        );
        await sharp(originaImagePath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedImagePath);

        // Replace backslashes with forward slashes
        const imagePath = path.join(req.files[i].filename).replace(/\\/g, "/");
        newImages.push(imagePath);
      }
    }

    // If new images are added, append them to existing images
    let updatedImages = product.productImages;
    if (newImages.length > 0) {
      updatedImages = [...updatedImages, ...newImages];
    }

    // Find the category ObjectId
    const categoryId = await Category.findOne({ name: updatedData.category });
    if (!categoryId) {
      return res.status(400).json({ message: "Invalid category name" });
    }

    // Update the product fields
    const updatedProduct = {
      productName: updatedData.productName,
      description: updatedData.description,
      brand: updatedData.brand,
      category: categoryId._id, // Use the ObjectId of the category
      subCategory: updatedData.subCategory,
      regularPrice: updatedData.regularPrice,
      salePrice: updatedData.salePrice,
      quantity: updatedData.quantity,
      color: updatedData.color,
      productImages: updatedImages,
    };

    // Update the product in the database
    await Product.findByIdAndUpdate(id, updatedProduct, { new: true });

    return res.redirect("/admin/view-products");
  } catch (error) {
    console.error("Error editing product: ", error);
    return res.status(500).json({ message: "Server error" });
  }
};
const deleteProductImage = async (req, res) => {
  try {
    const { productId, imageName } = req.params;

    // Validate productId and imageName
    if (!productId || !imageName) {
      return res.status(400).json({
        success: false,
        message: "Product ID and image name are required.",
      });
    }

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Check if the image exists in the product's productImages array
    const imageIndex = product.productImages.indexOf(imageName);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found in product.",
      });
    }

    // Remove the image from the productImages array
    product.productImages.splice(imageIndex, 1);
    await product.save();

    // Paths to the images in the filesystem
    const imagePath = path.join('public', 'product-images', imageName);
    const resizedImagePath = path.join('public', 'resized-images', imageName);

    // Function to delete a file
    const deleteFile = (filePath) =>
      new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file ${filePath}:`, err);
            return reject(err);
          }
          resolve();
        });
      });

    // Delete the original and resized images
    try {
      await Promise.all([deleteFile(imagePath), deleteFile(resizedImagePath)]);
      return res.status(200).json({
        success: true,
        message: "Image and resized image deleted successfully.",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete one or more image files from the server.",
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the image.",
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
