import { User } from "../models/users.js";
import { sendMail } from "../utils/sendMail.js";
import { sendToken } from "../utils/sendToken.js";
import cloudinary from "cloudinary";
import fs from "fs";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const avatar = req.files.avatar.tempFilePath;

    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const otp = Math.floor(Math.random() * 1000000);

    const mycloud = await cloudinary.v2.uploader.upload(avatar);

    fs.rmSync("./tmp", { recursive: true });

    user = await User.create({
      name,
      email,
      password,
      avatar: {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
      },
      otp,
      otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
    });

    await sendMail(email, "Verify your account", `Your OTP is ${otp}`);

    sendToken(
      res,
      user,
      201,
      "OTP sent to your email, please verify your account"
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verify = async (req, res) => {
  try {
    const otp = Number(req.body.otp);

    const user = await User.findById(req.user._id);

    if (user.otp !== otp || user.otp_expiry < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP or has been Expired" });
    }

    user.verified = true;
    user.otp = null;
    user.otp_expiry = null;

    await user.save();

    sendToken(res, user, 200, "Account Verified");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter all fields" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    sendToken(res, user, 200, "Login Successful");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res
      .status(200)
      .cookie("token", null, {
        expires: new Date(Date.now()),
      })
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addTask = async (req, res) => {
  try {
    const { title, description } = req.body;

    const user = await User.findById(req.user._id);

    user.tasks.push({
      title,
      description,
      completed: false,
      createdAt: new Date(Date.now()),
    });

    await user.save();

    res.status(200).json({ success: true, message: "Task added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const user = await User.findById(req.user._id);

    user.tasks = user.tasks.filter(
      (task) => task._id.toString() !== taskId.toString()
    );

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Task removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const user = await User.findById(req.user._id);

    user.task = user.tasks.find(
      (task) => task._id.toString() === taskId.toString()
    );

    user.task.completed = !user.task.completed;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Task Updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    sendToken(res, user, 201, `Welcome back ${user.name}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const { name } = req.body;
    const avatar = req.files.avatar.tempFilePath;

    if (name) user.name = name;
    if (avatar) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);

      const mycloud = await cloudinary.v2.uploader.upload(avatar);

      fs.rmSync("./tmp", { recursive: true });

      user.avatar = {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
      };
    }

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Profile Updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter all fields" });
    }

    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Old Password" });
    }

    user.password = newPassword;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password Updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid Email" });
    }

    const otp = Math.floor(Math.random() * 1000000);

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = Date.now() + 10 * 60 * 1000;

    await user.save();

    const message = `Your OTP for reseting the password ${otp}. If you did not request for this, please ignore this email.`;

    await sendMail(email, "Request for Reseting Password", message);

    res.status(200).json({ success: true, message: `OTP sent to ${email}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordOtp: otp,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Otp Invalid or has been Expired" });
    }
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpiry = null;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: `Password Changed Successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Add a new controller function for posting items use cloudinary define above
export const postItem = async (req, res) => {
  try {
    const { title, price, categoryId, description } = req.body;
    const image = req.files.image.tempFilePath;

    // Validate that all required fields are provided
    if (!title || !price || !categoryId || !description || !image) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const user = await User.findById(req.user._id);

    // Upload the image to Cloudinary
    const mycloud = await cloudinary.v2.uploader.upload(image);

    fs.rmSync("./tmp", { recursive: true });

    // Create an image object with Cloudinary details
    const imageObject = {
      public_id: mycloud.public_id,
      url: mycloud.secure_url,
    };

    // Add the image object to the user's item
    const newItem = {
      title,
      price,
      categoryId,
      description,
      images: [imageObject], // Add the image to the 'images' array
      createdAt: new Date(Date.now()),
    };

    user.items.push(newItem);

    await user.save();

    res.status(200).json({ success: true, message: "Item added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new controller function for getting items
export const getAllItems = async (req, res) => {
  try {
    // Find the user by their ID
    const user = await User.findById(req.user._id);

    // Check if the user exists and has items
    if (!user || !user.items || user.items.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No items found" });
    }

    // Extract the items from the user's data
    const items = user.items;

    // Return the list of items in the response
    res.status(200).json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new controller function for getting a single item
export const getSingleItem = async (req, res) => {
  try {
    // Find the user by their ID
    const user = await User.findById(req.user._id);

    // Check if the user exists and has items
    if (!user || !user.items || user.items.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No items found" });
    }

    // Extract the items from the user's data
    const items = user.items;

    // Find the item with the specified ID
    const item = items.find((item) => item._id.toString() === req.params.id);

    // Check if the item exists
    if (!item) {
      return res.status(404).json({ success: false, message: "No item found" });
    }

    // Return the item in the response
    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new controller function for updating items
export const updateItem = async (req, res) => {
  try {
    const { title, price, categoryId, description } = req.body;

    // Validate that all required fields are provided
    if (!title || !price || !categoryId || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Find the user by their ID
    const user = await User.findById(req.user._id);

    // Check if the user exists and has items
    if (!user || !user.items || user.items.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No items found" });
    }

    // Extract the items from the user's data
    const items = user.items;

    // Find the item with the specified ID
    const item = items.find((item) => item._id.toString() === req.params.id);

    // Check if the item exists
    if (!item) {
      return res.status(404).json({ success: false, message: "No item found" });
    }

    // Update the item with the new data
    item.title = title;
    item.price = price;
    item.categoryId = categoryId;
    item.description = description;

    // Save the updated user data
    await user.save();

    // Return the updated item in the response
    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new controller function for deleting items from the server
export const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Find the user by their ID
    const user = await User.findById(req.user._id);

    // Check if the user exists and has items
    if (!user || !user.items || user.items.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No items found" });
    }

    // Find the index of the item to delete by comparing item IDs
    const itemIndex = user.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    // Check if the item was found
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // Remove the item from the user's items array
    user.items.splice(itemIndex, 1);

    // Save the user's updated data
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
