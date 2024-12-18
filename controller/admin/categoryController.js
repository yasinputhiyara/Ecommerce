

const {Brand,Category,Product}= require('../../model/Product')

const loadCategory = async (req , res)=>{
    try {
        const categoryData = await Category.find({})
        res.render("admin/view-category", {
            cat: categoryData,

        });
    } catch (error) {
        console.error("Category load Errro" , error);
        
    }
}

module.exports={
    loadCategory
}