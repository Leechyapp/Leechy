const SendGridService = require('../services/sendgrid.service');

class ContactController {
  static async sendContactEmail(req, res, next) {
    try {
      const data = await SendGridService.sendEmail({
        userUUID: req.userUUID,
        ...req.body,
      });
      res.send(data);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = ContactController;
