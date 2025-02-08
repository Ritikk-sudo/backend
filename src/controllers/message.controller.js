import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    // const loggedInUserId = req.user._id;
    // const filteredUsers = await User.find({
    //   _id: { $ne: loggedInUserId },
    // }).select("-password");
    const users = await User.find().select("-password");

    // res.status(200).json(filteredUsers);
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId, myId } = req.params;
    // const myId = req.user._id;

    // const messages = await Message.find({
    //   $or: [
    //     { senderId: myId, receiverId: userToChatId },
    //     { senderId: userToChatId, receiverId: myId },
    //   ],
    // });

    // const messages = await Message.find({
    //   $or: [
    //     { senderId: myId, receiverId: userToChatId },
    //     { senderId: userToChatId, receiverId: myId },
    //   ],
    // });
    const user = await User.findById(myId).populate("messages");
    const messages = user.messages.filter(
      (message) =>
        message.senderId.toString() === userToChatId ||
        message.receiverId.toString() === userToChatId
    );

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    // const { text, image } = req.body;
    const { text, image, senderId } = req.body;
    const { id: receiverId } = req.params;
    // const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create a new message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Add the message to the sender's and receiver's message arrays
    await User.findByIdAndUpdate(senderId, {
      $push: { messages: newMessage._id },
    });

    await User.findByIdAndUpdate(receiverId, {
      $push: { messages: newMessage._id },
    });

    // Emit the new message to the receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    // console.log("Message sent to receiver:", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getFilteredUsers = async (req, res) => {
  const { myId } = req.params;

  try {
    const usersWithMessages = await User.aggregate([
      {
        $lookup: {
          from: "messages",
          let: { userId: "$_id", myId: { $toObjectId: myId } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$senderId", "$$myId"] },
                        { $eq: ["$receiverId", "$$userId"] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$receiverId", "$$myId"] },
                        { $eq: ["$senderId", "$$userId"] },
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } }, // Get the latest message
            { $limit: 1 },
          ],
          as: "messages",
        },
      },
      {
        $match: { "messages.0": { $exists: true } }, // Only users with messages
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          profilePic: 1,
          lastMessage: { $arrayElemAt: ["$messages.text", 0] },
        },
      },
    ]);

    // Fetch current user details
    const user = await User.findById(myId).select("-password");

    res.json({ filteredUsers: usersWithMessages, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
