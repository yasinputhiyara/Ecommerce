const { Brand, Category, Product } = require("../../model/Product");

const loadBrand = async (req, res) => {
  try {
    const brandData = await Brand.find({});
    res.render("admin/view-brand", {
        errorMessage:null,
      data: brandData,
    });
  } catch (error) {}
};

const addBrand = async (req, res) => {
    try {
      const brand = req.body.name;
      const findBrand = await Brand.findOne({ brandName: brand });
  
      if (findBrand) {
        // Brand already exists, send an error message
        return res.render("admin/view-brand", {
          errorMessage: "Brand already exists!",
          data: await Brand.find({}),
        });
      } else {
        const image = req.file.filename;
        const newBrand = new Brand({
          brandName: brand,
          brandImage: image,
        });
  
        await newBrand.save();
        res.redirect("/admin/view-brands");
      }
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error");
    }
};
  

const blockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/view-brands");
  } catch (error) {}
};
const unblockBrand = async (req, res) => {
  const id = req.query.id;
  await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
  res.redirect("/admin/view-brands");
};

module.exports = {
  loadBrand,
  addBrand,
  blockBrand,
  unblockBrand
};
