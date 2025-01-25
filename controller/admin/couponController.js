const Coupon = require("../../model/Coupon");

const loadCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.render("admin/view-coupon", { coupons });
  } catch (error) {
    console.error("Error loading coupons:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addCoupon = async (req, res) => {
  try {
    const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;
    console.log("Coupon data:", req.body);

    // Validate input data
    if (!couponName || !startDate || !endDate || !offerPrice || !minimumPrice) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingCoupon = await Coupon.findOne({name: couponName});
    if (existingCoupon) {
      return res.status(400).json({ error: "Coupon name already exists" });
    }

    const newCoupon = new Coupon({
        name: couponName,
        startDate: startDate,
        endDate: endDate,
        offerPrice,
        minPrice: minimumPrice,
        // userId: userId || [],
      });
  
      await newCoupon.save();

      console.log("Coupon added successfully:", newCoupon);
  
    // res.status(201).json({ message: "Coupon added successfully", coupon: newCoupon });
    res.redirect("/admin/view-coupons");
  } catch (error) {
    console.error("Error adding coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    console.log("Coupon ID:", couponId);

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

    if (!deletedCoupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon deleted successfully" });

  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loadCoupons,
  addCoupon,
  deleteCoupon
};
