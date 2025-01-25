
const mongoose = require('mongoose')
const {Schema} = mongoose


const couponSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    startDate:{
        type:Date,
        // default:Date.now,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    minPrice:{
        type:Number,
        reqired:true
    },
    offerPrice:{
        type:Number,
        required:true
    },
    
    isList:{
        type:Boolean,
        default:true
    },
    userId:[{
      type: mongoose.Schema.Types.ObjectId,
      ref:"User",     

    }]


})

const Coupon = mongoose.model("Coupon",couponSchema)

module.exports=Coupon;