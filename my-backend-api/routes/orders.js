const express = require("express");
const fs = require("fs");
const router = express.Router();

// Paths to JSON files
const booksFilePath = "C:\\Users\\HP\\Desktop\\BOOK FAIR  -TUNISIA\\books-to-scrape-web-scraper-main\\data_sheet\\books_data.json";
const ordersFilePath = "C:\\Users\\HP\\Desktop\\BOOK FAIR  -TUNISIA\\books-to-scrape-web-scraper-main\\data_sheet\\orders.json";

// POST: Submit an order for unavailable books
router.post("/", (req, res) => {
    const { title, author, readerName, readerContact } = req.body;

    // Validate required fields
    if (!title || !author || !readerName || !readerContact) {
        return res.status(400).json({ error: "All fields are required: title, author, readerName, readerContact." });
    }

    // Step 1: Read the books data
    console.log("Reading books data from:", booksFilePath); // Debugging the file path
    fs.readFile(booksFilePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading books JSON file:", err.message);
            return res.status(500).json({ error: "Error reading the books JSON file" });
        }

        let books = [];
        try {
            books = JSON.parse(data);
        } catch (parseErr) {
            console.error("Error parsing books JSON file:", parseErr.message);
            return res.status(500).json({ error: "Error parsing the books JSON file" });
        }

        // Step 2: Check if the book exists
        const book = books.find(b => b.Title.toLowerCase() === title.toLowerCase() && b.Availability.toLowerCase() === "in stock");

        if (book) {
            // If the book is in stock, respond with availability message
            return res.status(200).json({
                message: "The book is available in our collection.",
                book: book
            });
        }

        // Step 3: If the book is not in stock, check for previous orders
        console.log("Reading orders data from:", ordersFilePath); // Debugging the file path
        fs.readFile(ordersFilePath, "utf8", (ordersErr, ordersData) => {
            if (ordersErr) {
                console.error("Error reading orders JSON file:", ordersErr.message);
                return res.status(500).json({ error: "Error reading the orders JSON file" });
            }

            let orders = [];
            try {
                orders = JSON.parse(ordersData);
            } catch (parseOrdersErr) {
                console.warn("Orders file was empty or invalid, creating a new one.");
            }

            // Check if the book has already been ordered by the user
            const existingOrder = orders.find(order => order.title.toLowerCase() === title.toLowerCase() && order.readerName.toLowerCase() === readerName.toLowerCase());

            if (existingOrder) {
                // Increment the request count for existing order
                existingOrder.requestCount += 1;

                // Update the orders file with the incremented count
                fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error("Error writing to orders JSON file:", writeErr.message);
                        return res.status(500).json({ error: "Error saving the order" });
                    }

                    console.log("Order updated successfully:", existingOrder);
                    return res.status(200).json({
                        message: "You have already requested this book, and your order count has been incremented.",
                        order: existingOrder
                    });
                });
            } else {
                // Create a new order if the book is unavailable
                const newOrder = {
                    title,
                    author,
                    readerName,
                    readerContact,
                    orderDate: new Date().toISOString(),
                    requestCount: 1, // Start with 1 request count
                    availabilityStatus: "Not in stock"
                };

                orders.push(newOrder);

                // Step 4: Write the new order to the orders file
                fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error("Error writing to orders JSON file:", writeErr.message);
                        return res.status(500).json({ error: "Error saving the order" });
                    }

                    console.log("New order saved:", newOrder);
                    return res.status(201).json({
                        message: "The book is not available. Your order has been recorded.",
                        order: newOrder
                    });
                });
            }
        });
    });
});

module.exports = router;