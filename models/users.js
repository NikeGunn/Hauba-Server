import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  images: [
    {
      public_id: String,
      url: String,
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
    minlength: [8, "Password must be at least 8 characters long"],
    select: false,
  },

  avatar: {
    public_id: String,
    url: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  tasks: [
    {
      title: "String",
      description: "String",
      completed: Boolean,
      createdAt: Date,
    },
  ],

  items: [itemSchema], // Include the item schema here

  verified: {
    type: Boolean,
    default: false,
  },

  otp: Number,
  otp_expiry: Date,
  resetPasswordOtp: Number,
  resetPasswordOtpExpiry: Date,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.getJWTToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
  });
};

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.index({ otp_expiry: 1 }, { expireAfterSeconds: 0 });

export const User = mongoose.model("User", userSchema);
