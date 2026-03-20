const doctor = require("../models/doctor");
const { generateTokens, success, error, validateContact, generateOTP } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const bcrypt = require("bcryptjs"); 
const verificationTemplate = require("../../utils/emailTemplate");

const crypto = require("crypto")
const { sendEmail } = require("../../utils/mailSender");
const { render } = require("ejs");
const client = require("../../utils/redisClient");
const Doctor = require("../models/doctor");


const doctorController = {
    doctorRegister: async (req, res) => {
        try {
            const { username, email, password, countryCode, contactNumber } = req.body;
            console.log(req.body)
            const doctoExist = await doctor.findOne({ email });
            if (doctoExist) return error(res, { success: false, message: appString.EMAILALREDY_REGISTERED });

            const phoneValidation = validateContact(countryCode, contactNumber);
            if (!phoneValidation.valid) {
                return error(res, { success: false, message: phoneValidation.message });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
           

            const doctorData = { username, email, password: hashedPassword, countryCode, contactNumber };

            await client.set(`verify_doctor:${token}`, JSON.stringify(doctorData), { EX: 86400 });

            const verifyURL = `http://localhost:3000/api/doctors/verify-mail/${token}`;
            await sendEmail(email, 'Verify Your Email', verificationTemplate(verifyURL));

            return success(res, { success: true, message: appString.DOCTOR_RGISTRATION_SUCCESSFULL });
        } catch (err) {
            console.error(err);
            return error(res, { success: false, message: appString.SERVER_ERROR });
        }
    },

    verifyEmail: async (req, res) => {
        try {
            console.log("hit");
            const { token } = req.params;

            const redisData = await client.get(`verify_doctor:${token}`);
            if (!redisData) {
                return res.render("verificaionExpired");
            }

            const doctorData = JSON.parse(redisData);

            const existingDocor = await doctor.findOne({ email: doctorData.email });
            if (existingDocor) {
                return res.render("alreadyVerified");
            }

            const newDoctor = new doctor(doctorData);
            await newDoctor.save();

            await client.del(`verify_doctor:${token}`);

            await generateTokens(newDoctor)

            return success(res, { success: true, message: appString.DOCTOR_REGISTRATION_SUCCESSFULL_VERIFIED });


        } catch (error) {
            console.error("Verification Error:", error);
            return res.render("verificaionExpired");
        }
    },
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const doctor = await Doctor.findOne({ email });

            if (!doctor || !(await doctor.matchPassword(password))) {
                return error(res, appString.INVALID_CREDENTIALS, 401);
            }


            const otp = generateOTP();
            const otpExpires = Date.now() + 10 * 60 * 1000;
            doctor.otp = otp;
            doctor.otpExpires = otpExpires;
            doctor.isLoginVerified = 0;
            await doctor.save();

            const subject = "Your Login OTP Code";
            const html = `<p>Your OTP for login is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`;
            await sendEmail(email, subject, html);


            success(
                res,
                { message:appString.OTP_SENT_SUCCESS, email: doctor.email },
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
            const doctor = await Doctor.findOne({ email });

            if (!doctor) {
                return error(res, appString.USER_NOT_FOUND, 404);
            }

            if (doctor.otp !== otp || doctor.otpExpires < Date.now()) {
                return error(res, appString.INVALID_OR_EXPIRED_OTP, 400);
            }

            doctor.isLoginVerified = 1;
            doctor.otp = undefined;
            doctor.otpExpires = undefined;
            await doctor.save();

            const tokens = await generateTokens(doctor);

            success(
                res,
                {
                    username: doctor.username,
                    email: doctor.email,
                    ...tokens,
                },
                appString.LOGIN_SUCCESS_VERIFIED
            );

        } catch (err) {
            console.error(err);
            error(res, appString.OTP_VERIFICATION_FAILED, 500);
        }
    }

}
module.exports = doctorController