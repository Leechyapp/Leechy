const SharetribeService = require('../services/sharetribe.service');
const { types } = require('sharetribe-flex-sdk');
const { UUID } = types;

class CurrentUserController {
  static async delete(req, res, next) {
    try {
      const deleteUser = await SharetribeService.deleteCurrentUser(req, res);
      res.send(deleteUser);
    } catch (error) {
      next(error);
    }
  }

  static async blockUser(req, res, next) {
    try {
      const { userToBlockUUID } = req.body;
      const currentUserRes = await SharetribeService.getCurrentUser(req, res);
      const currentUser = currentUserRes.data;
      const blockedUsersObj = currentUser?.attributes?.profile?.protectedData?.blockedUsers;
      const blockedUsers = blockedUsersObj ? blockedUsersObj : {};
      const updateBlockedUsers = await SharetribeService.updateCurrentUser(req, res, {
        protectedData: {
          blockedUsers: {
            ...blockedUsers,
            [userToBlockUUID]: true,
          },
        },
      });
      res.send('User blocked');
    } catch (error) {
      next(error);
    }
  }

  static async UnblockUser(req, res, next) {
    try {
      const { userToUnblockUUID } = req.body;
      const currentUserRes = await SharetribeService.getCurrentUser(req, res);
      const currentUser = currentUserRes.data;
      const blockedUsersObj = currentUser?.attributes?.profile?.protectedData?.blockedUsers;
      const blockedUsers = blockedUsersObj ? blockedUsersObj : {};
      delete blockedUsers[userToUnblockUUID];
      const updateBlockedUsers = await SharetribeService.updateCurrentUser(req, res, {
        protectedData: {
          blockedUsers: {
            ...blockedUsers,
          },
        },
      });
      res.send('User blocked');
    } catch (error) {
      next(error);
    }
  }

  static async getBlockedUsersList(req, res, next) {
    try {
      const currentUserRes = await SharetribeService.getCurrentUser(req, res);
      const currentUser = currentUserRes.data;
      const blockedUsersObj = currentUser?.attributes?.profile?.protectedData?.blockedUsers;
      const blockedUsers = blockedUsersObj ? blockedUsersObj : {};
      const blockedUsersList = new Array();
      for (const key in blockedUsers) {
        const user = await SharetribeService.showUser(req, res, { id: new UUID(key) });
        if (user) {
          blockedUsersList.push(user.data);
        }
      }
      res.send(blockedUsersList);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = CurrentUserController;
