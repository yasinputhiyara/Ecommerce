
const { response } = require('express');
const {User} = require('../model/User')

const userAuth = (req,res,next)=>{

    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){

                next();
            }else{
                res.redirect('/login')
            }
        }).catch(error=>{
            console.log("Error in user auth middleware")
            res.status(500).send("Internal Server Error")
            
        })
    }else{
        res.redirect('/login')
    }
}

const adminAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        // Check if user is admin
        User.findOne({ isAdmin: true })
            .then(user => {
                if (user) {
                    next(); // Proceed if admin
                } else {
                    res.redirect("/admin/login");
                }
            })
            .catch(error => {
                console.log("Error in adminAuth middleware:", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect("/admin/login"); // No session, redirect to login
    }
};
 
module.exports ={
    userAuth,
    adminAuth
}
