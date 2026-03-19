const Admin = require("../models/admin");
const { generateTokens, success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const adminController = {
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const adminExists = await Admin.findOne({});

      if (adminExists) {
        return error(res, appString.ADMINALREDY_REGISTER, 409);
      }
      const newAdmin = await Admin.create({ username, email, password });

      const tokens = generateTokens(newAdmin._id);

      return success( res,  { admin: newAdmin, ...tokens }, appString.ADMIN_CREATED,201);

    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];

        return error(res, `${field} already exists`, 409);
      }
      return error(res, err.message || appString.REGISTRATION_FAILED, 400);
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await Admin.findOne({ email });
      if (!admin || !(await admin.matchPassword(password))) {
        return error(res, appString.INVALID_CREDENTIALS, 401);
      }

      const tokens = await generateTokens(admin);
      return success( res,  { username: admin.username, email: admin.email, ...tokens }, appString.LOGIN_SUCCESS );
    } catch (err) {
     return  error(res, appString.LOGIN_FAILED, 500);
    }
  },
  
}
module.exports = adminController;
