const {User} = require('../model/User'); // Import the user schema

let checkBan = async (req, res, next) => {
  try {
    
    if (req.session.loggedIn) {
        
      const email = req.session?.currentEmail || req.session?.userData?.email;

      // Ensure email exists in the session
      if (!email) {
        console.log("No email found in session.");
        return res.redirect('/signin'); // Redirect to login if email is missing
      }

      // Find the user in the database
      const user = await User.findOne({ email: email });

      // Check if the user exists and is blocked
      if (user && user.isBlocked) {
        console.log(`User ${email} is blocked`);
        return res.render('banPage', {
          message: "Your account has been blocked. Please contact support.",
        });
      }
    }
    // Proceed if the user is not blocked or not logged in
    next();
  } catch (error) {
    console.error("Error in checkBan middleware:", error);
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  checkBan
}