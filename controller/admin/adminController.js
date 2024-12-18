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

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin user with the provided username
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            // Compare the provided password with the hashed password in the database
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                // Store admin session and redirect to dashboard
                req.session.admin = true;
                return res.redirect('/admin');
            } else {
                // Invalid password
                req.session.error = 'Invalid username or password';
                return res.redirect('/admin/login');
            }
        } else {
            // Username not found
            req.session.error = 'Invalid username or password';
            return res.redirect('/admin/login');
        }
    } catch (err) {
        console.error('Error verifying login:', err);
        return res.redirect('/error'); // Redirect to error page on failure
    }
}

const loadDashboard = async (req, res) => {
    try {

        res.render('admin/dashboard')
    } catch (error) {

    }
}

const viewUsers = async (req, res) => {
    try {
        const users = await User.find({})
        res.render('admin/view-users', { users })

    } catch (error) {

    }
}

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
    verifyLogin,
    loadDashboard,
    viewUsers,
    loadUpdateUser,
    // updateUser

}