const SharetribeService = require('../services/sharetribe.service');

class CurrentUserController {
  static async delete(req, res, next) {
    try {
      const deleteUser = await SharetribeService.deleteCurrentUser(req, res);
      res.send(deleteUser);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = CurrentUserController;
