const express = require("express");
const fs = require("fs");
const router = express.Router();

// Path to JSON file
const booksFilePath = "C:\\Users\\HP\\Desktop\\BOOK FAIR  -TUNISIA\\books-to-scrape-web-scraper-main\\data_sheet\\books_data.json";

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

module.exports = router;