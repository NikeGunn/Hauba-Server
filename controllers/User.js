import { User, Item } from "../models/users.js";
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

    const emailSubject = "Welcome to Haubaa - Verify Your Account";
    const emailBody = `
      <p>Dear ${name},</p>
      
      <p>Congratulations! You're one step away from unlocking the full potential of your Haubaa account. We're thrilled to have you on board.</p>
      
      <p>To ensure the security of your account, please verify your email address by entering the following OTP (One-Time Password) within the next 30 minutes:</p>
      
      <h3>Your OTP: ${otp}</h3>
      
      <p>This OTP is valid for 30 minutes only, so please make sure to complete the verification process promptly.</p>
      
      <p>If you did not create an account with Haubaa, please disregard this email. Your account's security is important to us, and we appreciate your attention to this matter.</p>
      
      <p>Thank you for choosing Haubaa! We look forward to providing you with a seamless and secure experience.</p>
      

      <h4>Best regards,</h4>
      <p>The Haubaa Team</p>
    `;

    // Use the email content in your sendMail function
    await sendMail(email, emailSubject, emailBody);

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

//Add task with cloudinary image upload with title, price, category, description
export const addListing = async (req, res) => {
  try {
    const { title, price, category, description } = req.body;
    const image = req.files && req.files.image && req.files.image.tempFilePath;

    // Validate that all required fields are provided
    if (!title || !price || !category || !description || !image) {
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

    // Add the image object to the user's task
    const newTask = new Item({
      title,
      price,
      category,
      seller: user._id,
      description,
      images: [imageObject], // Add the image to the 'images' array
      createdAt: new Date(Date.now()),
    });

    // Add the new task to the user's tasks array

    await newTask.save();

    user.items.push(newTask);

    await user.save();

    res.status(200).json({ success: true, message: "Task added successfully" });
  } catch (error) {
    console.error("Error in addTask:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get all tasks from the server
export const getAllListings = async (req, res) => {
  try {
    // Get all listings from the database
    const items = await Item.find({}).populate("seller");

    res.status(200).json({ success: true, items }); // Respond with 'items'
  } catch (error) {
    res.status(500).json({ success: false, message: error.message }); // Respond with 'message'
  }
};

// Retrieve user's listings
export const getUserListings = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you have user authentication middleware

    const listings = await Item.find({ seller: userId }).exec();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Retrieve a single user's listing
export const getSingleItemListings = async (req, res) => {
  try {
    const id = req.params._id;

    // Get the item from the database
    const item = await Item.find({ id });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update the user listing's details (title, price)
export const updateUserListing = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you're using user authentication
    const { id } = req.params; // Assuming you pass the item ID as a URL parameter

    // Verify that the item belongs to the user
    const item = await Item.findOne({ _id: id, seller: userId }).exec();
    if (!item) {
      return res.status(404).json({
        error: "Item not found or you don't have permission to update it",
      });
    }
    // Update the item details
    if (req.body.title) item.title = req.body.title;
    if (req.body.price) item.price = req.body.price;

    // Save the updated item to the database
    await item.save();

    res.json({ message: "Item updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a user's listing
export const deleteUserListing = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you're using user authentication
    const { id } = req.params; // Assuming you pass the item ID as a URL parameter

    // Verify that the item belongs to the user
    const item = await Item.findOne({ _id: id, seller: userId }).exec();
    if (!item) {
      return res.status(404).json({
        error: "Item not found or you don't have permission to delete it",
      });
    }

    // Delete the item from Cloudinary
    await cloudinary.v2.uploader.destroy(item.images[0].public_id);

    // Delete the item from the database
    await item.remove();

    //Remove the item from the user's items array
    await User.findByIdAndUpdate(userId, { $pull: { items: id } }).exec();

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

//Get a single task from the server
export const getSingleTask = async (req, res) => {
  try {
    // Get the item ID from the request parameters
    const { taskId } = req.params;

    // Get the item from the database
    const task = await User.findById(taskId);

    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// // Delete an item
// export const deleteUserListing = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Find the user based on their authentication (req.user._id) and populate their items
//     const user = await User.findById(req.user._id).populate("items");

//     // Find the item to delete in the user's items
//     const itemToDelete = user.items.find((item) => item.id.toString() === id);

//     if (!itemToDelete) {
//       return res.status(404).json({
//         success: false,
//         message: "Item not found or you don't have permission to delete it",
//       });
//     }

//     // Delete the item from Cloudinary
//     await cloudinary.v2.uploader.destroy(itemToDelete.images[0].public_id);

//     // Remove the item from the user's items
//     user.items.remove(itemToDelete);

//     // Save the user to persist the changes
//     await user.save();

//     res
//       .status(200)
//       .json({ success: true, message: "Item removed successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

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
    const { title, price, category, description } = req.body;
    const image = req.files && req.files.image && req.files.image.tempFilePath;

    // Validate that all required fields are provided
    if (!title || !price || !category || !description || !image) {
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
    const newItem = new Item({
      title,
      price,
      category,
      description,
      images: [imageObject], // Add the image to the 'images' array
      createdAt: new Date(Date.now()),
    });

    // Add the new item to the user's items array

    await newItem.save();

    user.items.push(newItem._id);

    await user.save();

    res.status(200).json({ success: true, message: "Item added successfully" });
  } catch (error) {
    console.error("Error in postItem:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Add a new controller function for getting all items
export const getAllItems = async (req, res) => {
  try {
    // Get all items from the database
    const items = await Item.find({});

    res.status(200).json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//Add a new controller function for getting a single item
export const getSingleItem = async (req, res) => {
  try {
    // Get the item ID from the request parameters
    const { itemId } = req.params;

    // Get the item from the database
    const item = await Item.findById(itemId);

    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new controller function for updating an item
export const updateItem = async (req, res) => {
  try {
    // Get the item ID from the request parameters
    const { itemId } = req.params;

    // Get the updated details from the request body
    const { title, price, category, description } = req.body;

    // Get the item from the database
    const item = await Item.findById(itemId);

    // Update the item details
    if (title) item.title = title;
    if (price) item.price = price;
    if (category) item.category = category;
    if (description) item.description = description;

    // Save the updated item to the database
    await item.save();

    res
      .status(200)
      .json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a new controller function for deleting an item
export const deleteItem = async (req, res) => {
  try {
    // Get the item ID from the request parameters
    const { itemId } = req.params;

    // Get the item from the database
    const item = await Item.findById(itemId);

    // Delete the item from Cloudinary
    await cloudinary.v2.uploader.destroy(item.images[0].public_id);

    // Delete the item from the database
    await item.remove();

    res
      .status(200)
      .json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
