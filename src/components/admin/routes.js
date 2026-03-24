const express = require("express");
const router = express.Router();
const { routeArray } = require("../../middleware")
const adminController = require("./controllers/adminController");
const adminSettingController = require("./controllers/adminSettingController");
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
  {
    path:"/createProfileSteps",
    method:"post",
    controller:adminSettingController.createProfileSteps,
   
  },
  {
    path:"/verifyDoctor",
     method:"post",
    controller:adminController.verifyDoctor
  },
  {
    path:"/leavestatus/:leaveId",
    method:"put",
    controller:adminController.updateLeaveStatus

  },
  {
    path:"/getAllDoctors",
     method:"get",
    controller:adminController.getAllDoctors
  }
 
]
module.exports = routeArray(routes, router, true);
