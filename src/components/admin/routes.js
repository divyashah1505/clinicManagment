const express = require("express");
const router = express.Router();
const { routeArray } = require("../../middleware")
const adminController = require("./controllers/adminController");
const routes = [
  {
    path: "/registeradmin",
    method: "post",
    controller: adminController.register,
    isPublic: true,
  },
  {
    path: "/loginAdmin",
    method: "post",
    controller: adminController.login,
    isPublic: true,
  },
]
module.exports = routeArray(routes, router, true);
