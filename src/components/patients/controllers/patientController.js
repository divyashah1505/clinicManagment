const { generateTokens, success, error, validateContact, generateOTP } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const bcrypt = require("bcryptjs");
const verificationTemplate = require("../../utils/emailTemplate");

const crypto = require("crypto")
const { sendEmail } = require("../../utils/mailSender");
const { render } = require("ejs");
const client = require("../../utils/redisClient");
// const patient = require("../models/patient");
const Patient = require("../models/patient");
const patient = require("../models/patient");

const patientController = {
    patientRegister: async (req, res) => {
        console.log("hit 1");

        try {
            // console.log(req.body);

            const { username, email, password, countryCode, contactNumber } = req.body;
            console.log(req.body);

            // console.log(req.body)
            const patientExist = await Patient.findOne({ email });
            if (patientExist) return error(res, { success: false, message: appString.EMAILALREDY_REGISTERED });

            const phoneValidation = validateContact(countryCode, contactNumber);
            if (!phoneValidation.valid) {
                return error(res, { success: false, message: phoneValidation.message });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newPatient = await new patient( { username, email, password: hashedPassword, countryCode, contactNumber });
            await newPatient.save();
           

            return success(res, { success: true, message: appString.PATIENTS_RGISTRATION_SUCCESSFULL });
        } catch (err) {
            console.error(err);
            return error(res, { success: false, message: appString.SERVER_ERROR });
        }
    },
  
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            console.log(req.body)
            const patient = await Patient.findOne({ email });

            // if (!patient || !(await patient.matchPassword(password))) {
            //     return error(res, appString.INVALID_CREDENTIALS, 401);
            // }
            console.log("hi")

            const otp = generateOTP();
            const otpExpires = Date.now() + 10 * 60 * 1000;
            patient.otp = otp;
            patient.otpExpires = otpExpires;
            patient.isLoginVerified = 0;
            await patient.save();

            const subject = "Your Login OTP Code";
            const html = `<p>Your OTP for login is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`;
            await sendEmail(email, subject, html);


            success(
                res,
                { message: appString.OTP_SENT_SUCCESS, email: Patient.email },
                appString.OTP_SENT_SUCCESS
            );
        } catch (err) {
            console.error(err);
            error(res, appString.LOGIN_FAILED, 500);
        }
    },


    verifyOtpLogin: async (req, res) => {
        try {
            const { email, otp } = req.body;
            const patients = await Patient.findOne({ email });

            if (!patients) {
                return error(res, appString.USER_NOT_FOUND, 404);
            }

            if (patients.otp !== otp || patients.otpExpires < Date.now()) {
                return error(res, appString.INVALID_OR_EXPIRED_OTP, 400);
            }

            patients.isLoginVerified = 1;
            patients.otp = undefined;
            patients.otpExpires = undefined;
            await patients.save();

            const tokens = await generateTokens(patients);

            success(
                res,
                {
                    username: patients.username,
                    email: patients.email,
                    ...tokens,
                },
                appString.LOGIN_SUCCESS_VERIFIED
            );

        } catch (err) {
            console.error(err);
            error(res, appString.OTP_VERIFICATION_FAILED, 500);
        }
    },
    
}
module.exports = patientController;
