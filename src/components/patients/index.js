const express = require("express");
const adminRoutesArray = require("./routes");
const { routeArray } = require("../../middleware/index");

const adminRouter = express.Router();

routeArray(adminRoutesArray, patientRouter, true);

module.exports = adminRouter;
