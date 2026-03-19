const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { appString } = require("../../utils/appString");

const { validation } = require('../../../components/utils/validation'); 

const adminSchema = new mongoose.Schema({
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
  
  deletedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

adminSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

adminSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

adminSchema.statics.softDelete = function (id) {
  return this.findByIdAndUpdate(id, { deletedAt: new Date() });
};

module.exports = mongoose.model( appString.ADMIN_MODEL, adminSchema);
