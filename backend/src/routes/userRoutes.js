import express from 'express';
import User from '../models/User.js';
import protectRoute from '../middleware/auth_middleware.js';

const router = express.Router();

// Buscar usuário pelo código único (username)
router.get("/find", protectRoute, async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({ message: "Provide a code to search." });
        }

        const user = await User.findOne({ username: code }).select("username profileImage");

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot add yourself." });
        }

        res.json(user);
    } catch (error) {
        console.log("Error finding user:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// Listar contatos do usuário
router.get("/contacts", protectRoute, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate("contacts", "username profileImage");

        res.json(user.contacts);
    } catch (error) {
        console.log("Error fetching contacts:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// Adicionar um contato
router.post("/contacts", protectRoute, async (req, res) => {
    try {
        const { contactId } = req.body;

        if (!contactId) {
            return res.status(400).json({ message: "Provide a contact ID." });
        }

        const contact = await User.findById(contactId);
        if (!contact) {
            return res.status(404).json({ message: "User not found." });
        }

        if (contactId === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot add yourself." });
        }

        const user = await User.findById(req.user._id);

        if (user.contacts.map(id => id.toString()).includes(contactId)) {
            return res.status(400).json({ message: "Already in contacts." });
        }

        user.contacts.push(contactId);
        await user.save();

        res.status(201).json({ message: "Contact added." });
    } catch (error) {
        console.log("Error adding contact:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// Remover um contato
router.delete("/contacts/:id", protectRoute, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        user.contacts = user.contacts.filter(
            id => id.toString() !== req.params.id
        );

        await user.save();

        res.json({ message: "Contact removed." });
    } catch (error) {
        console.log("Error removing contact:", error);
        res.status(500).json({ message: "Server error." });
    }
});

export default router;