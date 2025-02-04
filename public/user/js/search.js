document.getElementById("searchForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const query = document.getElementById("headerSearch").value;
    const category = document.getElementById("searchCategory").value;

    const url = `/search?query=${query}&category=${category}`;

    try {
        const response = await fetch(url);
        const results = await response.json();

        const resultsDiv = document.getElementById("searchResults");
        resultsDiv.innerHTML = "";
        resultsDiv.classList.add('active');

        if (results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="suggestion-item">
                    <p class="suggestion-name">No results found.</p>
                </div>`;
            return;
        }

        results.forEach(product => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <img class="suggestion-image" 
                     src="/product-images/${product.productImages[0]}" 
                     alt="${product.productName}"
                     onerror="this.src='/path/to/placeholder.jpg'">
                <span class="suggestion-name">${product.productName}</span>
            `;
            
            suggestionItem.addEventListener('click', () => {
                window.location.href = `/product-details/${product._id}`;
            });
            
            resultsDiv.appendChild(suggestionItem);
        });
    } catch (error) {
        console.error('Error fetching search results:', error);
    }
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    const searchResults = document.getElementById("searchResults");
    const searchArea = document.querySelector(".search-area");
    
    if (!searchArea.contains(e.target)) {
        searchResults.classList.remove("active");
    }
});

// Basic Search UI
document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    
    searchForm.innerHTML = `
        <div class="search-form-container pt-4">
            <div class="search-input-group">
                <input type="search" id="headerSearch" placeholder="Search products...">
                <select id="searchCategory">
                    <option value="">All Categories</option>
                    <option value="mens">Mens</option>
                    <option value="womens">Womens</option>
                    <option value="kids">Kids</option>
                </select>
            </div>
            <button type="submit">
                <i class="fa fa-search" aria-hidden="true"></i>
            </button>
        </div>
    `;
});


document.addEventListener('click', (e) => {
    const searchResults = document.getElementById('searchResults');
    const searchForm = document.getElementById('searchForm');

    if (!searchForm.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});