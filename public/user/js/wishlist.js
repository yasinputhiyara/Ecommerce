

    async function toggleWishlist(productId) {
        try {
            const wishlistIcon = document.getElementById(`wishlist-${productId}`);
            const isInWishlist = wishlistIcon.classList.contains('text-danger'); // Check if red
    
            // Decide the action based on the current state
            const url = isInWishlist ? '/remove-from-wishlist' : '/add-to-wishlist';
            const method = 'POST';
    
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });
    
            const result = await response.json();
    
            if (result.success) {
                // Toggle the icon class
                if (isInWishlist) {
                    wishlistIcon.classList.remove('fa-heart', 'text-danger');
                    wishlistIcon.classList.add('fa-heart-o');
                } else {
                    wishlistIcon.classList.remove('fa-heart-o');
                    wishlistIcon.classList.add('fa-heart', 'text-danger');
                }
    
                Swal.fire({
                    icon: 'success',
                    title: result.message,
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message,
                });
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update wishlist.',
            });
        }
    }

    
    
