
const validation = {
  minLength: (length) => ({
    minLength: [length, `Must be at least ${length} characters long`],
  }),
  maxLength: (length) => ({
    maxlength: [length, `Cannot exceed ${length} characters`],
  }),
  required: (field) => ([true, `${field} is required`]),

  email: {
    match: [/.+@.+\..+/, 'Please enter a valid email address'],
    lowercase: true,
    trim: true,
  },
  password: {
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
  },
};

module.exports = { validation };
