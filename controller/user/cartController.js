
const {Product} = require("../../model/Product")
const Cart = require('../../model/Cart')

const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).send("User not logged in");
        }

        const productId = req.params.id;
        const { size, quantity, price } = req.body;

        console.log("Product ID:", productId);
        console.log("Selected Size:", size);
        console.log("Quantity:", quantity);
        console.log("Price:", price);

        // Check if the cart exists for the user
        let cart = await Cart.findOne({ userId: user._id });

        if (cart) {
            console.log("Cart already exists");

            // Check if the product and size already exist in the cart
            const itemIndex = cart.items.findIndex(
                item => item.productId.toString() === productId && item.size === size
            );

            if (itemIndex > -1) {
                // Update the quantity if the product and size already exist
                cart.items[itemIndex].quantity += parseInt(quantity);
            } else {
                // Add a new item to the cart
                cart.items.push({
                    productId,
                    size,
                    quantity: parseInt(quantity),
                    price: parseFloat(price)
                });
            }

            await cart.save();
        } else {
            console.log("Creating a new cart");

            // Create a new cart for the user
            cart = new Cart({
                userId: user._id,
                items: [{
                    productId,
                    size,
                    quantity: parseInt(quantity),
                    price: parseFloat(price)
                }]
            });

            await cart.save();
        }

        res.redirect('/cart');
    } catch (error) {
        console.error("Add to cart error", error);
        res.status(500).send("Internal Server Error");
    }
};


const loadCart = async (req, res) => {
    try {
        const user = req.session.user;

        if (!user) {
            return res.redirect('/login');
        }

        // Fetch the cart and populate the productId field
        const cartData = await Cart.findOne({ userId: user._id })
            .populate('items.productId');

        console.log(cartData.items.productId)

        res.render('user/cart', {
            user,
            cartData
        });
    } catch (error) {
        console.error("Error in loadCart", error);
        res.status(500).send("Internal Server Error");
    }
};






module.exports={
    loadCart,
    addToCart
}