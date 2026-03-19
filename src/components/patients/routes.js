const express = require("express");
const router = express.Router();
const { routeArray } = require("../../middleware")
const patientController = require("../patients/controllers/patientController")
const routes = [
  {
    path: "/registerPatients",
    method: "post",
    controller: patientController.patientRegister,
    isPublic: true,
  },

]
module.exports = routeArray(routes, router, true);
