const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../server");  // Import PostgreSQL pool
const router = express.Router();

const SECRET_KEY = "your_secret_key";

// Register
router.post("/register", (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  pool.query(
    "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
    [username, hashedPassword],
    (err, result) => {
      if (err) return res.status(500).send("User already exists");
      res.status(201).json(result.rows[0]);  // Return the newly registered user
    }
  );
});

// Login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  pool.query("SELECT * FROM users WHERE username = $1", [username], (err, result) => {
    if (err || !result.rows.length) return res.status(404).send("User not found");

    const user = result.rows[0];
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).send("Invalid password");

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).send({ token });
  });
});

module.exports = router;
