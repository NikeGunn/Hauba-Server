// Import statements using ES6 syntax
import express from "express";
import {
  addListing,
  forgetPassword,
  getMyProfile,
  login,
  logout,
  register,
  updateTask,
  resetPassword,
  updatePassword,
  updateProfile,
  verify,
  postItem,
  getAllItems,
  getSingleItem,
  updateItem,
  deleteItem,
  getAllListings,
  getSingleTask,
  getUserListings,
  deleteUserListing,
  updateUserListing,
  getSingleItemListings,
} from "../controllers/User.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/verify").post(isAuthenticated, verify);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/me").get(isAuthenticated, getMyProfile);

router.route("/singletask/:taskId").get(isAuthenticated, getSingleTask);

router.route("/updateprofile").put(isAuthenticated, updateProfile);
router.route("/updatepassword").put(isAuthenticated, updatePassword);
router.route("/forgetpassword").post(forgetPassword);
router.route("/resetpassword").put(resetPassword);

//Adding routes for items
router.route("/addlisting").post(isAuthenticated, addListing);
router.route("/getlistings").get(isAuthenticated, getAllListings);
router.route("/getuserlistings").get(isAuthenticated, getUserListings);

router
  .route("/getuserlistings/:id")
  .get(isAuthenticated, getSingleItemListings)
  .delete(isAuthenticated, deleteUserListing)
  .put(isAuthenticated, updateUserListing);

export default router;
