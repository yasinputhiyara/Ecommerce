var express = require('express');
const passport = require('passport')
var router = express.Router();
const {Product} = require('../model/Product')

const checkBan = require('../middleware/isBan')


const {userAuth ,isLoggedIn , isLoggedOut}=require('../middleware/auth')
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const profileController = require('../controller/user/profileController');
const cartController = require('../controller/user/cartController');
const orderController = require('../controller/user/orderController');
const wishlistController = require('../controller/user/wishlistController');

/* GET users listing. */
router.get('/login',checkBan,isLoggedIn,userController.loadLogin)
router.post('/login',isLoggedIn,userController.verifyLogin)
router.get('/register',checkBan,isLoggedIn,userController.loadRegister)
router.post('/register' ,isLoggedIn, userController.verifyRegister);
router.get('/otp-verify',checkBan ,isLoggedIn, userController.loadOtpPage)
router.post('/verify-otp' ,isLoggedIn, userController.verifyOtp)
router.post('/resend-otp' ,isLoggedIn, userController.resendOtp)

//----- USER FORGOT PASSWORD ROUTES ----//
router.get('/forgot-password',checkBan,isLoggedIn,profileController.loadForgetPasswordPage)
router.post('/forgot-email-valid',isLoggedIn,profileController.verifyForgetEmail)
router.post('/forgot-pass-otp',isLoggedIn,profileController.verifyOtp)
router.post('/resend-forgot-otp',isLoggedIn,profileController.resendOtp)
router.get('/change-password',checkBan,isLoggedIn,profileController.loadChangePasswordPage)
router.patch('/reset-password',isLoggedIn,profileController.resetPassword)


//----- USER PROFILE ROUTES ----//
router.get('/dashboard',checkBan,isLoggedOut,profileController.loadDashboard)
router.get('/update-profile',checkBan,isLoggedOut, profileController.loadProfilePage);
router.get('/address',checkBan,isLoggedOut, profileController.loadAddressPage);
router.get('/wallet',isLoggedOut,profileController.loadWalletPage);

router.post('/add-address',isLoggedOut,profileController.addAddress)
router.get('/get-address/:id',profileController.getAddressById)
router.put('/edit-address',profileController.editAddress)
router.delete('/delete-address/:id',profileController.deleteAddress )



router.put('/profile/update',isLoggedOut,profileController.updateProfile)
router.put('/profile/change-password',isLoggedOut,profileController.updatePassword)

//----- GOOGLE AUTHENTICTION ----//
router.get('/auth/google',isLoggedIn,passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',isLoggedIn,passport.authenticate('google',{failureRedirect:'/login'}), async (req,res)=>{
    let user = req.user
    req.session.user = user
    console.log(user)
    let products = await Product.find({isBlocked:false})
    res.render('user/home',{user , products})
})


router.get('/',checkBan,userController.loadHome)
router.get('/shop',checkBan,userController.loadShop)
router.get('/product-details/:id',checkBan, productController.loadProductDetail)

// router.get('/filter',productController.filterProducts)



//---- CART ROUTES ----//

router.post('/addToCart/:id',cartController.addToCart)
router.get('/cart',checkBan,cartController.loadCart)
router.post('/update-cart', cartController.updateCart)
router.delete('/remove-from-cart/:itemId', cartController.removeFromCart)


//----- CHECKOUT ROUTES ---///

router.get('/checkout' , cartController.loadCheckoutPage)
router.post('/place-order' ,cartController.checkout)
// router.get('/order-success',cartController.loadOrderSuccess)
router.post('/apply-coupon',cartController.applyCoupon)

//-------- RAZORPAY INTEGRATION ---------//
router.post('/create-razorpay-order',cartController.razorpayOrder)
router.post('/verify-razorpay-payment',cartController.razorpayPayment)
router.get('/payment-failed',cartController.paymentFailed)

//------- ORDER ROUTES --------//
router.get('/orders',orderController.loadOrders )
router.get('/order-details/:id',orderController.loadOrderDetails)
router.post('/orders/:orderId/products/:productIndex/cancel',orderController.cancelProduct)
router.post('/orders/:orderId/cancel', orderController.cancelOrder);
router.get('/validateCartStock', cartController.validateCartStock)


//----------  WISHLIST MANAGEMENT -----------//
router.get('/wishlist',wishlistController.loadWishlist)
router.post('/add-to-wishlist',wishlistController.addToWishlist)
router.post('/remove-from-wishlist',wishlistController.removeFromWishlist)
router.post('/wishlist/remove',wishlistController.removeFromWishlist)

router.get('/wishlist/check',wishlistController.isProductInWishlist)




//---- LOGOUT ROUTES ----//
router.get('/logout', (req, res) => {
    if (req.session.user) {
        delete req.session.user; 
        return res.redirect('/');
    }
    res.redirect('/'); // Default fallback
});



module.exports = router;
