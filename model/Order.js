const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  orderedItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      size: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
      orderStatus: {
        type: String,
        required: true,
        default: "Pending",
        enum: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Return Request",
          "Returned",
        ],
      },
      paymentStatus: {
        type: String,
        required: true,
        enum: ["Pending", "Paid", "Refunded", "Failed"],
      },
      cancellationsReason: {
        type: String,
        default: "none",
      },
      returnReason: {
        type: String,
        default: "none",
      },
    },
  ],
  subtotal:{
    type:Number,
    required:true
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  address: {
    addressType: {
      type: String,
      required: true,
      default: "Home",
    },
    name: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    landMark: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    altPhone: {
      type: String,
      required: true,
    },
  },
  orderStatus: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return Request",
      "Returned",
    ],
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cod", "razorpay"],
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ["Pending", "Paid", "Refunded", "Failed"],
  },
  cancellationsReason: {
    type: String,
    default: "none",
  },
  // returnReason: {
  //   type: String,
  //   default: "none",
  // },
  razorpayOrderId: {
    type: String, // Optional, only for Razorpay orders
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  
}, {timestamps:true});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
