const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Path to JSON file (relative path)
const booksFilePath = path.join(__dirname, 'data_sheet', 'books_data.json');

// GET: Fetch all books
router.get("/", (req, res) => {
    fs.readFile(booksFilePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading the books JSON file:", err.message);
            return res.status(500).json({ error: "Error reading the books JSON file" });
        }

        try {
            const books = JSON.parse(data);
            res.status(200).json(books);
        } catch (parseErr) {
            console.error("Error parsing the books JSON file:", parseErr.message);
            res.status(500).json({ error: "Error parsing the books JSON file" });
        }
    });
});

// GET: Search for books by title
router.get("/search/:title", (req, res) => {
    const { title } = req.params;

    fs.readFile(booksFilePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading the books JSON file:", err.message);
            return res.status(500).json({ error: "Error reading the books JSON file" });
        }

        try {
            const books = JSON.parse(data);
            const foundBooks = books.filter(book => book.Title.toLowerCase().includes(title.toLowerCase()));

            if (foundBooks.length === 0) {
                return res.status(404).json({ message: `No books found with title: ${title}` });
            }

            res.status(200).json(foundBooks);
        } catch (parseErr) {
            console.error("Error parsing the books JSON file:", parseErr.message);
            res.status(500).json({ error: "Error parsing the books JSON file" });
        }
    });
});

// GET: Search for books by rating (rating >= desired rating)
router.get("/search/rating/:rating", (req, res) => {
    const { rating } = req.params;

    fs.readFile(booksFilePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading the books JSON file:", err.message);
            return res.status(500).json({ error: "Error reading the books JSON file" });
        }

        try {
            const books = JSON.parse(data);
            const foundBooks = books.filter(book => book.Rating >= parseInt(rating));

            if (foundBooks.length === 0) {
                return res.status(404).json({ message: `No books found with rating >= ${rating}` });
            }

            res.status(200).json(foundBooks);
        } catch (parseErr) {
            console.error("Error parsing the books JSON file:", parseErr.message);
            res.status(500).json({ error: "Error parsing the books JSON file" });
        }
    });
});

module.exports = router;
