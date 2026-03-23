const Admin = require("../models/admin");
const { generateTokens, success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const Doctor = require("../../doctors/models/doctor");
const ENUM = require("../../utils/enum");
const doctorLeave = require("../../doctors/models/doctorLeave");
const doctor = require("../../doctors/models/doctor");

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

      return success(res, { admin: newAdmin, ...tokens }, appString.ADMIN_CREATED, 201);

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
      return success(res, { username: admin.username, email: admin.email, ...tokens }, appString.LOGIN_SUCCESS);
    } catch (err) {
      return error(res, appString.LOGIN_FAILED, 500);
    }
  },
  verifyDoctor: async (req, res) => {
    const { doctorId } = req.query;
    const doctor = await Doctor.findById(doctorId);
    console.log(doctor);
    
    if (!doctor || doctor.isProfileComplete === ENUM.ISPROFILECOMPLETE.COMPLETE) {
      return error(res, { message: appString.DOCTOR_NOT_ELIGIBLE });
    }

    doctor.isProfileComplete = 1;
    await doctor.save();

    return success(res, { message: appString.DOCTOR_VERIFIED_SUCCESSFULLY });
  },
  updateLeaveStatus:async(req,res) =>{
    try{
      const {leveId} = req.params;
      const {status} = req.body;
      if(![1,2].includes(status)){
        return error(res,{success:false,message:appString.STATUS_MUSTBE_1OR2})
      }
      const leave = await doctorLeave.findById(leveId);
      if(!leave){
        return error(res,{ success:false,message:appString.LEVAE_REQUEST_NOT_FOUND})
      }
      if(leave.status !== 0){
        return error(res,{success:false,messgae:appString.LEAVE_ALEREADY_PROCEED})
      }
      leave.status = status
      await leave.save();

      if(status === 1){
        await doctor.findByIdAndUpdate(leave.doctorId ,{
          isAvailable:0
        })

        return success(res,{success:true,message:status === 1 ?appString.LEAVE_APPROVED :appString.LEAVE_REJECT,data:leave})
      }
    }catch (err){
      console.error(err)
      return error(res,{success:false, message:appString.SERVER_ERROR})
    }
  }

}
module.exports = adminController;
