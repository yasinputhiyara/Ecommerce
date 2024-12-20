var express = require('express');

const upload = require ('../middleware/multer')
const {adminAuth}= require('../middleware/auth')

const adminController = require('../controller/admin/adminController')
const userController = require('../controller/admin/userController')
const productController = require('../controller/admin/productController')
const categoryController = require ('../controller/admin/categoryController')
const brandcontroller = require('../controller/admin/brandController')

var router = express.Router();

/* GET home page. */
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.verifyLogin)
router.get('/',adminAuth,adminController.loadDashboard)

//-------User-------//
router.get('/view-users',adminAuth ,adminController.viewUsers )
router.get('/update-user/:_id',adminAuth,adminController.loadUpdateUser)
// router.put('/update-user/:_id' , adminController.updateUser)
router.get('/block-user',adminAuth , userController.blockUser);
router.get('/unblock-user',adminAuth ,userController.unBlockUser )


//------Product------///
router.get('/view-products',adminAuth ,productController.loadProducts )
router.get('/add-product',adminAuth, productController.loadAddProduct)
router.post('/add-product',adminAuth,upload.array("images", 4),productController.addProduct)
router.get('/blockProduct',adminAuth ,productController.blockProduct )
router.get('/unblockProduct' ,adminAuth, productController.unblockProduct)

router.get('/edit-product',adminAuth,productController.loadEditProduct);
router.post('/edit-product/:id',adminAuth ,upload.array('images',4), productController.editProduct)



//-----Category------//
router.get('/view-category,adminAuth' ,categoryController.loadCategory )
router.post('/add-category',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
router.get("/listCategory",adminAuth , categoryController.getListCategory);
router.get('/unlistCategory',adminAuth , categoryController.getUnlistCategory)
router.get("/editCategory",adminAuth,categoryController.getEditCategory)


//-------Brand----------//
router.get('/view-brands',brandcontroller.loadBrand)
router.post('/addBrand',upload.single('image'),brandcontroller.addBrand)
router.get('/blockBrand' , brandcontroller.blockBrand)
router.get('/unblockBrand', brandcontroller.unblockBrand)


module.exports = router;
