const express = require("express");  
const fs = require("fs").promises; // Using promises for cleaner async/await syntax  
const path = require("path"); // Import the path module  
const router = express.Router();  

// Paths to JSON files (using relative paths)  
const ordersFilePath = path.join(__dirname, "..", "data_sheet", "orders.json");  

// POST: Submit an order for unavailable books  
router.post("/", async (req, res) => {  
    const { title, author, readerName, readerContact } = req.body;  

    // Validate required fields  
    if (!title || !author || !readerName || !readerContact) {  
        return res.status(400).json({ error: "All fields are required: title, author, readerName, readerContact." });  
    }  

    try {  
        // Read existing orders  
        console.log("Reading orders data from:", ordersFilePath); // Debugging the file path  
        const ordersData = await fs.readFile(ordersFilePath, "utf8");  
        let orders = [];  
        try {  
            orders = JSON.parse(ordersData);  
        } catch (parseOrdersErr) {  
            console.warn("Orders file was empty or invalid, creating a new one.");  
        }  

        // Check if the book has already been ordered by the user  
        const existingOrder = orders.find(order =>   
            order.title.toLowerCase() === title.toLowerCase() &&   
            order.readerName.toLowerCase() === readerName.toLowerCase()  
        );  

        if (existingOrder) {  
            // Increment the request count for existing order  
            existingOrder.requestCount += 1;  

            // Update the orders file with the incremented count  
            await fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2));  

            console.log("Order updated successfully:", existingOrder);  
            return res.status(200).json({  
                message: "You have already requested this book, and your order count has been incremented.",  
                order: existingOrder  
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

            // Write the new order to the orders file  
            await fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2));  

            console.log("New order saved:", newOrder);  
            return res.status(201).json({  
                message: "The book is not available. Your order has been recorded.",  
                order: newOrder  
            });  
        }  
    } catch (err) {  
        console.error("Error:", err.message);  
        return res.status(500).json({ error: "An error occurred while processing your request." });  
    }  
});  

// DELETE: Remove an order  
router.delete("/:title/:readerName", async (req, res) => {  
    const { title, readerName } = req.params;  

    try {  
        // Read existing orders  
        const ordersData = await fs.readFile(ordersFilePath, "utf8");  
        let orders = [];  
        try {  
            orders = JSON.parse(ordersData);  
        } catch (parseOrdersErr) {  
            console.warn("Orders file was empty or invalid, unable to delete.");  
            return res.status(404).json({ message: "No orders found." });  
        }  

        // Find the order to delete  
        const orderIndex = orders.findIndex(order =>   
            order.title.toLowerCase() === title.toLowerCase() &&   
            order.readerName.toLowerCase() === readerName.toLowerCase()  
        );  

        if (orderIndex === -1) {  
            return res.status(404).json({ message: "The order does not exist." });  
        }  

        // Remove the order from the array  
        const deletedOrder = orders.splice(orderIndex, 1);  

        // Write the updated orders back to the file  
        await fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2));  

        console.log("Order deleted successfully:", deletedOrder);  
        return res.status(200).json({  
            message: "The order has been successfully deleted.",  
            deletedOrder  
        });  
    } catch (err) {  
        console.error("Error:", err.message);  
        return res.status(500).json({ error: "Error reading the orders JSON file" });  
    }  
});  

// GET: Get all orders (New endpoint)  
router.get("/", async (req, res) => {  
    try {  
        const ordersData = await fs.readFile(ordersFilePath, "utf8");  
        let orders = [];  
        try {  
            orders = JSON.parse(ordersData);  
        } catch (parseErr) {  
            console.warn("Orders file was empty or invalid.");  
        }  

        res.status(200).json(orders);  
    } catch (err) {  
        console.error("Error reading orders JSON file:", err.message);  
        return res.status(500).json({ error: "Error reading the orders JSON file" });  
    }  
});  

// GET: Get a specific order by title and reader's name  
router.get("/:title/:readerName", async (req, res) => {  
    const { title, readerName } = req.params;  

    try {  
        const ordersData = await fs.readFile(ordersFilePath, "utf8");  
        let orders = [];  
        try {  
            orders = JSON.parse(ordersData);  
        } catch (parseErr) {  
            console.warn("Orders file was empty or invalid.");  
        }  

        const order = orders.find(o => o.title.toLowerCase() === title.toLowerCase() && o.readerName.toLowerCase() === readerName.toLowerCase());  

        if (order) {  
            res.status(200).json(order);  
        } else {  
            res.status(404).json({ message: "Order not found" });  
        }  
    } catch (err) {  
        console.error("Error reading orders JSON file:", err.message);  
        return res.status(500).json({ error: "Error reading the orders JSON file" });  
    }  
});  

// PUT: Update a specific order  
router.put("/:title/:readerName", async (req, res) => {  
    const { title, readerName } = req.params;  
    const { readerContact, availabilityStatus } = req.body;  

    try {  
        const ordersData = await fs.readFile(ordersFilePath, "utf8");  
        let orders = [];  
        try {  
            orders = JSON.parse(ordersData);  
        } catch (parseErr) {  
            console.warn("Orders file was empty or invalid.");  
        }  

        const orderIndex = orders.findIndex(o =>   
            o.title.toLowerCase() === title.toLowerCase() &&   
            o.readerName.toLowerCase() === readerName.toLowerCase()  
        );  

        if (orderIndex === -1) {  
            return res.status(404).json({ message: "Order not found" });  
        }  

        // Update the order details  
        if (readerContact) orders[orderIndex].readerContact = readerContact;  
        if (availabilityStatus) orders[orderIndex].availabilityStatus = availabilityStatus;  

        // Write the updated orders back to the file  
        await fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2));  

        res.status(200).json({ message: "Order updated successfully", order: orders[orderIndex] });  
    } catch (err) {  
        console.error("Error updating order:", err.message);  
        return res.status(500).json({ error: "Error saving the updated order" });  
    }  
});  

module.exports = router;
