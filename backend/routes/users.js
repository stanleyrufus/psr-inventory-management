const express = require("express"); 
const router = express.Router(); 
 
router.post("/register", (req, res) =
  res.json({ message: "? User registered (stub)" }); 
}); 
router.post("/login", (req, res) =
  res.json({ token: "fake-jwt-token" }); 
}); 
module.exports = router; 
