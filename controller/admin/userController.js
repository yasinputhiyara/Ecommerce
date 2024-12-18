const {User}= require('../../model/User')

const blockUser = async (req,res)=> {

    try {
        let id = req.query.id;
        await User.updateOne({_id :id} , {$set :{isBlocked : true}})
        res.redirect('/admin/view-users')
        
    } catch (error) {
        console.error("User Block Error" , error)
    }

}

const unBlockUser = async (req , res)=>{

    try {
        let id = req.query.id;
        await User.updateOne({_id :id} , {$set :{isBlocked : false}})
        res.redirect('/admin/view-users')
    } catch (error) {
        console.error("User unBlock Error" , error)
        
    }
    
}


module.exports={
    blockUser,
    unBlockUser
}