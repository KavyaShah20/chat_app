import User from "../MODELS/user.model.js";
import Message from "../MODELS/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getRecieverSocketId, getSenderUserId, io } from "../lib/socket.js";
import { getGeminiResponse } from "../lib/gemini.js";
export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id; // Assuming req.user is set by the protectRoute middleware
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
            .select('-password'); // Exclude password
        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error('Error fetching users for sidebar:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        })
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const sendMessages = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });
        await newMessage.save();

        const receiverSocketId = getRecieverSocketId(receiverId);
        const senderSocketId = getRecieverSocketId(senderId); // ✅ FIXED

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
        if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", newMessage);
        }

        if (text && text.startsWith("@ai")) {
            const prompt = text.replace("@ai", "").trim();
            const aiReplyText = await getGeminiResponse(prompt);

            const aiMessage = new Message({
                senderId: receiverId,      // still the human user
                receiverId: senderId,
                text: aiReplyText,
                isAi: true
            });

            await aiMessage.save();

            if (senderSocketId) {
                io.to(senderSocketId).emit("newMessage", aiMessage); 
            }
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", aiMessage); 
            }
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};
