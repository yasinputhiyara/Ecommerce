// Purpose: Check if the user is logged in when accessing the cart.
        document.addEventListener("DOMContentLoaded", () => {
            const cartButton = document.getElementById("essenceCartBtn");

            cartButton.addEventListener("click", async (event) => {
                event.preventDefault(); // Prevent default navigation

                try {
                    const response = await fetch("/cart", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });

                    if (response.status === 401) {
                        // Show SweetAlert if the user is not logged in
                        Swal.fire({
                            icon: "warning",
                            title: "Not Logged In",
                            text: "You need to log in to access your cart.",
                            confirmButtonText: "Login",
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = "/login"; // Redirect to the login page
                            }
                        });
                    } else {
                        // Redirect to the cart page if the user is logged in
                        window.location.href = "/cart";
                    }
                } catch (error) {
                    console.error("Error checking cart access:", error);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "An unexpected error occurred. Please try again later.",
                    });
                }
            });
        });


        document.addEventListener("DOMContentLoaded", () => {
            const cartButton = document.getElementById("wishlistBtn");

            cartButton.addEventListener("click", async (event) => {
                event.preventDefault(); // Prevent default navigation

                try {
                    const response = await fetch("/wishlist", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });

                    if (response.status === 401) {
                        // Show SweetAlert if the user is not logged in
                        Swal.fire({
                            icon: "warning",
                            title: "Not Logged In",
                            text: "You need to log in to access your wishlist.",
                            confirmButtonText: "Login",
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = "/login"; // Redirect to the login page
                            }
                        });
                    } else {
                        // Redirect to the cart page if the user is logged in
                        window.location.href = "/wishlist";
                    }
                } catch (error) {
                    console.error("Error checking wishlist access:", error);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "An unexpected error occurred. Please try again later.",
                    });
                }
            });
        });


        document.addEventListener("DOMContentLoaded", () => {
            const cartButton = document.getElementById("checkoutBtn");

            cartButton.addEventListener("click", async (event) => {
                event.preventDefault(); // Prevent default navigation

                try {
                    const response = await fetch("/checkout", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });

                    if (response.status === 401) {
                        // Show SweetAlert if the user is not logged in
                        Swal.fire({
                            icon: "warning",
                            title: "Not Logged In",
                            text: "You need to log in to access your checkout.",
                            confirmButtonText: "Login",
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = "/login"; // Redirect to the login page
                            }
                        });
                    }else if(response.status == 402){ 
                        Swal.fire({
                            icon: "warning",
                            title: "Cart is Empty",
                            text: "You need to add items to cart to access checkout.",
                            confirmButtonText: "Shop Now",
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = "/shop"; // Redirect to the login page
                            }
                        })
                    } else {
                        // Redirect to the cart page if the user is logged in
                        window.location.href = "/checkout";
                    }
                } catch (error) {
                    console.error("Error checking wishlist access:", error);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "An unexpected error occurred. Please try again later.",
                    });
                }
            });
        });



