const jwt = require("jsonwebtoken");
const config = require("../../config/devlopment.json");
const { appString } = require("../components/utils/appString");
const Validator = require("validatorjs");

const admin = require("../components/admin/models/admin");
const doctor = require("../components/doctors/models/doctor");
const patient = require("../components/patients/models/patient");

const { getActiveToken } = require("../components/utils/commonutills");

const verifyToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

if (!auth || !auth.startsWith("Bearer ")) {
  return res.status(401).json({
    success: false,
    message: appString.AUTHORIZATIONHEADERS,
  });
}

const token = auth.split(" ")[1];
const decoded = jwt.verify(token, config.ACCESS_SECRET);

const savedToken = await getActiveToken(decoded.id);

if (!savedToken || savedToken !== token) {
  return res.status(401).json({
    success: false,
    message: appString.SESSIONEXPIRED,
  });
}

req.user = { id: decoded.id, role: decoded.role };
next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message:
        err.name === "TokenExpiredError"
          ? "Token Expired"
          : "Invalid Token",
    });
  }
};

const checkRole = (isAdminRoute, isDoctorRoute, isPatientRoute) => {
  return async (req, res, next) => {
    try {
      const userPayload = req.user;

  if (!userPayload) {
    return res.status(401).json({ message: appString.Unauthorized });
  }

  const userId =
    typeof userPayload.id === "object"
      ? userPayload.id.id
      : userPayload.id;

  if (!userId) {
    return res.status(400).json({
      message: "User identity not found in token",
    });
  }

  if (isAdminRoute) {
    const data = await admin.findById(userId);
    if (data) return next();
    return res.status(403).json({ message: appString.ADMIN_UNAUTHORIZED });
  }

  if (isDoctorRoute) {
    const data = await doctor.findById(userId);
    if (data) return next();
    return res.status(403).json({ message: appString.DOCTOR_UNAUTHORIZED });
  }

  if (isPatientRoute) {
    const data = await patient.findById(userId);
    if (data) return next();
    return res.status(403).json({ message: appString.PATIENT_UNAUTHORIZED });
  }

  return res.status(403).json({ message: "Access denied" });
} catch (err) {
  console.error("Auth Middleware Error:", err);
  return res.status(500).json({ message: appString.SERVER_ERROR });
}
  };
};

const routeArray = (array_, router,isAdmin = false, isDoctor = false, isPatient = false) => {
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
  middlewares.push(checkRole(isAdmin, isDoctor, isPatient));
}

if (middleware) {
  middlewares.push(
    ...(Array.isArray(middleware) ? middleware : [middleware])
  );
}

if (validation) {
  middlewares.push(
    ...(Array.isArray(validation) ? validation : [validation])
  );
}

const stack = [...middlewares, controller].filter(
  (fn) => typeof fn === "function"
);

router[method](path, ...stack);
  });

  return router;
};

const validatorUtilWithCallback = (rules, customMessages) => {
  return (req, res, next) => {
    Validator.useLang(req?.headers?.lang ?? "en");

const validation = new Validator(req.body, rules, customMessages);

if (validation.passes()) return next();

return res.status(400).json({
  success: false,
  message: "Validation failed",
  errors: validation.errors.all(),
});
  };
};

module.exports = {
  verifyToken,
  routeArray,
  validatorUtilWithCallback,
  checkRole,
};