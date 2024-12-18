
const { Brand, Category, Product } = require('../../model/Product')

const loadProducts = async (req, res) => {
    try {
        const productData = await Product.find({}).populate('category')
        const category = await Category.find({ isListed: true })
        const brand = await Brand.find({ isBlocked: false })

        if (category && brand) {
            res.render('admin/view-products', {
                data: productData,
                cat: category,
                brand: brand

            })
        } else {
            // res.render("error")
            res.send("error")
        }
    } catch (error) {

    }

}

const loadAddProduct = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true })
        const brand = await Brand.find({ isBlocked: false })
        res.render('admin/add-product', {
            cat: category,
            brand: brand
        })

    } catch (error) {
        console.error("Get Add product page error" , error);
    }
}

module.exports = {
    loadProducts,
    loadAddProduct
}