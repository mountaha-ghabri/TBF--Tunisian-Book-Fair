const express = require('express');  
const router = express.Router();  

// Sample book data (can be replaced with a database query later)  
const books = [  
    { id: 1, title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling" },  
    { id: 2, title: "The Hobbit", author: "J.R.R. Tolkien" },  
    { id: 3, title: "1984", author: "George Orwell" }  
];  

// Sample route - Get all books  
router.get('/', (req, res) => {  
    res.status(200).json(books);  
});  

// Sample route - Get a specific book by ID  
router.get('/:id', (req, res) => {  
    const { id } = req.params;  
    const book = books.find(b => b.id == id); // Find the book by ID (string comparison for safety)  

    if (book) {  
        res.status(200).json(book);  
    } else {  
        res.status(404).json({ error: `Book with ID ${id} not found.` });  
    }  
});  

// Sample route - Add a new book (POST)  
router.post('/', (req, res) => {  
    const { title, author } = req.body;  

    if (!title || !author) {  
        return res.status(400).json({ error: "Title and author are required." });  
    }  

    const newBook = {  
        id: books.length + 1, // Simple ID generation (not optimal for real databases)  
        title,  
        author  
    };  

    books.push(newBook);  
    res.status(201).json(newBook);  
});  

// Sample route - Delete a specific book by ID  
router.delete('/:id', (req, res) => {  
    const { id } = req.params;  
    const bookIndex = books.findIndex(b => b.id == id); // Find the index of the book  

    if (bookIndex !== -1) {  
        const deletedBook = books.splice(bookIndex, 1); // Remove the book from the array  
        res.status(200).json({ message: "Book deleted successfully.", deletedBook });  
    } else {  
        res.status(404).json({ error: `Book with ID ${id} not found.` });  
    }  
});  

// Add other book-related routes here (e.g., update, etc.)  

module.exports = router;
