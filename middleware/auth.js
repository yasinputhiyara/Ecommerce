
const { response } = require('express');
const {User} = require('../model/User')

const userAuth = async (req, res, next) => {
    try {
      if(req.session.user){
        res.redirect('/')
      }else{
        next()
      }
    } catch (error) {
      console.error("Error in userAuth middleware:", error.message || error);
      return res.status(500).send("Internal Server Error");
    }
  };

const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect("/");
    }
    next();
}

const isLoggedOut = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
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
    adminAuth,
    isLoggedIn,
    isLoggedOut
}
