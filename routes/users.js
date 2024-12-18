var express = require('express');
const passport = require('passport')
var router = express.Router();

const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')

/* GET users listing. */
router.get('/login',userController.loadLogin)
router.post('/login',userController.verifyLogin)
router.get('/register',userController.loadRegister)
router.post('/register' , userController.verifyRegister);
router.get('/otp-verify' , userController.loadOtpPage)
router.post('/verify-otp' , userController.verifyOtp)
router.post('/resend-otp' , userController.resendOtp)



router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
    res.redirect('/')
}) 


router.get('/',userController.loadHome)
router.get('/shop',userController.loadShop)
router.get('/product-details', productController.loadProductDetail)



module.exports = router;
