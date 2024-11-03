const SharetribeService = require('../services/sharetribe.service');
const { types } = require('sharetribe-flex-sdk');
const UserService = require('../services/user.service');
const FollowsService = require('../services/follows.service');
const { UUID } = types;

const ADMIN_EMAIL = 'contact@leechy.app';

class CurrentUserController {
  static async delete(req, res, next) {
    try {
      const currentUserRes = await SharetribeService.getCurrentUser(req, res);
      const currentUser = currentUserRes.data;
      const { email } = currentUser.attributes;
      if (email === ADMIN_EMAIL) {
        res.status(400).send({
          message: `Deletion of an admin account belonging to ${email} is not permitted on here. You may only delete non-admin accounts from here.`,
        });
      } else {
        const deleteUser = await SharetribeService.deleteCurrentUser(req, res);
        res.send(deleteUser);
      }
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
      await SharetribeService.updateCurrentUser(req, res, {
        protectedData: {
          blockedUsers: {
            ...blockedUsers,
            [userToBlockUUID]: true,
          },
        },
      });
      const profileId = await UserService.searchIdWithUUID(userToBlockUUID);
      const followExists = await FollowsService.search({
        followedUserId: req.userId,
        followingUserId: profileId,
      });
      if (followExists && followExists.id) {
        await FollowsService.delete({ id: followExists.id });
      }
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
      await SharetribeService.updateCurrentUser(req, res, {
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
