const mongoose = require("mongoose");
const { Catergory } = require("./Product");

const usersSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique:false
    },
    phone:{
      type:String,
      required: false,
      unique:false,
      sparse:true,
      default:null
    },
    googleId:{
      type:String,
      unique:true,
      sparse: true, 
    },
    password: {
      type: String,
      reguired: false,
    },
    isBlocked:{
      type:Boolean,
      // required:false,
      default:false
    },
    isAdmin:{
      type:Boolean,
      default:false
    },
    cart:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:'Cart',
    }], 
    wallet:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'Wishlist'
    },
    orderHistory:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:'Order'

    }],
    createdOn :{
      type:Date,
      default:Date.now,

    },
    referalCode:{
      type:String
    },
    referalCode:{
      type:Boolean
    },
    redeemedUsers:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User"
    }],
    searchHistory:[{
      category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category"
      },
      brand:{
        type:String,
        
      },
      searchOn:{
        type:Date,
        default:Date.now
      }
    }],

    // role : {
    //   type:String,
    //   require:true,
    //   enum:["user" ,"admin"],
    //   default:"user"

    // }
  }
  );

  const User = new mongoose.model("User", usersSchema);

  module.exports={
    User
  }