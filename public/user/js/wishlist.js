// async function addToWishlist(productId) {
//     try {
//         console.log("Add to wishlist called")
//         const response = await fetch('/add-to-wishlist', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ productId }),
//         });

//         const result = await response.json();

//         if (result.success) {
//             Swal.fire({
//                 icon: 'success',
//                 title: 'Added to Wishlist',
//                 text: result.message,
//             });
//         } else {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Error',
//                 text: result.message,
//             });
//         }
//     } catch (error) {
//         console.error('Error adding to wishlist:', error);
//         Swal.fire({
//             icon: 'error',
//             title: 'Error',
//             text: 'Failed to add product to wishlist.',
//         });
//     }
// }

async function removeFromWishlist(productId) {
  try {
    const response = await fetch("/wishlist/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    const result = await response.json();

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Removed from Wishlist",
        text: result.message,
      }).then(() => {
        location.reload(); // 🔄 Reload after confirmation
      });

    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: result.message,
      });
    }
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to remove product from wishlist.",
    });
  }
}

async function toggleWishlist(productId) {
  try {
    const wishlistIcon = document.getElementById(`wishlist-${productId}`);

    if (!wishlistIcon) {
      console.error(`Element #wishlist-${productId} not found`);
      return;
    }

    const isInWishlist = wishlistIcon.classList.contains("text-danger");
    const url = isInWishlist ? "/remove-from-wishlist" : "/add-to-wishlist";

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    // 🔥 Debugging Step: Log response before JSON parsing
    const responseText = await response.text();
    console.log("Raw Response:", responseText);

    // Check if response is HTML (which means redirect/error occurred)
    if (responseText.startsWith("<!DOCTYPE html>")) {
      throw new Error("Received an HTML response instead of JSON. Possible redirect or server error.");
    }

    const result = JSON.parse(responseText);

    if (result.success) {
      wishlistIcon.classList.toggle("fa-heart", !isInWishlist);
      wishlistIcon.classList.toggle("text-danger", !isInWishlist);
      wishlistIcon.classList.toggle("fa-heart-o", isInWishlist);

      Swal.fire({
        icon: "success",
        title: result.message,
        showConfirmButton: false,
        timer: 1500,
      });
    } else {
      if (result.message === "User not logged in.") {
        Swal.fire({
          icon: "error",
          title: "Login Required",
          text: "Please log in to add products to your wishlist.",
          confirmButtonText: "Login",
        }).then(() => {
          window.location.href = "/login";
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result.message,
        });
      }
    }
  } catch (error) {
    console.error("Error toggling wishlist:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to update wishlist.",
    });
  }
}


