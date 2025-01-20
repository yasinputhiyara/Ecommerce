const { Brand, Category, Product } = require("../../model/Product");

const loadCategory = async (req, res) => {
  try {
    const categoryData = await Category.find({});
    res.render("admin/view-category", {
      cat: categoryData,
    });
  } catch (error) {
    console.error("Category load Errro", error);
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const regex = new RegExp(`^${name}$`, "i") 
    const existingCategory = await Category.findOne({ name:regex });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    return res.status(200).json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Add Category Error", error);
  }
};


const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res
        .status(400)
        .json({ status: false, massage: "Category not found" });
    }

    const products = await Product.find({ category: category._id });

    const hasProductOffer = products.some(
      (product) => product.productOffer > percentage
    );

    if (hasProductOffer) {
      return res.json({
        status: false,
        message: "Product within the category already has product offer",
      });
    }

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: percentage } }
    );

    for (const product of products) {
      product.productOffer = 0;
      product.salePrice = product.regularPrice;
      await product.save();
    }

    res.json({ status: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not Found" });
    }

    const percentage = category.categoryOffer;
    const products = await Product.find({ category: category._id });

    if (products.length > 0) {
      for (const product of products) {
        product.salePrice += Math.floor(
          product.regularPrice + percentage / 100
        );
        product.productOffer = 0;
        await product.save();
      }
    }

    category.categoryOffer = 0;

    await category.save();
    res.json({ status: true });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const getListCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect('/admin/view-category');
  } catch (error) {
    console.error("Error listing brand:", error);
    res.status(500).send("An error occurred while listing the brand.");
  }

};

const getUnlistCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect('/admin/view-category');
  } catch (error) {
    console.error("Error listing brand:", error);
    res.status(500).send("An error occurred while listing the brand.");
  }

};


const editCategory = async (req, res) => {
  try {
    const id = req.params.id
    const {  name, description } = req.body;
    console.log(req.body);
    console.log("Category Id " , id);
    // Check if the category exists
    const category = await Category.findOne({_id: id});
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check for duplicate category name
    const regex = new RegExp(`^${name}$`, "i")

    const duplicateCategory = await Category.findOne({ name : regex ,_id: { $ne: id }, });
    if (duplicateCategory) {
      return res.status(400).json({ error: "A category with this name already exists " });
    }

    const updatedData = {
      name: name,
      description: description
    }

    await Category.findByIdAndUpdate(id,updatedData)

    return res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Edit Category Error", error);
    return res.status(500).json({ error: "An error occurred while editing the category" });
  }
};


module.exports = {
  loadCategory,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  getUnlistCategory,
  getListCategory,
  editCategory,
};
