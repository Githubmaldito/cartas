import express from 'express';
import cloudinary from '../lib/cloudinary.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import protectRoute from '../middleware/auth_middleware.js';

const router = express.Router();

// enviar mensagem  
router.post("/", protectRoute, async (req, res) => {
    try {
        const { to, images } = req.body;

        if (!to || !images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ message: "Missing recipient or images." });
        }

        const recipient = await User.findById(to);
        if (!recipient) {
            return res.status(404).json({ message: "Recipient not found." });
        }

        const sender = await User.findById(req.user._id);
        if (!sender.contacts.map(id => id.toString()).includes(to)) {
            return res.status(403).json({ message: "You can only send messages to your contacts." });
        }

        // Upload de cada página
        const imageUrls = [];
        for (const img of images) {
            const upload = await cloudinary.uploader.upload(img);
            imageUrls.push(upload.secure_url);
        }

        const message = new Message({
            from: req.user._id,
            to,
            imageUrls,
        });

        await message.save();

        res.status(201).json(message);
    } catch (error) {
        console.log("Error sending message:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// mensagens recebidas
router.get("/", protectRoute, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ to: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("from", "username profileImage");

        const total = await Message.countDocuments({ to: req.user._id });

        res.json({
            messages,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.log("Error fetching messages:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// mensagens enviadas
router.get("/sent", protectRoute, async (req, res) => {
    try {
        const messages = await Message.find({ from: req.user._id })
            .sort({ createdAt: -1 })
            .populate("to", "username profileImage");

        res.json(messages);
    } catch (error) {
        console.log("Error fetching sent messages:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// Marcar uma mensagem como lida
router.patch("/:id/read", protectRoute, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        if (message.to.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized." });
        }

        message.read = true;
        await message.save();

        res.json(message);
    } catch (error) {
        console.log("Error marking message as read:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// Deletar uma mensagem
router.delete("/:id", protectRoute, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        const isSender = message.from.toString() === req.user._id.toString();
        const isRecipient = message.to.toString() === req.user._id.toString();

        if (!isSender && !isRecipient) {
            return res.status(403).json({ message: "Not authorized." });
        }

        // Remove a imagem do Cloudinary
        if (message.imageUrls && message.imageUrls.length > 0) {
            for (const url of message.imageUrls) {
                if (url.includes("res.cloudinary.com")) {
                    try {
                        const publicId = url.split("/").pop().split(".")[0];
                        await cloudinary.uploader.destroy(publicId);
                    } catch (deleteError) {
                        console.log("Error deleting image from Cloudinary:", deleteError);
                    }
                }
            }
        }

        await message.deleteOne();

        res.json({ message: "Message removed." });
    } catch (error) {
        console.log("Error deleting message:", error);
        res.status(500).json({ message: "Server error." });
    }
});

export default router;