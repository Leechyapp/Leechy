const { GetObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../utils/s3.util');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const URL_EXPIRATION_TIME = 120; // in seconds

class AwsService {
  static async generatePreSignedPutUrl(filename) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: filename,
    });
    // return await getSignedUrl(s3, command, { expiresIn: URL_EXPIRATION_TIME });
    return {};
  }
}
module.exports = AwsService;
