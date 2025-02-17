const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Import UUID for unique identifiers

// Configure Multer for file uploads
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/product-images/'); // Directory for storing uploaded images
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using UUID and file's original extension
    cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`);
  },
});

let upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Validate file type (accept only images)
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (extname && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed!'));
    }
  },
});

module.exports = upload;
