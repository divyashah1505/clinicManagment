const { generateTokens, success, error, validateContact, generateOTP } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const { sendEmail } = require("../../utils/mailSender");

const Patient = require("../models/patient");
const Appointment = require("../models/appotment");
const Doctor = require("../../doctors/models/doctor");
const DoctorLeave = require("../../doctors/models/doctorLeave");

const patientController = {

    patientRegister: async (req, res) => {
        try {
            const { username, email, password, countryCode, contactNumber } = req.body;

            const patientExist = await Patient.findOne({ email });
            if (patientExist) {
                return error(res, { message: appString.EMAILALREDY_REGISTERED });
            }

            const phoneValidation = validateContact(countryCode, contactNumber);
            if (!phoneValidation.valid) {
                return error(res, { message: phoneValidation.message });
            }

            const newPatient = new Patient({
                username,
                email,
                password,
                countryCode,
                contactNumber
            });

            await newPatient.save();

            return success(res, {
                message: appString.PATIENTS_RGISTRATION_SUCCESSFULL
            });

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const patient = await Patient.findOne({ email });

            if (!patient) {
                return error(res, appString.USER_NOT_FOUND);
            }

            const isMatch = await patient.matchPassword(password);
            if (!isMatch) {
                return error(res, appString.INVALID_CREDENTIALS);
            }

            const otp = generateOTP().toString();
            const otpExpires = Date.now() + 10 * 60 * 1000;

            await Patient.updateOne(
                { email },
                {
                    $set: {
                        otp,
                        otpExpires,
                        isLoginVerified: 0
                    }
                }
            );

            const updated = await Patient.findOne({ email }).lean();
            console.log("OTP GENERATED:", otp);
            console.log("DB AFTER LOGIN:", updated);

            const subject = "Your Login OTP Code";
            const html = `<p>Your OTP: <b>${otp}</b></p>`;
            await sendEmail(email, subject, html);

            return success(res, {
                message: appString.OTP_SENT_SUCCESS,
                email
            });

        } catch (err) {
            console.error(err);
            return error(res, appString.LOGIN_FAILED);
        }
    },

    verifyOtpLogin: async (req, res) => {
        try {
            const { email, otp } = req.body;

            const patientData = await Patient.findOne({ email });
            
            if (!patientData) {
                return error(res, appString.USER_NOT_FOUND);
            }

            console.log("FULL DOC:", patientData);
            console.log("DB OTP:", patientData.otp);
            console.log("REQ OTP:", otp);

            if (
                !patientData.otp || patientData.otp !== otp || patientData.otpExpires < Date.now())
             {
                return error(res,appString.INVALID_OR_EXPIRED_OTP);
            }

            await Patient.updateOne(
                { email },
                {
                    $set: {
                        isLoginVerified: 1,
                        otp: null,
                        otpExpires: null
                    }
                }
            );

            const updatedUser = await Patient.findOne({ email });

            const tokens = await generateTokens(updatedUser);

            return success(res, {
                username: updatedUser.username,
                email: updatedUser.email,
                ...tokens,
            });

        } catch (err) {
            console.error(err);
            return error(res, appString.OTP_VERIFICATION_FAILED);
        }
    },

    bookAppoitments: async (req, res) => {
        try {
            const patientId = req.user.id;

            const { doctorId, appointmentDate, startTime, endTime } = req.body;

            const doctor = await Doctor.findById(doctorId);
            if (!doctor) {
                return error(res, appString.DOCOR_NOT_FOUND);
            }

            const formatTime = (time) => {
                if (!time.includes(":")) {
                    return `${time.padStart(2, "0")}:00`;
                }
                return time;
            };

            const formattedStart = formatTime(startTime);
            const formattedEnd = formatTime(endTime);

            const [startH, startM] = formattedStart.split(":").map(Number);

            const appointmentStart = new Date(appointmentDate);
            appointmentStart.setHours(startH, startM, 0, 0);

            const now = new Date();
            const diffHours = (appointmentStart - now) / (1000 * 60 * 60);

            if (diffHours < 3) {
                return error(res, appString.APPOITMENT_BOOKIN_ADVANCED_BEFORE_3HRS);
            }

            const leave = await DoctorLeave.findOne({
                doctorId,
                fromDate: { $lte: appointmentDate },
                toDate: { $gte: appointmentDate },
                status: 2,
            });

            if (leave) {
                return error(res, appString.DOCTOR_LEAVE);
            }

            if (startTime === endTime) {
                return error(res, { message:appString.STARTTIME_AND_ENDTIME_CANNOT_SAME });
            }

            const alreadyBooked = await Appointment.findOne({
                doctorId,
                appointmentDate,
                startTime: formattedStart,
            });

            if (alreadyBooked) {
                return error(res, appString.SLOTS_ALREADY_BOOKED);
            }

            const appointment = await Appointment.create({
                doctorId,
                patientId,
                appointmentDate,
                startTime: formattedStart,
                endTime: formattedEnd,
            });

            return success(res, appointment, appString.APPOITMENT_BOOK_SUCESSFULLY);

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    }
};

module.exports = patientController;

