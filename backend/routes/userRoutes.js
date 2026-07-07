const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../middleware/upload");
const {
    register,
    login,
    refresh,
    logout,
    getProfile,
    changeProfilePicture,
} = require("../controllers/userController");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", auth, logout);
router.get("/me", auth, getProfile);

router.put(
    "/change-profile-picture",
    auth,
    upload.single("profile"),
    uploadToCloudinary,
    changeProfilePicture
);

module.exports = router;
