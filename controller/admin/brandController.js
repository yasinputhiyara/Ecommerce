
const {Brand , Category , Product}= require('../../model/Product')

const loadBrand = async (req, res) => {
    try {
        const brandData = await Brand.find({})
        res.render("admin/view-brand", {
            data: brandData,

        });
    } catch (error) {

    }
}

module.exports = {
    loadBrand
}