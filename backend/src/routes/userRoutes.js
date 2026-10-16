import express from 'express';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import protectRoute from '../middleware/auth_middleware.js';

const router = express.Router();

router.get("/find", protectRoute, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: "Provide a code to search." });

    const user = await User.findOne({ username: code }).select("username profileImage");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot add yourself." });
    }

    const me = await User.findById(req.user._id);
    const alreadyContact = me.contacts.map(id => id.toString()).includes(user._id.toString());

    const pendingOut = await FriendRequest.findOne({ from: req.user._id, to: user._id });
    const pendingIn = await FriendRequest.findOne({ from: user._id, to: req.user._id });

    // Define o estado da relação com o usuário encontrado.
    let relationship = 'none';
    if (alreadyContact) relationship = 'contact';
    else if (pendingOut) relationship = 'pending-out';
    else if (pendingIn) relationship = 'pending-in';

    res.json({ ...user.toObject(), relationship });
  } catch (error) {
    console.log("Error finding user:", error);
    res.status(500).json({ message: "Server error." });
  }
});

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

router.delete("/contacts/:id", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const other = await User.findById(req.params.id);

    user.contacts = user.contacts.filter(id => id.toString() !== req.params.id);
    if (other) {
      other.contacts = other.contacts.filter(id => id.toString() !== req.user._id.toString());
      await other.save();
    }
    await user.save();
    res.json({ message: "Contact removed." });
  } catch (error) {
    console.log("Error removing contact:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/requests", protectRoute, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: "Provide a recipient." });
    if (to === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot add yourself." });
    }

    const recipient = await User.findById(to);
    if (!recipient) return res.status(404).json({ message: "User not found." });

    const me = await User.findById(req.user._id);
    if (me.contacts.map(id => id.toString()).includes(to)) {
      return res.status(400).json({ message: "Already in contacts." });
    }

    // Aceita automaticamente se já houver um convite recebido.
    const incoming = await FriendRequest.findOne({ from: to, to: req.user._id });
    if (incoming) {
      me.contacts.push(to);
      recipient.contacts.push(req.user._id);
      await me.save();
      await recipient.save();
      await incoming.deleteOne();
      return res.status(200).json({ message: "Request accepted.", autoAccepted: true });
    }

    const existing = await FriendRequest.findOne({ from: req.user._id, to });
    if (existing) {
      return res.status(400).json({ message: "Request already sent." });
    }

    const request = new FriendRequest({ from: req.user._id, to });
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    console.log("Error sending friend request:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/requests", protectRoute, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user._id })
      .populate("from", "username profileImage")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.log("Error fetching incoming requests:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/requests/sent", protectRoute, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ from: req.user._id })
      .populate("to", "username profileImage")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.log("Error fetching outgoing requests:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/requests/:id/accept", protectRoute, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }

    const me = await User.findById(req.user._id);
    const other = await User.findById(request.from);

    // Adiciona os dois usuários como contatos sem duplicar registros.
    if (!me.contacts.map(id => id.toString()).includes(other._id.toString())) {
      me.contacts.push(other._id);
    }
    if (!other.contacts.map(id => id.toString()).includes(me._id.toString())) {
      other.contacts.push(me._id);
    }

    await me.save();
    await other.save();
    await request.deleteOne();

    res.json({ message: "Request accepted." });
  } catch (error) {
    console.log("Error accepting request:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/requests/:id/reject", protectRoute, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }
    await request.deleteOne();
    res.json({ message: "Request rejected." });
  } catch (error) {
    console.log("Error rejecting request:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.delete("/requests/:id", protectRoute, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.from.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }
    await request.deleteOne();
    res.json({ message: "Request cancelled." });
  } catch (error) {
    console.log("Error cancelling request:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;