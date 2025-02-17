var express = require('express');

const upload = require ('../middleware/multer')
const {adminAuth}= require('../middleware/auth')

const adminController = require('../controller/admin/adminController')
const userController = require('../controller/admin/userController')
const productController = require('../controller/admin/productController')
const categoryController = require ('../controller/admin/categoryController')
const brandcontroller = require('../controller/admin/brandController')
const orderController = require('../controller/admin/orderController')
const couponController = require('../controller/admin/couponController');
const salesReport = require('../controller/admin/salesReport')
const { MAX } = require('uuid');

var router = express.Router();

/* GET home page. */
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.verifyAdminLogin)
router.get('/',adminAuth,adminController.loadDashboard)

//-------User-------//
router.get('/view-users',adminAuth ,adminController.viewUsers )
router.get('/update-user/:_id',adminAuth,adminController.loadUpdateUser)
// router.put('/update-user/:_id' , adminController.updateUser)
router.get('/block-user',adminAuth , userController.blockUser);
router.get('/unblock-user',adminAuth ,userController.unBlockUser )


//------Product ------///
router.get('/view-products',adminAuth ,productController.loadProducts )
router.get('/add-product',adminAuth, productController.loadAddProduct)
router.post('/add-product',adminAuth,upload.array("images", 4),productController.addProduct)
router.get('/blockProduct',adminAuth ,productController.blockProduct )
router.get('/unblockProduct' ,adminAuth, productController.unblockProduct)
router.get('/edit-product/:id',adminAuth,productController.loadEditProduct);
router.put('/edit-product/:id' ,adminAuth,upload.array('images',4), productController.editProduct)
router.delete('/delete-product-image/:productId/:imageName',adminAuth, productController.deleteProductImage);

router.post('/addProductOffer',adminAuth,productController.addProductOffer)
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer)


//-----Category------//
router.get('/view-category',adminAuth ,categoryController.loadCategory )
router.post('/add-category',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
router.get("/listCategory",adminAuth , categoryController.getListCategory);
router.get('/unlistCategory',adminAuth , categoryController.getUnlistCategory)
router.put('/edit-category/:id',adminAuth,categoryController.editCategory)


//-------Brand----------//
router.get('/view-brands',adminAuth,brandcontroller.loadBrand)
router.post('/addBrand',adminAuth,upload.single('image'),brandcontroller.addBrand)
router.get('/blockBrand',adminAuth , brandcontroller.blockBrand)
router.get('/unblockBrand',adminAuth, brandcontroller.unblockBrand)
router.post('/editBrand',adminAuth,upload.single('image'),brandcontroller.editBrand)


//---------- ORDER MANNAGEMENT --------//
router.get('/view-orders',adminAuth,orderController.viewOrders)

router.get('/order-details/:id',adminAuth,orderController.orderDetails)
router.post('/update-order-status',adminAuth,orderController.updateOrderStatus)
router.post('/handle-return/:productId',adminAuth, orderController.handleReturnRequest)
                                                                                                                                                           

//---------- COUPON MANAGEMENT ----------//
router.get('/view-coupons',adminAuth,couponController.loadCoupons)
router.post('/add-coupon',adminAuth,couponController.addCoupon)   
router.delete('/delete-coupon/:couponId',adminAuth,couponController.deleteCoupon)


router.get('/sales-report',adminAuth, salesReport.getSalesReport)
router.get('/sales-report/pdf',adminAuth, salesReport.getPdf);
router.get('/sales-report/excel',adminAuth, salesReport.getExcel);


router.get('/logout', (req, res) => {
    if (req.session.admin) {
        delete req.session.admin; // Clear only admin session
        return res.redirect('/admin/login');
    }
    res.redirect('/admin/login'); // Default fallback
});



module.exports = router;
