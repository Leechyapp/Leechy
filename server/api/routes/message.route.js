const MessageController = require('../controllers/message.controller');
const upload = require('../helper/upload.helper');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authTrxMiddleware } = require('../middlewares/authTrx.middleware');
const BaseRoute = require('./base.route');

class MessageRoute extends BaseRoute {
  constructor(router) {
    super('message');
    router.post(this.ROOT_PATH + '/save-files', upload, MessageController.saveFiles);
    router.post(
      this.ROOT_PATH + '/fetch-files',
      authMiddleware,
      authTrxMiddleware,
      MessageController.fetchFiles
    );
  }
}

module.exports = MessageRoute;
