import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getFilteredUsers,
  getMessages,
  getUsersForSidebar,
  sendMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

// router.get("/users", protectRoute, getUsersForSidebar);
router.get("/users", getUsersForSidebar);
router.get("/filtered-users/:myId", getFilteredUsers);

//get messages
// router.get("/:id", protectRoute, getMessages);
router.get("/:id/:myId", getMessages);

// router.post("/send/:id", protectRoute, sendMessage);
router.post("/send/:id", sendMessage);

export default router;
