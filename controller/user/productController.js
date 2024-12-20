

const {Brand,Category,Product} = require('../../model/Product')


const loadProductDetail = async (req,res)=>{
    try {
        
        res.render('user/view-productDetails')
    } catch (error) {
        
    }

}


module.exports={
    loadProductDetail
}