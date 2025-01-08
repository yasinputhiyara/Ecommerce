var express = require('express');
const passport = require('passport')
var router = express.Router();
const {Product} = require('../model/Product')

const {userAuth ,isLoggedIn , isLoggedOut}=require('../middleware/auth')
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const profileController = require('../controller/user/profileController')
const {checkBan} = require('../middleware/isBan')

/* GET users listing. */
router.get('/login',isLoggedIn,userController.loadLogin)
router.post('/login',isLoggedIn,userController.verifyLogin)
router.get('/register',isLoggedIn,userController.loadRegister)
router.post('/register' ,isLoggedIn, userController.verifyRegister);
router.get('/otp-verify' ,isLoggedIn, userController.loadOtpPage)
router.post('/verify-otp' ,isLoggedIn, userController.verifyOtp)
router.post('/resend-otp' ,isLoggedIn, userController.resendOtp)

//----- USER PROFILE ROUTES ----//
router.get('/forgot-password',isLoggedIn,profileController.loadForgetPasswordPage)
router.post('/forgot-email-valid',isLoggedIn,profileController.verifyForgetEmail)
router.post('/forgot-pass-otp',isLoggedIn,profileController.verifyOtp)
router.post('/resend-forgot-otp',isLoggedIn,profileController.resendOtp)
router.get('/change-password',isLoggedIn,profileController.loadChangePasswordPage)
router.patch('/reset-password',isLoggedIn,profileController.resetPassword)


router.get('/auth/google',isLoggedIn,passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',isLoggedIn,passport.authenticate('google',{failureRedirect:'/login'}), async (req,res)=>{
    let user = req.user
    console.log(user)
    let products = await Product.find({isBlocked:false})
    res.render('user/home',{user , products})
}) 


router.get('/',userController.loadHome)
router.get('/shop',userController.loadShop)
router.get('/product-details/:id', productController.loadProductDetail)

router.post('/logout', (req, res) => {
    if (req.session.user) {
        delete req.session.user; 
        return res.redirect('/');
    }
    res.redirect('/'); // Default fallback
});



module.exports = router;
