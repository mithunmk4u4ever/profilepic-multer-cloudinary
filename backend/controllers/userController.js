const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

const createTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_ACCESS_SECRET || "access-secret",
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || "refresh-secret",
        { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Email already registered" });
        }

        const user = await User.create({ name, email, password });
        const { accessToken, refreshToken } = createTokens(user);

        user.refreshToken = refreshToken;
        await user.save();

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const { accessToken, refreshToken } = createTokens(user);
        user.refreshToken = refreshToken;
        await user.save();

        res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: "Refresh token required" });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "refresh-secret");
        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ success: false, message: "Invalid refresh token" });
        }

        const tokens = createTokens(user);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.json({ success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (error) {
        res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
    }
};

exports.logout = async (req, res) => {
    try {
        const user = await User.findById(req.user?._id || req.body.userId);
        if (user) {
            user.refreshToken = null;
            await user.save();
        }

        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProfile = async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            profileImage: req.user.profileImage,
        },
    });
};

exports.changeProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.profileImage?.publicId) {
            await cloudinary.uploader.destroy(user.profileImage.publicId);
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        user.profileImage = {
            url: req.file.path,
            publicId: req.file.filename,
        };

        await user.save();

        res.json({
            success: true,
            message: "Profile picture updated successfully",
            profileImage: user.profileImage,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};