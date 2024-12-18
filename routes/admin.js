var express = require('express');

const adminController = require('../controller/admin/adminController')
const userController = require('../controller/admin/userController')
const productController = require('../controller/admin/productController')
const categoryController = require ('../controller/admin/categoryController')
const brandcontroller = require('../controller/admin/brandController')

var router = express.Router();

/* GET home page. */
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.verifyLogin)

router.get('/',adminController.loadDashboard)

//-------User-------//
router.get('/view-users' ,adminController.viewUsers )
router.get('/update-user/:_id',adminController.loadUpdateUser)
// router.put('/update-user/:_id' , adminController.updateUser)
router.get('/block-user' , userController.blockUser);
router.get('/unblock-user' ,userController.unBlockUser )


//------Product------///
router.get('/view-products' ,productController.loadProducts )
router.get('/add-product', productController.loadAddProduct)


//-----Category------//
router.get('/view-category' ,categoryController.loadCategory )



//-------Brand----------//
router.get('/view-brands',brandcontroller.loadBrand)


module.exports = router;
