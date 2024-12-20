const { Brand, Category, Product } = require("../../model/Product");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const loadProducts = async (req, res) => {
  try {
    const productData = await Product.find({}).populate("category");
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("admin/view-products", {
        data: productData,
        cat: category,
        brand: brand,
      });
    } else {
      // res.render("error")
      res.send("error");
    }
  } catch (error) {}
};

const loadAddProduct = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
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
        const imagePath = path
          .join(req.files[i].filename)
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
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    const data = req.body;

    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res
        .status(400)
        .json({ error: "Product with this name already exist " });
    }

    const images = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: product.category,
      subCategory : data.subCategory,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      size: data.size,
      color: data.color,
    };

    if (images.length > 0) {
      updateFields.$push = { productImages: { $each: images } };
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      images.length > 0
        ? { $set: updateFields, $push: updateFields.$push }
        : { $set: updateFields },
      { new: true }
    );

    res.redirect("/admin/view-products");
  } catch (error) {}
};

module.exports = {
  loadProducts,
  loadAddProduct,
  addProduct,
  blockProduct,
  unblockProduct,
  loadEditProduct,
  editProduct,
};
