// Import statements using ES6 syntax
import express from "express";
import {
  addTask,
  forgetPassword,
  getMyProfile,
  login,
  logout,
  register,
  removeTask,
  resetPassword,
  updatePassword,
  updateProfile,
  updateTask,
  verify,
  postItem, // Import the new controller function for posting items
  getAllItems, // Import the new controller function for getting all items
  getSingleItem, // Import the new controller function for getting a single item
  updateItem, // Import the new controller function for updating an item
  deleteItem, // Import the new controller function for deleting an item
} from "../controllers/User.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/verify").post(isAuthenticated, verify);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/newtask").post(isAuthenticated, addTask);
router.route("/me").get(isAuthenticated, getMyProfile);
router
  .route("/task/:taskId")
  .get(isAuthenticated, updateTask)
  .delete(isAuthenticated, removeTask);
router.route("/updateprofile").put(isAuthenticated, updateProfile);
router.route("/updatepassword").put(isAuthenticated, updatePassword);
router.route("/forgetpassword").post(forgetPassword);
router.route("/resetpassword").put(resetPassword);

// Add a new route for posting items
router.route("/postitem").post(isAuthenticated, postItem);

// Get item from the server
router.route("/getallitems").get(isAuthenticated, getAllItems);

// Get a single item from the server
router.route("/getsingleitem/:itemId").get(isAuthenticated, getSingleItem);

// Update an item on the server
router.route("/updateitem/:itemId").put(isAuthenticated, updateItem);

// Delete an item from the server
router.route("/deleteitem/:itemId").delete(isAuthenticated, deleteItem);

export default router;
