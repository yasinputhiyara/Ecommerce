

const {Brand,Category,Product} = require('../../model/Product')


// const loadProductDetail = async (req, res) => {
//     try {
//         const productId = req.params.id;
//         const product = await Product.findById(productId).populate('category');
//         const products = await Product.find({}).limit(4);
//         const user = req.session.user;
//         const category = await Category.findOne({})

//         const similarProducts = await Product.find({}).limit(4)
        
//         res.render('user/view-productDetails', {
//             product,
//             user,
//             similarProducts,
//             products

//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// };


// const loadProductDetail = async (req, res) => {
//     try {
//         const productId = req.params.id;
//         const product = await Product.findById(productId)
//             .populate('category')
//             // .populate('reviews.userId')
//             .populate('variants');
            
//         const similarProducts = await Product.find({
//             category: product.category,
//             _id: { $ne: product._id }
//         }).limit(4);

//         // Calculate average rating
//         // const averageRating = product.reviews.reduce((acc, review) => 
//         //     acc + review.rating, 0) / (product.reviews.length || 1);
        
//         res.render('user/view-productDetails', {
//             product: {
//                 ...product._doc,
//                 // averageRating
//             },
//             user: req.session.user,
//             products:similarProducts
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// };

const loadProductDetail = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).populate('category');

        // Dummy discount/coupon data
        const dummyDiscounts = [
            {
                code: "SUMMER25",
                value: 25,
                validUntil: new Date('2025-08-31')
            },
            {
                code: "NEWUSER10",
                value: 10,
                validUntil: new Date('2025-12-31')
            },
            {
                code: "FLASH50",
                value: 50,
                validUntil: new Date('2025-02-01')
            }
        ];

        // Dummy review data
        const dummyReviews = [
            {
                userName: "John Smith",
                rating: 5,
                comment: "Excellent product! The quality exceeded my expectations. Would definitely recommend to others.",
                createdAt: new Date('2024-12-15')
            },
            {
                userName: "Sarah Johnson",
                rating: 4,
                comment: "Great fit and comfortable material. Shipping was fast too.",
                createdAt: new Date('2024-12-10')
            },
            {
                userName: "Mike Brown",
                rating: 3,
                comment: "Decent product for the price. Could be better in terms of durability.",
                createdAt: new Date('2024-12-05')
            }
        ];

        

        // Calculate average rating
        const averageRating = dummyReviews.reduce((acc, review) => 
            acc + review.rating, 0) / dummyReviews.length;

        // Combine real product data with dummy data
        const enrichedProduct = {
            ...product._doc,
            discounts: dummyDiscounts,
            reviews: dummyReviews,
            averageRating: averageRating
        };

        const similarProducts = await Product.find({_id:{$ne:productId } , category:product.category}).limit(4);

        res.render('user/view-productDetails', {
            product: enrichedProduct,
            user: req.session.user,
            products:similarProducts
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};



  
  
  


module.exports={
    loadProductDetail
}

