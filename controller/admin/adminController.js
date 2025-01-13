const { User } = require('../../model/User')
const bcrypt = require('bcrypt');


const loadLogin = async (req, res) => {
    try {

        const error = req.session.error || null;
        req.session.error = null;

        if (req.session.admin) {
            return res.redirect('/admin')
        }

        res.render('admin/login', { error })
    } catch (error) {
        console.error('Error Admin Login', error)

    }
}

const verifyAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Ensure admin login
        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            req.session.error = 'Invalid email or password';
            return res.redirect('/admin/login');
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            req.session.error = 'Invalid email or password';
            return res.redirect('/admin/login');
        }

        // Store admin session
        req.session.admin = {
            _id: admin._id,
            username: admin.username,
            email: admin.email,
        };
        res.redirect('/admin');
    } catch (err) {
        console.error('Admin Login Error:', err);
        res.status(500).send("Internal Server Error");
    }
};


const loadDashboard = async (req, res) => {
    try {

    res.render('admin/dashboard')
    } catch (error) {

    }
}

const viewUsers = async (req, res) => {
    try {
      // Extract search query and page number from query parameters
      const searchQuery = req.query.search || ""; // Search query from the URL, defaulting to an empty string
      const page = parseInt(req.query.page) || 1; // Page number, defaulting to 1 if not provided
      const limit = 5; // Number of users per page
      const skip = (page - 1) * limit; // Skip calculation for pagination
  
      // Build the search filter for the query
      const searchFilter = searchQuery
        ? { username: { $regex: searchQuery, $options: "i" } } // Case-insensitive search for username
        : {}; // Empty filter if no search query is provided
  
      // Fetch the users with the search filter, sorting by creation date, and paginated
      const users = await User.find(searchFilter)
        .sort({ createdOn: -1 }) // Sort by creation date in descending order
        .skip(skip) // Skip records for pagination
        .limit(limit); // Limit the number of records per page
  
      // Get the total count of users for pagination calculation
      const totalUsers = await User.countDocuments(searchFilter); // Total number of users matching the search filter
      const totalPages = Math.ceil(totalUsers / limit); // Total number of pages
  
      // Render the view with users, search query, pagination details, and other necessary data
      res.render('admin/view-users', {
        users,
        searchQuery, // Pass the search query to the template
        currentPage: page, // Current page number
        totalPages, // Total pages for pagination
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("An error occurred while fetching users");
    }
  };
  

const loadUpdateUser = async (req, res) => {
    try {
        const userId = req.params._id
        const user = await User.findOne({_id:userId})
        res.render('admin/update-user',{userId , user})

    } catch (error) {

    }
}

// const updateUser = async (req, res) => {
//     try {
//         const userId = req.params._id;
//         const { username, email } = req.body

//         const updatedUser = await User.findByIdAndUpdate(
//             { _id: userId },
//             { username, email },
//             { new: true, runValidators: true }
//         );

//         console.log(updatedUser)
//         res.redirect("/admin/view-users")
//     } catch (error) {
//         console.error('Error updating user:', error);


//     }
// }

module.exports = {
    loadLogin,
    verifyAdminLogin,
    loadDashboard,
    viewUsers,
    loadUpdateUser,
    // updateUser

}