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
            await Wallet.create({patientId:newPatient._id,totalAmount:500})
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
        console.log("hello")
        const { doctorId, date } = req.query;

    if (!doctorId || !date) {
        return error(res, {
            message: appString.DOCTORID_DATE_REQUIRED
        });
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
        return error(res, appString.DOCOR_NOT_FOUND);
    }

    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString("en-US", {
        weekday: "long"
    }).toLowerCase();

    const daySlots = doctor.timeSlots?.get(dayName);

    if (!daySlots || daySlots.length === 0) {
        return success(res, {
            message: appString.SLOTSNOT_AVAILABLE,
            data: []
        });
    }

    const leave = await DoctorLeave.findOne({
        doctorId,
        fromDate: { $lte: selectedDate },
        toDate: { $gte: selectedDate },
        status: 2,
    });

    if (leave) {
        return success(res, {
            message:appString.DOCTOR_LEAVE,
            data: []
        });
    }

    const bookedAppointments = await Appointment.find({
        doctorId,
        appointmentDate: {
            $gte: new Date(date + "T00:00:00"),
            $lte: new Date(date + "T23:59:59")
        }
    });

    const bookedTimes = bookedAppointments.map(a => a.startTime);

    const generateSlots = (start, end) => {
        const slots = [];

        let [hour, min] = start.split(":").map(Number);
        let [endHour, endMin] = end.split(":").map(Number);

        let current = new Date();
        current.setHours(hour, min, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHour, endMin, 0, 0);

        while (current < endTime) {
            let slotStart = current.toTimeString().slice(0, 5);

            current.setMinutes(current.getMinutes() + 30);

            let slotEnd = current.toTimeString().slice(0, 5);

            slots.push({
                startTime: slotStart,
                endTime: slotEnd
            });
        }

        return slots;
    };

    let availableSlots = [];

    for (let slotRange of daySlots) {
        const slots = generateSlots(slotRange.startTime, slotRange.endTime);

        slots.forEach(slot => {
            if (!bookedTimes.includes(slot.startTime)) {
                availableSlots.push(slot);
            }
        });
    }

    const today = new Date();
    const isToday = today.toDateString() === selectedDate.toDateString();

    if (isToday) {
        const currentTime = today.toTimeString().slice(0, 5);

        availableSlots = availableSlots.filter(
            slot => slot.startTime > currentTime
        );
    }

    return success(res, {
        message: appString.SLOTS_FETECH_SUCCESS,
        data: availableSlots
    });

} catch (err) {
    console.error(err);
    return error(res, appString.SERVER_ERROR);
}
},



    bookAppoitments: async (req, res) => {
        try {
            console.log("ihi")
            const patientId = req.user.id;

            const { doctorId, appointmentDate, startTime, endTime } = req.body;
            console.log(req.body)
            const doctor = await Doctor.findById(doctorId);
            if (!doctor) {
                return error(res, appString.DOCOR_NOT_FOUND);
            }
            console.log(doctor)
            const formatTime = (time) => {
                if (!time.includes(":")) {
                    return `${time.padStart(2, "0")}:00`;
                }
                return time;
            };

            const formattedStart = formatTime(startTime);
            const formattedEnd = formatTime(endTime);

            const [startH, startM] = formattedStart.split(":").map(Number);
            const [endH, endM] = formattedEnd.split(":").map(Number);
            const minAllowedMinutes = 9 * 60;
            const maxAllowedMinutes = 18 * 60;
            const startTotalMinutes = startH * 60 + startM;
            const endTotalMinutes = endH * 60 + endM;
            if (startTotalMinutes < minAllowedMinutes || endTotalMinutes > maxAllowedMinutes) {
                return error(res, { message: appString.APPOITMENT_MUSTBE_9AMTO18PM });
            }


            if (endTotalMinutes <= startTotalMinutes) {
                return error(res, { message: appString.ENDTIME_MUSTBEFORE_STARTTIME });
            }

            if (endTotalMinutes - startTotalMinutes !== 60) {
                return error(res, {
                    message: appString.APPOITMENT_MUSTBE_1HRS_LONG,
                });
            }

            const appointmentStart = new Date(appointmentDate);
            appointmentStart.setHours(startH, startM, 0, 0);

            const now = new Date();
            const diffHours = (appointmentStart - now) / (1000 * 60 * 60);

            if (diffHours < 3) {
                return error(res, appString.APPOITMENT_BOOKIN_ADVANCED_BEFORE_3HRS);
            }
            console.log("helloooo")
            const leave = await DoctorLeave.findOne({
                doctorId,
                fromDate: { $lte: appointmentDate },
                toDate: { $gte: appointmentDate },
                status: 2,
            });
            // console.log(leave)
            if (leave) {
                return error(res, appString.DOCTOR_LEAVE);
            }
            console.log("hi")
            if (formattedStart === formattedEnd) {
                return error(res, {
                    message: appString.STARTTIME_AND_ENDTIME_CANNOT_SAME,
                });
            }

            const alreadyBooked = await Appointment.findOne({
                doctorId,
                appointmentDate,
                startTime: formattedStart,
            });

            if (alreadyBooked) {
                return error(res, appString.SLOTS_ALREADY_BOOKED);
            }

            const userWallet = await Wallet.findOne({patientId})
            if(!userWallet){
                return error(res, appString.USERWALLET_NOT_FOUND);
            }
            console.log(userWallet)
            const appointment = await Appointment.create({ doctorId, patientId, appointmentDate, startTime: formattedStart, endTime: formattedEnd,totalAmount:doctor.appointmentsCharges });
            console.log(appointment)
            userWallet.totalAmount -= doctor.appointmentsCharges;
            userWallet.frozenAmount += doctor.appointmentsCharges;
            await userWallet.save(); 
            return success(res, appointment, appString.APPOITMENT_BOOK_SUCESSFULLY);

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    },
    cancelAppointment: async (req, res) => {
        console.log("hi");

        try {
            const patientId = req.user.id;
            console.log("p id",patientId)
            const { appoitmentId } = req.params;

            const appoint = await Appointment.findOne({
                _id: appoitmentId,
                patientId
            });
            console.log(appoint)
            if (!appoint) {
                return error(res, { message: appString.APPOITMENT_NOT_FOUND });
            }

            if (appoint.status === ENUM.APPOITMENTSTATUS.CANCEL) {
                return error(res, {
                    message: appString.APPOITMENT_ALREADY_CANCEL
                });
            }

            appoint.status = ENUM.APPOITMENTSTATUS.CANCEL;
            await appoint.save();

            return success(res, {
                message: appString.APPOITMENT_CANCEL_SUCCESSFULLY,
                data: appoint
            });

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    },
    rescheduleAppointment: async (req, res) => {
        try {
            const patientId = req.user.id;
            const { appoitmentId } = req.params;
            const { appointmentDate, startTime, endTime } = req.body;

            const appoint = await Appointment.findOne({
                _id: appoitmentId,
                patientId
            });

            if (!appoint) {
                return error(res, { message: appString.APPOITMENT_NOT_FOUND });
            }

            if (appoint.status === ENUM.APPOITMENTSTATUS.REJECT) {
                return error(res, {
                    message:appString.CANNNOT_RESCHEDULED_AFTERREJECT
                });
            }

            const formatTime = (time) => {
                if (!time.includes(":")) {
                    return `${time.padStart(2, "0")}:00`;
                }
                return time;
            };

            const formattedStart = formatTime(startTime);
            const formattedEnd = formatTime(endTime);

            if (formattedStart === formattedEnd) {
                return error(res, {
                    message: appString.STARTTIME_AND_ENDTIME_CANNOT_SAME
                });
            }

            const [oldH, oldM] = appoint.startTime.split(":").map(Number);
            const oldStartDateTime = new Date(appoint.appointmentDate);
            oldStartDateTime.setHours(oldH, oldM, 0, 0);

            const now = new Date();
            const diffMinutes = (oldStartDateTime - now) / (1000 * 60);

            if (diffMinutes < 60) {
                return error(res, {
                    message:appString.CANNOT_RESCHEDULED
                });
            }

            const [newH, newM] = formattedStart.split(":").map(Number);
            const newStartDateTime = new Date(appointmentDate);
            newStartDateTime.setHours(newH, newM, 0, 0);

            const diffHours = (newStartDateTime - now) / (1000 * 60 * 60);

            if (diffHours < 3) {
                return error(res, appString.APPOITMENT_BOOKIN_ADVANCED_BEFORE_3HRS);
            }

            const doctor = await Doctor.findById(appoint.doctorId);
            if (!doctor) {
                return error(res, appString.DOCOR_NOT_FOUND);
            }

            const leave = await DoctorLeave.findOne({
                doctorId: appoint.doctorId,
                fromDate: { $lte: appointmentDate },
                toDate: { $gte: appointmentDate },
                status: 2,
            });

            if (leave) {
                return error(res, appString.DOCTOR_LEAVE);
            }

            const alreadyBooked = await Appointment.findOne({
                doctorId: appoint.doctorId,
                appointmentDate,
                startTime: formattedStart,
                _id: { $ne: appoitmentId }
            });

            if (alreadyBooked) {
                return error(res, appString.SLOTS_ALREADY_BOOKED);
            }

            appoint.appointmentDate = appointmentDate;
            appoint.startTime = formattedStart;
            appoint.endTime = formattedEnd;

            appoint.status = ENUM.APPOITMENTSTATUS.PENDING;

            await appoint.save();

            return success(res, {
                message: appString.APPOITMENT_RESCHEDULED_SUCCESSFULLY,
                data: appoint
            });

        } catch (err) {
            console.error(err);
            return error(res, appString.SERVER_ERROR);
        }
    },
};

module.exports = patientController;

