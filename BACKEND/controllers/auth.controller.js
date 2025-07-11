import bcrypt from "bcrypt";
import User from "../MODELS/user.model.js";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
    const { email, fullName, password } = req.body;
    try {
        // console.log('Received signup request:', { email, fullName, password });
        if (!email || !fullName || !password) {
            return res.status(400).send('All fields are required');
        }
        if (password.length < 6) {
            return res.status(400).send('Password must be at least 6 characters long');
        }
        const user = await User.findOne({ email });
        if (user) {
            return await res.status(400).send('Email already exists');
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            email,
            fullName,
            password: hashedPassword
        });

        if (newUser) {
            generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                email: newUser.email,
                fullName: newUser.fullName,
                profilePic: newUser.profilePic,
            });
        }
        else {
            return res.status(400).send('User creation failed');
        }
    }
    catch (error) {
        console.error('Error during signup:', error.message);
        res.status(500).send('Internal server error');
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).send('Email and password are required');
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: 'Invalid email or password'
            });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: 'Invalid email or password'
            });
        }
        generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            profilePic: user.profilePic,
        });
    }
    catch (error) {
        console.error('Error during login:', error.message);
        return res.status(500).send('Internal server error');
    }
};

export const logout = (req, res) => {
    try {
        res.clearCookie("jwt", "", { maxAge: 0 });
        res.status(200).json({
            message: "Logged out successfully"
        });
    }
    catch {
        console.error('Error during logout:', error.message);
        return res.status(500).send('Internal server error');
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { profilePic } = req.body;
        const userId = req.user._id;
        if (!profilePic) {
            return res.status(400).json({ message: 'Profile picture is required' });
        }
        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePic: uploadResponse.secure_url },
            { new: true }
        );
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const checkAuth = (req, res) => {
    try{
        res.status(200).json(req.user);
    }
    catch (error) {
        console.error('Error checking authentication:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }   
}