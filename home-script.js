// Home page script

// Navigate to comparison page with module
function navigateToComparison(moduleKey) {
    // Store selected module in session storage
    sessionStorage.setItem('selectedModule', moduleKey);
    
    // Redirect to comparison page
    window.location.href = 'comparison.html';
}

// Initialize home page
document.addEventListener('DOMContentLoaded', () => {
    // Add any home page initialization if needed
    console.log('Home page loaded');
});
