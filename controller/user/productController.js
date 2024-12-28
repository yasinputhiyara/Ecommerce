

const {Brand,Category,Product} = require('../../model/Product')


const loadProductDetail = async (req,res)=>{
    try {
        const productId = req.params.id
        const product = await Product.findById(productId)
        const products = await Product.find({}).limit(4)
        const user = req.session.user

        const totalOffer = 0
        
        res.render('user/view-productDetails',{product:product ,user,totalOffer ,products})
    } catch (error) {
        
    }

}




module.exports={
    loadProductDetail
}