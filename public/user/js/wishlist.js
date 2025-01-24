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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId }),
    });

    const result = await response.json();

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Removed from Wishlist",
        text: result.message,
      });

      // Remove the product row from the DOM
      const row = document.querySelector(`tr[data-product-id="${productId}"]`);
      if (row) row.remove();

      // Check if the wishlist is empty
      const wishlistTableBody = document.querySelector(
        ".table-responsive tbody"
      );
      if (!wishlistTableBody.querySelector("tr[data-product-id]")) {
        wishlistTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <p class="lead mb-4">No items found in Wishlist</p>
                        </td>
                    </tr>
                `;
      }
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
    const isInWishlist = wishlistIcon.classList.contains("text-danger"); // Check if red

    // Decide the action based on the current state
    const url = isInWishlist ? "/remove-from-wishlist" : "/add-to-wishlist";
    const method = "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    const result = await response.json();

    if (result.success) {
      // Toggle the icon class
      if (isInWishlist) {
        wishlistIcon.classList.remove("fa-heart", "text-danger");
        wishlistIcon.classList.add("fa-heart-o");
      } else {
        wishlistIcon.classList.remove("fa-heart-o");
        wishlistIcon.classList.add("fa-heart", "text-danger");
      }

      Swal.fire({
        icon: "success",
        title: result.message,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: result.message,
      });
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
