const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const storage = multer.memoryStorage();

const multerInstance = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only jpg, png, and webp images are allowed"), false);
        }
    },
});

// Wrap multer v2 in a Promise — fixes "next is not a function" with Express v5
const upload = {
    single: (fieldName) => (req, res, next) => {
        multerInstance.single(fieldName)(req, res, (err) => {
            if (err) return next(err);
            next();
        });
    },
};

// Upload buffer to Cloudinary v2 via stream
const uploadToCloudinary = (req, res, next) => {
    if (!req.file) return next();

    const stream = cloudinary.uploader.upload_stream(
        { folder: "profile-pictures" },
        (error, result) => {
            if (error) return next(error);
            req.file.path = result.secure_url;
            req.file.filename = result.public_id;
            next();
        }
    );

    Readable.from(req.file.buffer).pipe(stream);
};

module.exports = { upload, uploadToCloudinary };
