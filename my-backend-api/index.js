const express = require("express");
const app = express();
const port = 8080;

// Middleware
app.use(express.json());

// Import Routes
const booksRoutes = require("./routes/books");
const ordersRoutes = require("./routes/orders");

// Routes
app.use("/books", booksRoutes);  // Route for fetching books data
app.use("/orders", ordersRoutes); // Route for posting orders

// Default route
app.get("/", (req, res) => {
    res.send("Welcome to the Book Fair API!");
});

// Start the server
app.listen(port, () => {
    console.log(`Server is alive and running! on http://localhost:${port}`);
});
