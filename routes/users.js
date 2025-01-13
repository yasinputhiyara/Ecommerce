var express = require('express');
const passport = require('passport')
var router = express.Router();
const {Product} = require('../model/Product')

const checkBan = require('../middleware/isBan')


const {userAuth ,isLoggedIn , isLoggedOut}=require('../middleware/auth')
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const profileController = require('../controller/user/profileController');
const cartController = require('../controller/user/cartController')

/* GET users listing. */
router.get('/login',isLoggedIn,userController.loadLogin)
router.post('/login',isLoggedIn,userController.verifyLogin)
router.get('/register',isLoggedIn,userController.loadRegister)
router.post('/register' ,isLoggedIn, userController.verifyRegister);
router.get('/otp-verify' ,isLoggedIn, userController.loadOtpPage)
router.post('/verify-otp' ,isLoggedIn, userController.verifyOtp)
router.post('/resend-otp' ,isLoggedIn, userController.resendOtp)

//----- USER FORGOT PASSWORD ROUTES ----//
router.get('/forgot-password',isLoggedIn,profileController.loadForgetPasswordPage)
router.post('/forgot-email-valid',isLoggedIn,profileController.verifyForgetEmail)
router.post('/forgot-pass-otp',isLoggedIn,profileController.verifyOtp)
router.post('/resend-forgot-otp',isLoggedIn,profileController.resendOtp)
router.get('/change-password',isLoggedIn,profileController.loadChangePasswordPage)
router.patch('/reset-password',isLoggedIn,profileController.resetPassword)


//----- USER PROFILE ROUTES ----//
router.get('/dashboard',isLoggedOut,profileController.loadDashboard)
router.get('/update-profile',isLoggedOut, profileController.loadProfilePage);
router.get('/address', profileController.loadAddressPage);
router.get('/wallet',isLoggedOut,profileController.loadWalletPage);

router.post('/add-address',profileController.addAddress)

router.put('/profile/update',isLoggedOut,profileController.updateProfile)
router.put('/profile/change-password',isLoggedOut,profileController.updatePassword)

//----- GOOGLE AUTHENTICTION ----//
router.get('/auth/google',isLoggedIn,passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',isLoggedIn,passport.authenticate('google',{failureRedirect:'/login'}), async (req,res)=>{
    let user = req.user
    console.log(user)
    let products = await Product.find({isBlocked:false})
    res.render('user/home',{user , products})
})


router.get('/',checkBan,userController.loadHome)
router.get('/shop',checkBan,userController.loadShop)
router.get('/product-details/:id', productController.loadProductDetail)


//---- CART ROUTES ----//

router.post('/addToCart/:id',cartController.addToCart)
router.get('/cart',cartController.loadCart)



//---- LOGOUT ROUTES ----//
router.get('/logout', (req, res) => {
    if (req.session.user) {
        delete req.session.user; 
        return res.redirect('/');
    }
    res.redirect('/'); // Default fallback
});



module.exports = router;
