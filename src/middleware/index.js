// src\middleware\index.js
const jwt = require("jsonwebtoken");
const config = require("../../config/devlopment.json");
const { appString } = require("../components/utils/appString");
const Validator = require("validatorjs");
// const user = require("../components/user/models/user")
const admin = require("../components/admin/models/admin");
const { getActiveToken, error } = require("../components/utils/commonutills");
const doctor = require("../components/doctors/models/doctor");
const patient = require("../components/patients/models/patient");

const verifyToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return console.error(401)({ message: appString.AUTHORIZATIONHEADERS });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, config.ACCESS_SECRET);

    const savedToken = await getActiveToken(decoded.id);

    if (!savedToken || savedToken !== token) {
      return console.error(401).json({ message: appString.SESSIONEXPIRED });
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError" ? "Token Expired" : "Invalid Token";
    return console.error({ message: msg });
  }
};

const checkRole = (isAdminRoute,isDoctorRoute,isPatientRoute) => async (req, res, next) => {
  try {
    const userPayload = req.user;

    if (!userPayload) {
      return console.error(401)({ message: appString.Unauthorized });
    }

    const userId =
      typeof userPayload.id === "object" ? userPayload.id.id : userPayload.id;

    if (!userId) {
      return console.error({ message: "User identity not found in token" });
    }

    if (isAdminRoute) {
      const adminData = await admin.findById(userId);
      if (adminData) return next();
      return error(res,{ message: appString.Forbidden });
    } else if(isDoctorRoute){
      const doctorData = await doctor.findById(userId);
      if (doctorData) return next();
      return error(res,{ message: appString.Forbidden1 });
    }else if(isPatientRoute){
        const patientData = await patient.findById(userId);
      if (patientData) return next();
      return error(res,{ message: appString.Forbidden1 });
    }
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return error(res,{ message: "Internal Server Error" });
  }
};

const isAuthenticated = (req, res, next) => {
  if (!req.cookies || !req.cookies.accessToken) {
    return console.error(401).json({
      success: false,
      message: appString.LOGIN_FIRST,
    });
  }
  next();
};

const routeArray = (array_, prefix, isAdmin = false,isDoctor = false,isPatient = false) => {
  array_.forEach((route) => {
    const {
      method,
      path,
      controller,
      validation,
      middleware,
      isPublic = false,
    } = route;
    let middlewares = [];

    if (!isPublic) {
      middlewares.push(verifyToken);
      middlewares.push(checkRole(isAdmin));
      middlewares.push(checkRole(isDoctor));
      middlewares.push(checkRole(isPatient));
    }
    if (middleware)
      middlewares.push(
        ...(Array.isArray(middleware) ? middleware : [middleware]),
      );
    if (validation)
      middlewares.push(
        ...(Array.isArray(validation) ? validation : [validation]),
      );

    const validStack = [...middlewares, controller].filter(
      (h) => typeof h === "function",
    );

    if (validStack.length === 0) {
      console.error(
        `Error: No handler found for route ${method.toUpperCase()} ${path}. A controller function is required.`,
      );
      return; 
    }

    prefix[method.toLowerCase()](path, ...validStack);
  });
  return prefix;
};


const validatorUtilWithCallback = (rules, customMessages, req, res, next) => {
  Validator.useLang(req?.headers?.lang ?? "en");
  const validation = new Validator(req.body, rules, customMessages);
  validation.passes(() => next());
  validation.fails(() => {
    return console.error({success: false, message: "Validation failed",errors: validation.errors.all(),
    });
  });
};

module.exports = {
  verifyToken,
  isAuthenticated,
  routeArray,
  validatorUtilWithCallback,
  checkRole,
};
