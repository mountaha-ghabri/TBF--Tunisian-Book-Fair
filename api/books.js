const express = require('express');  
const router = express.Router();  

// Sample route - Get all books  
router.get('/', (req, res) => {  
    // Replace with actual book data fetching logic  
    res.status(200).json([{ title: "Harry Potter and the Chamber of Secrets", author: "JK Rowling" }]);  
});  

// Sample route - Get a specific book by ID  
router.get('/:id', (req, res) => {  
    const { id } = req.params;  
    // Replace with actual logic to get book by ID  
    res.status(200).json({ id, title: "Harry Potter and the Chamber of Secrets", author: "JK Rowling" });  
});  

// Add other book-related routes here (e.g., POST, DELETE, etc.)  

module.exports = router;
