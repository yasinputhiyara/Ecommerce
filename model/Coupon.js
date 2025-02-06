
const mongoose = require('mongoose')
const {Schema} = mongoose

const couponSchema = new Schema({
    name: { type: String, required: true, unique: true },
    offerPrice: { type: Number, required: true },
    minPrice: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isList: { type: Boolean, default: true },
    usedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 },
      },
    ],
});

const Coupon = mongoose.model("Coupon",couponSchema)

module.exports=Coupon;