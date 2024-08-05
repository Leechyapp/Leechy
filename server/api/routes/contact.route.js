const ContactController = require('../controllers/contact.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const BaseRoute = require('./base.route');

class ContactRoute extends BaseRoute {
  constructor(router) {
    super('contact');
    router.post(
      this.ROOT_PATH + '/send-contact-email',
      authMiddleware,
      ContactController.sendContactEmail
    );
  }
}

module.exports = ContactRoute;
