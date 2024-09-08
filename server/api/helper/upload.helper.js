const multerS3 = require('multer-s3');
const multer = require('multer');
const { uuid } = require('uuidv4');

const s3 = require('../utils/s3.util');

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: 'bucket-owner-full-control',
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.originalname,
      });
    },
    key: (req, file, cb) => {
      const filename = uuid() + '.jpeg';
      cb(null, filename);
    },
  }),
}).array('uploads[]', 5);

module.exports = upload;
