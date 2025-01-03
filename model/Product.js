const mongoose = require("mongoose");
const {Schema} = mongoose

const productsSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice:{
        type : Number,
        required:true
    },
    brand:{
        type: String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:'Category',
        required:true        
        
    },
    subCategory:{
        // type:Schema.Types.ObjectId,
        // ref:'SubCategory',
        type:String,
        required:true
    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        default:0
    },
    color:{
        type:String,
        required:true
    },
    description: {
        type: String,
        required: true,
    },
    productImages: {
        type: [String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        required:true,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of Stock" , "Discountinued"],
        required:true,
        default:"Available"
    }, 
    
}, { timestamps: true }
);


const categorySchema = new mongoose.Schema({
    // productName: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "product",
    //     required: true,
    // },
    name: {
        type: String,
        required: true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true

    },
    categoryOffer:{
        type:Number,
        default:0
    }
}, { timestamps: true }
);  

// const subCategorySchema = new mongoose.Schema({
//     name: {
//         type: String,
//         required: true,
//         unique:true
//     },
//     isListed:{
//         type:Boolean,
//         default:true

//     }

// },{timestamps:true})


const brandSchema = new mongoose.Schema({
    brandName: {
        type: String,
        required:true,
    },
    brandImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    }


}, { timestamps: true })


const Product = new mongoose.model("Product", productsSchema);
const Category = new mongoose.model("Category", categorySchema);
const Brand = new mongoose.model('Brand', brandSchema);

module.exports = {
    Product,
    Category,
    Brand
}