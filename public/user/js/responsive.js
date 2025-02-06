// Add this to your existing JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const navbarToggler = document.querySelector('.classy-navbar-toggler');
    const classyMenu = document.querySelector('.classy-menu');
    const closeIcon = document.querySelector('.classycloseIcon');
  
    navbarToggler.addEventListener('click', function() {
      classyMenu.classList.toggle('active');
    });
  
    closeIcon.addEventListener('click', function() {
      classyMenu.classList.remove('active');
    });
  
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!event.target.closest('.classy-navbar') && 
          !event.target.closest('.classy-menu')) {
        classyMenu.classList.remove('active');
      }
    });
  
    // Handle window resize
    window.addEventListener('resize', function() {
      if (window.innerWidth > 991) {
        classyMenu.classList.remove('active');
      }
    });
  });
  
  // Add touch support for dropdowns on mobile
  document.querySelectorAll('.classynav li').forEach(item => {
    item.addEventListener('touchstart', function(e) {
      if (window.innerWidth <= 991) {
        const dropdown = this.querySelector('.megamenu');
        if (dropdown) {
          e.preventDefault();
          dropdown.style.display = 
            dropdown.style.display === 'block' ? 'none' : 'block';
        }
      }
    });
  });


  // Add to your existing search.js
function initializeResponsiveSearch() {
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.querySelector('#headerSearch');
  
    // Handle search on mobile
    if (window.innerWidth <= 767) {
      searchInput.addEventListener('focus', function() {
        searchContainer.style.position = 'fixed';
        searchContainer.style.top = '0';
        searchContainer.style.left = '0';
        searchContainer.style.width = '100%';
        searchContainer.style.padding = '10px';
        searchContainer.style.backgroundColor = 'white';
        searchContainer.style.zIndex = '1000';
      });
  
      searchInput.addEventListener('blur', function() {
        searchContainer.style.position = 'relative';
        searchContainer.style.width = '100%';
        searchContainer.style.padding = '0';
      });
    }
  }
  
  // Initialize responsive search
  window.addEventListener('load', initializeResponsiveSearch);
  window.addEventListener('resize', initializeResponsiveSearch);