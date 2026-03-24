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
const doctorLeave = require("../models/doctorLeave");

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
            const newDoctor = await new doctor({ username, email, password: hashedPassword, countryCode, contactNumber })
            await newDoctor.save();


            return success(res, { success: true, message: appString.DOCTOR_RGISTRATION_SUCCESSFULL });
        } catch (err) {
            console.error(err);
            return error(res, { success: false, message: appString.SERVER_ERROR });
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
                { message: appString.OTP_SENT_SUCCESS, email: doctor.email },
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
    },
    applyLeave: async (req, res) => {
        try {
            console.log("hellowww");

            const doctorId = req.user.id;
            const { fromDate, toDate, reason, slots } = req.body;

            const today = new Date();
            const leaveStart = new Date(fromDate);
            const leaveEnd = new Date(toDate);

            if (slots) {
                if (!Array.isArray(slots) || slots.length === 0) {
                    return error(res, {
                        success: false,
                        message: "Slots must be a non-empty array"
                    });
                }

                const startDateOnly = leaveStart.toISOString().split("T")[0];
                const endDateOnly = leaveEnd.toISOString().split("T")[0];

                if (startDateOnly !== endDateOnly) {
                    return error(res, {
                        success: false,
                        message: "When slots are selected, fromDate and toDate must be the same day"
                    });
                }
            }

            const diffTime = leaveStart - today;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays < 3) {
                return error(res, {
                    success: false,
                    message: appString.LEAVE_MUST_APPLY_BEFORE_3DAYS
                });
            }

            if (leaveEnd < leaveStart) {
                return error(res, {
                    success: false,
                    message: appString.TODATE_CANNOT_BEFOR_FROM_DATE
                });
            }

            const existingLeave = await doctorLeave.findOne({
                doctorId,
                fromDate: { $lte: leaveEnd },
                toDate: { $gte: leaveStart }
            });

            if (existingLeave) {
                return error(res, {
                    success: false,
                    message: appString.ALREDY_APPLIED_LEAVE
                });
            }

            const leave = await doctorLeave.create({
                doctorId,
                fromDate: leaveStart,
                toDate: leaveEnd,
                reason,
                slots
            });

            return success(res, {
                success: true,
                message: appString.LEAVE_APPLIED_SUCCESSFULLY,
                data: leave
            });

        } catch (err) {
            console.error(err);
            return error(res, {
                success: false,
                message: appString.SERVER_ERROR
            });
        }
    }



}
module.exports = doctorController