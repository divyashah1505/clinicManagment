const { generateTokens, success, error, validateContact, generateOTP } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const { sendEmail } = require("../../utils/mailSender");

const Patient = require("../models/patient");
const Appointment = require("../models/appotment");
const Doctor = require("../../doctors/models/doctor");
const DoctorLeave = require("../../doctors/models/doctorLeave");
const ENUM = require("../../utils/enum");
const appotment = require("../models/appotment");
const { default: mongoose } = require("mongoose");
const Wallet = require("../models/wallet");
const doctor = require("../../doctors/models/doctor");
const { weekdays } = require("moment");
const AdminSetting = require("../../admin/models/adminSetting")
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
            await Wallet.create({ patientId: newPatient._id, totalAmount: 500 })
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
                !patientData.otp || patientData.otp !== otp || patientData.otpExpires < Date.now()) {
                return error(res, appString.INVALID_OR_EXPIRED_OTP);
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

    getDoctorAvailableSlots: async (req, res) => {
        try {
            const { doctorId, date } = req.query;

            if (!date) {
                return error(res, { message: appString.DATE_REQUIRED || "Date is required" });
            }

            const settings = await AdminSetting.findOne();
            if (!settings) return error(res, "Admin settings not found");

            const [year, month, day] = date.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);
            const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

            const dayMap = settings.wokringHours.find(m =>
                (m instanceof Map ? m.get('day') : m.day) === dayName
            );

            if (!dayMap) {
                return success(res, [], appString.SLOTSNOT_AVAILABLE);
            }

            const timeRanges = [];
            if (dayMap instanceof Map) {
                dayMap.forEach((value, key) => {
                    if (key !== 'day') timeRanges.push({ start: key, end: value });
                });
            } else {
                Object.keys(dayMap).forEach(key => {
                    if (key !== 'day' && key !== '$init') timeRanges.push({ start: key, end: dayMap[key] });
                });
            }

            let doctors = [];
            if (doctorId) {
                const doc = await Doctor.findById(doctorId);
                if (doc) doctors.push(doc);
            } else {
                doctors = await Doctor.find({ status: 1 });
            }
            console.log(doctors)
            const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
            const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

            const results = await Promise.all(doctors.map(async (doc) => {
                const leave = await DoctorLeave.findOne({
                    doctorId: doc._id,
                    fromDate: { $lte: selectedDate },
                    toDate: { $gte: selectedDate },
                    status: 1
                });

                if (leave) return null;

                const booked = await Appointment.find({
                    doctorId: doc._id,
                    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
                    status: 1
                });

                const doctorSlots = [];
                timeRanges.forEach(range => {
                    let [h, m] = range.start.split(':').map(Number);
                    let [eh, em] = range.end.split(':').map(Number);

                    if (eh < h) eh += 12;

                    let current = new Date(2000, 0, 1, h, m);
                    let endLimit = new Date(2000, 0, 1, eh, em);

                    if (dayName === "Sunday") {
                        let sundayLimit = new Date(2000, 0, 1, 12, 0);
                        if (endLimit > sundayLimit) endLimit = sundayLimit;
                    }

                    while (current < endLimit) {
                        let slotStart = current.toTimeString().slice(0, 5);
                        let tempEnd = new Date(current);
                        tempEnd.setHours(tempEnd.getHours() + 1);

                        if (tempEnd > endLimit) break;

                        let slotEnd = tempEnd.toTimeString().slice(0, 5);

                        const isBooked = booked.some(a => a.startTime >= slotStart && a.startTime < slotEnd);

                        const now = new Date();
                        let isPast = false;
                        if (now.toDateString() === selectedDate.toDateString()) {
                            const currentTime = now.toTimeString().slice(0, 5);
                            if (slotStart <= currentTime) isPast = true;
                        }

                        if (!isBooked && !isPast) {
                            doctorSlots.push({ startTime: slotStart, endTime: slotEnd });
                        }
                        current.setHours(current.getHours() + 1);
                    }
                });

                if (doctorSlots.length === 0) return null;

                return {
                    doctorId: doc._id,
                    doctorName: doc.name,
                    image: doc.image,
                    specialization: doc.specialization,
                    slots: doctorSlots
                };
            }));

            const finalData = results.filter(r => r !== null);

            return success(res, finalData, appString.SLOTS_FETECH_SUCCESS);

        } catch (err) {
            console.error("Error in getDoctorAvailableSlots:", err);
            return error(res, appString.SERVER_ERROR);
        }
    },

    bookAppoitments: async (req, res) => {
        try {
            const patientId = req.user.id;
            const { doctorId, appointmentDate, startTime, endTime } = req.body;

            const doctor = await Doctor.findById(doctorId);
            if (!doctor) return error(res, appString.DOCOR_NOT_FOUND);

            const [year, month, day] = appointmentDate.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day); // Force Local Time
            const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

            const settings = await AdminSetting.findOne();
            const dayConfig = settings.wokringHours.find(m =>
                (m instanceof Map ? m.get('day') : m.day) === dayName
            );

            if (!dayConfig) return error(res, `Doctor does not work on ${dayName}`);

            const formatTime = (time) => !time.includes(":") ? `${time.padStart(2, "0")}:00` : time;
            const formattedStart = formatTime(startTime);
            const formattedEnd = formatTime(endTime);
            const [startH, startM] = formattedStart.split(":").map(Number);
            const [endH, endM] = formattedEnd.split(":").map(Number);

            const startTotalMinutes = startH * 60 + startM;
            const endTotalMinutes = endH * 60 + endM;

            if (dayName === "Sunday" && endTotalMinutes > 720) {
                return error(res, "On Sundays, appointments are only available until 12:00 PM");
            }

            const timeRanges = [];
            if (dayConfig instanceof Map) {
                dayConfig.forEach((value, key) => {
                    if (key !== 'day') timeRanges.push({ start: key, end: value });
                });
            } else {
                Object.keys(dayConfig).forEach(key => {
                    if (key !== 'day' && key !== '$init') timeRanges.push({ start: key, end: dayConfig[key] });
                });
            }



            if (endTotalMinutes - startTotalMinutes !== 60) {
                return error(res, { message: appString.APPOITMENT_MUSTBE_1HRS_LONG });
            }

            const appointmentStart = new Date(selectedDate);
            appointmentStart.setHours(startH, startM, 0, 0);
            if ((appointmentStart - new Date()) / (1000 * 60 * 60) < 3) {
                return error(res, appString.APPOITMENT_BOOKIN_ADVANCED_BEFORE_3HRS);
            }

            const leave = await DoctorLeave.findOne({
                doctorId,
                fromDate: { $lte: selectedDate },
                toDate: { $gte: selectedDate },
                status: 2,
            });
            if (leave) return error(res, appString.DOCTOR_LEAVE);

            const alreadyBooked = await Appointment.findOne({
                doctorId,
                appointmentDate: selectedDate,
                startTime: formattedStart,
                status: { $ne: 3 }
            });
            if (alreadyBooked) return error(res, appString.SLOTS_ALREADY_BOOKED);

            const userWallet = await Wallet.findOne({ patientId });
            if (!userWallet || userWallet.totalAmount < doctor.appointmentsCharges) {
                return error(res, appString.INSUFFICENT_BALANCE);
            }

            const appointment = await Appointment.create({
                doctorId, patientId, appointmentDate: selectedDate,
                startTime: formattedStart, endTime: formattedEnd,
                totalAmount: doctor.appointmentsCharges
            });

            userWallet.totalAmount -= doctor.appointmentsCharges;
            userWallet.frozenAmount += doctor.appointmentsCharges;
            await userWallet.save();

            return success(res, appointment, appString.APPOITMENT_BOOK_SUCESSFULLY);

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    },
    // cancelAppointment: async (req, res) => {
    //     console.log("hi");

    //     try {
    //         const patientId = req.user.id;
    //         console.log("p id",patientId)
    //         const { appoitmentId } = req.params;

    //         const appoint = await Appointment.findOne({
    //             _id: appoitmentId,
    //             patientId
    //         });
    //         console.log(appoint)
    //         if (!appoint) {
    //             return error(res, { message: appString.APPOITMENT_NOT_FOUND });
    //         }

    //         if (appoint.status === ENUM.APPOITMENTSTATUS.CANCEL) {
    //             return error(res, {
    //                 message: appString.APPOITMENT_ALREADY_CANCEL
    //             });
    //         }

    //         appoint.status = ENUM.APPOITMENTSTATUS.CANCEL;
    //         await appoint.save();

    //         return success(res, {
    //             message: appString.APPOITMENT_CANCEL_SUCCESSFULLY,
    //             data: appoint
    //         });

    //     } catch (err) {
    //         console.error(err);
    //         return error(res, appString.SERVER_ERROR);
    //     }
    // },
    // rescheduleAppointment: async (req, res) => {
    //     try {
    //         const patientId = req.user.id;
    //         const { appoitmentId } = req.params;
    //         const { appointmentDate, startTime, endTime } = req.body;

    //         const appoint = await Appointment.findOne({
    //             _id: appoitmentId,
    //             patientId
    //         });

    //         if (!appoint) {
    //             return error(res, { message: appString.APPOITMENT_NOT_FOUND });
    //         }

    //         if (appoint.status === ENUM.APPOITMENTSTATUS.REJECT) {
    //             return error(res, {
    //                 message:appString.CANNNOT_RESCHEDULED_AFTERREJECT
    //             });
    //         }

    //         const formatTime = (time) => {
    //             if (!time.includes(":")) {
    //                 return `${time.padStart(2, "0")}:00`;
    //             }
    //             return time;
    //         };

    //         const formattedStart = formatTime(startTime);
    //         const formattedEnd = formatTime(endTime);

    //         if (formattedStart === formattedEnd) {
    //             return error(res, {
    //                 message: appString.STARTTIME_AND_ENDTIME_CANNOT_SAME
    //             });
    //         }

    //         const [oldH, oldM] = appoint.startTime.split(":").map(Number);
    //         const oldStartDateTime = new Date(appoint.appointmentDate);
    //         oldStartDateTime.setHours(oldH, oldM, 0, 0);

    //         const now = new Date();
    //         const diffMinutes = (oldStartDateTime - now) / (1000 * 60);

    //         if (diffMinutes < 60) {
    //             return error(res, {
    //                 message:appString.CANNOT_RESCHEDULED
    //             });
    //         }

    //         const [newH, newM] = formattedStart.split(":").map(Number);
    //         const newStartDateTime = new Date(appointmentDate);
    //         newStartDateTime.setHours(newH, newM, 0, 0);

    //         const diffHours = (newStartDateTime - now) / (1000 * 60 * 60);

    //         if (diffHours < 3) {
    //             return error(res, appString.APPOITMENT_BOOKIN_ADVANCED_BEFORE_3HRS);
    //         }

    //         const doctor = await Doctor.findById(appoint.doctorId);
    //         if (!doctor) {
    //             return error(res, appString.DOCOR_NOT_FOUND);
    //         }

    //         const leave = await DoctorLeave.findOne({
    //             doctorId: appoint.doctorId,
    //             fromDate: { $lte: appointmentDate },
    //             toDate: { $gte: appointmentDate },
    //             status: 2,
    //         });

    //         if (leave) {
    //             return error(res, appString.DOCTOR_LEAVE);
    //         }

    //         const alreadyBooked = await Appointment.findOne({
    //             doctorId: appoint.doctorId,
    //             appointmentDate,
    //             startTime: formattedStart,
    //             _id: { $ne: appoitmentId }
    //         });

    //         if (alreadyBooked) {
    //             return error(res, appString.SLOTS_ALREADY_BOOKED);
    //         }

    //         appoint.appointmentDate = appointmentDate;
    //         appoint.startTime = formattedStart;
    //         appoint.endTime = formattedEnd;

    //         appoint.status = ENUM.APPOITMENTSTATUS.PENDING;

    //         await appoint.save();

    //         return success(res, {
    //             message: appString.APPOITMENT_RESCHEDULED_SUCCESSFULLY,
    //             data: appoint
    //         });

    //     } catch (err) {
    //         console.error(err);
    //         return error(res, appString.SERVER_ERROR);
    //     }
    // },

    // bookAppointment: async (req, res) => {
    //     try {
    //         const patientId = req.user.id;
    //         const { doctorId, appointmentDate, startTime, endTime } = req.body;

    //         const doctor = await Doctor.findById(doctorId);
    //         if (!doctor) return error(res, appString.DOCOR_NOT_FOUND);

    //         const start = new Date(appointmentDate);
    //         const [h, m] = startTime.split(":").map(Number);
    //         start.setHours(h, m);

    //         if ((start - new Date()) / (1000 * 60 * 60) < 3) {
    //             return error(res, appString.APPOITMENT_BOOKIN_ADVANCED_BEFORE_3HRS);
    //         }

    //         const leave = await DoctorLeave.findOne({
    //             doctorId,
    //             fromDate: { $lte: appointmentDate },
    //             toDate: { $gte: appointmentDate }
    //         });

    //         if (leave) return error(res, appString.DOCTOR_LEAVE);

    //         const exist = await Appointment.findOne({
    //             doctorId,
    //             appointmentDate,
    //             startTime
    //         });

    //         if (exist) return error(res, appString.SLOTS_ALREADY_BOOKED);

    //         const wallet = await Wallet.findOne({ patientId });
    //         if (!wallet || wallet.totalAmount < doctor.appointmentsCharges) {
    //             return error(res, "Insufficient balance");
    //         }

    //         wallet.totalAmount -= doctor.appointmentsCharges;
    //         wallet.frozenAmount += doctor.appointmentsCharges;
    //         await wallet.save();

    //         const appointment = await Appointment.create({
    //             doctorId,
    //             patientId,
    //             appointmentDate,
    //             startTime,
    //             endTime,
    //             totalAmount: doctor.appointmentsCharges
    //         });

    //         return success(res, appointment, appString.APPOITMENT_BOOK_SUCESSFULLY);

    //     } catch (err) {
    //         console.error(err);
    //         return error(res, appString.SERVER_ERROR);
    //     }
    // },

    cancelAppointment: async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const patientId = req.user.id;

            const appoint = await Appointment.findOne({ _id: appointmentId, patientId });
            if (!appoint) return error(res, appString.APPOITMENT_NOT_FOUND);

            if (appoint.status === ENUM.APPOITMENTSTATUS.CANCEL) {
                return error(res, appString.APPOITMENT_ALREADY_CANCEL);
            }

            const now = new Date();
            const start = new Date(appoint.appointmentDate);
            const [h, m] = appoint.startTime.split(":").map(Number);
            start.setHours(h, m);

            const diffMin = (start - now) / (1000 * 60);

            let refund = 0;
            if (diffMin > 180) refund = 100;
            else if (diffMin > 120) refund = 50;
            else if (diffMin > 60) refund = 20;

            const refundAmount = (appoint.totalAmount * refund) / 100;
            await Wallet.updateOne(
                { patientId },
                {
                    $inc: {
                        totalAmount: refundAmount,
                        frozenAmount: -appoint.totalAmount
                    }
                }
            );

            appoint.status = ENUM.APPOITMENTSTATUS.CANCEL;
            await appoint.save();

            return success(res, { refundAmount }, "Cancelled");

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    },

    rescheduleAppointment: async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { appointmentDate, startTime, endTime } = req.body;
            const patientId = req.user.id;

            const appoint = await Appointment.findOne({ _id: appointmentId, patientId });
            if (!appoint) return error(res, appString.APPOITMENT_NOT_FOUND);

            const oldStart = new Date(appoint.appointmentDate);
            const [h, m] = appoint.startTime.split(":").map(Number);
            oldStart.setHours(h, m);

            if ((oldStart - new Date()) / (1000 * 60) < 60) {
                return error(res, "Cannot reschedule within 60 mins");
            }

            const exist = await Appointment.findOne({
                doctorId: appoint.doctorId,
                appointmentDate,
                startTime,
                _id: { $ne: appointmentId }
            });

            if (exist) return error(res, appString.SLOTS_ALREADY_BOOKED);

            appoint.appointmentDate = appointmentDate;
            appoint.startTime = startTime;
            appoint.endTime = endTime;
            appoint.status = ENUM.APPOITMENTSTATUS.PENDING;

            await appoint.save();

            return success(res, appoint, appString.RESCHEDULED);

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    },

    getAppointments: async (req, res) => {
        try {
            const patientId = req.user.id;
            const { status } = req.query;

            const query = { patientId };
            if (status) query.status = Number(status);

            const data = await Appointment.find(query)
                .populate("doctorId", "username email")
                .sort({ createdAt: -1 });

            return success(res, data, "Fetched");

        } catch (err) {
            return error(res, appString.SERVER_ERROR);
        }
    },

    getAppointmentDetails: async (req, res) => {
        try {
            const { appointmentId } = req.params;

            const data = await Appointment.findById(appointmentId)
                .populate("doctorId")
                .populate("patientId");

            return success(res, data, "Details fetched");

        } catch (err) {
            return error(res, appString.SERVER_ERROR);
        }
    }
};



module.exports = patientController;

