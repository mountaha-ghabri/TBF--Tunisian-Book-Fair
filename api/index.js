const express = require('express');  
const app = express();  

app.use(express.json());  

// Import Routes  
const booksRoutes = require('./books');  
const ordersRoutes = require('./orders');  

// Use Routes  
app.use('/api/books', booksRoutes);  // Route for fetching books data  
app.use('/api/orders', ordersRoutes); // Route for posting orders  

// Default route  
app.get('/', (req, res) => {  
    res.send('Welcome to the Book Fair API!');  
});  

// Export the express app as a serverless function  
module.exports = (req, res) => {  
    app(req, res);  
};
