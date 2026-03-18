                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           const express = require("express");
const mongoose = require("mongoose");
const http = require("http")
const path = require("path");
const cors = require("cors");
const config = require("../config/devlopment.json");
const client = require("../src/components/utils/redisClient")
const app = express();
const adminRouter = require("../src/components/admin/routes");

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/api/admins", adminRouter);
mongoose.connect(config.DB_URL)
    .then(() => console.log(" MongoDB Connected"))
    .catch((err) => console.error(" DB Error:", err));

const PORT = 3000;
app.listen(PORT, () => console.log(` Server running on http://localhost:${PORT}`));