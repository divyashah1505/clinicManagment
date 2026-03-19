const { default: mongoose } = require("mongoose");
const { appString } = require("../../utils/appString");



const adminSettingsSchema = new mongoose.Schema(
  {
    defaultBalance: {
      type: Number,
      default: 1000,
    },
    doctorProfileSteps: {
      step1: {
        key: {
          type: String,
        },
        isRequired: {
          type: Number,
          default: 1,
        },
      },
      step2: {
        key: {
          type: String,
        },
        isRequired: {
          type: Number,
          default: 1,
        },
      },
      step3: {
        key: {
          type: String,
        },
        isRequired: {
          type: Number,
          default: 1,
        },
      },
      step4: {
        key: {
          type: String,
        },
        isRequired: {
          type: Number,
          default: 1,
        },
      },
      step5: {
        key: {
          type: String,
        },
        isRequired: {
          type: Number,
          default: 1,
        },
      },
    },
    noOfSteps:{
      type:Number
    },
    doctorRefund: {
      type: Object,
    },
    patientRefund: {
      type: Object,
    },
    commonHolidays: {
      type: Array,
    },
    wokringHours: {
      type: Object,
     
    },
    leaveApplyBefore:{
      type:Number,
      default:3
    },
    maxLeaveApply:{
      type:Number,
      default:5
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model( appString.ADMIN_SETTINGS_MODEL,adminSettingsSchema,);
