import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
//o server criara um token contendo as informações do usuário
//o app guardará esse token e o enviará em cada requisição para provar a identidade


//função para gerar o token JWT
const generateToken = (id) => {
//gera o token com o id do usuario, a chave secreta e o tempo de expiração
   return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15d" });
}

//função para registrar um novo usuário
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
    
        if(!username || !email || !password){
            return res.status(400).json({ message: "Preencha todos os campos." });
        }
        if(password.length < 8){
            return res.status(400).json({ message: "A senha deve ter no mínimo 8 caracteres." });
        }
        if(username.length < 4){
            return res.status(400).json({ message: "O nome de usuário deve ter no mínimo 4 caracteres." });
        }

        //verificar se o usuario já existe
        const emailExiste = await User.findOne({ email });
        if(emailExiste){
            return res.status(400).json({ message: "Email já cadastrado." });
        }

        const usernameExiste = await User.findOne({ username });
        if(usernameExiste){
            return res.status(400).json({ message: "Nome de usuário já cadastrado." });
        }

        //imagem de perfil usando o serviço DiceBear
        // const imgPerfil = `https://api.dicebear.com/9.x/personas/svg?seed=${username}&scale=90&backgroundColor=lightBlue,lightGreen,lightYellow,lightGray,lightPink`;
        const profileImage = `https://api.dicebear.com/9.x/icons/svg?seed=${username}`;
        
        const user = new User({
            username,
            email,
            password,
            profileImage,
        });

      await user.save();

        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
            }
        })
    } catch (error) {
        console.log("Erro no registro do usuário:", error);
        res.status(500).json({ message: "Erro no servidor. Tente novamente mais tarde." });
        
    }
}); 

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if(!email || !password){
            return res.status(400).json({ message: "Preencha todos os campos." });
        }

        const user = await User.findOne({ email });
        if(!user){
            return res.status(400).json({ message: "Email ou senha inválidos." });
        }

        const isMatch = await user.matchPassword(password);
        if(!isMatch){
            return res.status(400).json({ message: "Email ou senha inválidos." });
        }

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
            }
        })
    } catch (error) {
        console.log("Erro no login do usuário:", error);
        res.status(500).json({ message: "Erro no servidor. Tente novamente mais tarde." });
    }
});

export default router;