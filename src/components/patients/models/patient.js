const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { appString } = require("../../utils/appString");
const ENUM = require("../../utils/enum")
const { validation } = require('../../../components/utils/validation');
const patientsSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: validation.required(appString.USERNAME_REQUIRED),
        trim: true,
        ...validation.minLength(4),
        ...validation.maxLength(20),
    },

    email: {
        type: String,
        unique: true,
        required: validation.required(appString.EMAIL_REQUIRED),
        ...validation.email,
    },

    password: {
        type: String,
        ...validation.password,
    },
    countryCode: {
        type: String,
        required: validation.required(appString.COUNTRYCODE_REQUIRED),
    },
    contactNumber: {
        type: String,
        required: validation.required(appString.Contact_REQUIRED),

    },
    otp: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },
    isLoginVerified: {
        type: Number,
        ENUM: [ENUM.ISLOGINVERFIED.VERFIED, ENUM.ISAVAILABLE.UNVERIFIED],
        default: ENUM.ISAVAILABLE.UNVERIFIED
    },

})
patientsSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
patientsSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model("Patients", patientsSchema);
