const express = require("express");
const app = express();
const port = 8080;

// Middleware
app.use(express.json());

// Import Routes
const booksRoutes = require("./books");
const ordersRoutes = require("./orders");

// Routes
app.use("/books", booksRoutes);  // Route for fetching books data
app.use("/orders", ordersRoutes); // Route for posting orders

// Default route
app.get("/", (req, res) => {
    res.send("Welcome to the Book Fair API!");
});

// Start the server
app.listen(8080, '0.0.0.0', () => {
    console.log('Server is running on port 8080');
});
