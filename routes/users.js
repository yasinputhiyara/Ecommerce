var express = require('express');
const passport = require('passport')
var router = express.Router();
const {Product} = require('../model/Product')

const {userAuth ,isLoggedIn , isLoggedOut}=require('../middleware/auth')
const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')

/* GET users listing. */
router.get('/login',isLoggedIn,userController.loadLogin)
router.post('/login',isLoggedIn,userController.verifyLogin)
router.get('/register',isLoggedIn,userController.loadRegister)
router.post('/register' ,isLoggedIn, userController.verifyRegister);
router.get('/otp-verify' ,isLoggedIn, userController.loadOtpPage)
router.post('/verify-otp' ,isLoggedIn, userController.verifyOtp)
router.post('/resend-otp' ,isLoggedIn, userController.resendOtp)


router.get('/auth/google',isLoggedIn,passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',isLoggedIn,passport.authenticate('google',{failureRedirect:'/login'}), async (req,res)=>{
    let user = req.user
    console.log(user)
    let products = await Product.find({})
    res.render('user/home',{user , products})
}) 


router.get('/',userController.loadHome)
router.get('/shop',userController.loadShop)
router.get('/product-details/:id', productController.loadProductDetail)


router.post('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.error("logout error",err)
        }else{
            res.redirect('/')
        }
    })
})

module.exports = router;
