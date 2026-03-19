const express = require("express");
const patientRoutesArray = require("./routes");
const { routeArray } = require("../../middleware/index");

const patientRouter = express.Router();

routeArray(patientRoutesArray, patientRouter, false,false,true);

module.exports = patientRouter;

