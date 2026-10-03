import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Formato novo (multi-páginas)
    imageUrls: {
        type: [String],
        default: [],
    },
    // Formato antigo (compatibilidade com mensagens já existentes)
    imageUrl: {
        type: String,
    },
    read: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;