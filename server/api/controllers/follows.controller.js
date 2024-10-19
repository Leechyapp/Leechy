const FollowsService = require('../services/follows.service');
const SharetribeService = require('../services/sharetribe.service');
const UserSyncService = require('../services/user-sync.service');
const UserService = require('../services/user.service');
const { types } = require('sharetribe-flex-sdk');
const { UUID } = types;

class FollowsController {
  static async searchInitialFollowsData(req, res, next) {
    try {
      const { sharetribeProfileUserId } = req.body;
      const profileId = await UserService.searchIdWithUUID(sharetribeProfileUserId.uuid);
      const followersCount = await FollowsService.getTotalCount({
        whereObj: {
          followingUserId: profileId,
        },
      });
      const followingCount = await FollowsService.getTotalCount({
        whereObj: {
          followedUserId: profileId,
        },
      });

      let isFollowing = false;
      if (req?.userId) {
        isFollowing = await FollowsService.searchIsCurrentUserFollowing(req.userId, profileId);
      }
      res.send({ followersCount, followingCount, isFollowing });
    } catch (error) {
      next(error);
    }
  }

  static async followUnfollowUser(req, res, next) {
    try {
      const { userId: currentUserId } = req;
      const { sharetribeProfileUserId } = req.body;

      let profileId = await UserService.searchIdWithUUID(sharetribeProfileUserId.uuid);

      if (currentUserId === profileId) {
        return res.status(400).send('You cannot follow yourself.');
      }

      if (!profileId) {
        const newProfileUser = await UserSyncService.insert({}, sharetribeProfileUserId.uuid);
        profileId = newProfileUser[0];
      }

      const followsObj = {
        followedUserId: currentUserId,
        followingUserId: profileId,
      };
      const followExists = await FollowsService.search(followsObj);
      if (followExists && followExists.id) {
        await FollowsService.delete({ id: followExists.id });
        res.send({ code: 'unfollowed' });
      } else {
        await FollowsService.insert(followsObj);
        res.send({ code: 'followed' });
      }
    } catch (error) {
      next(error);
    }
  }

  static async getFollowersList(req, res, next) {
    try {
      const { sharetribeProfileUserId, limit, offset } = req.body;
      const profileId = await UserService.searchIdWithUUID(sharetribeProfileUserId.uuid);
      const pager = await FollowsService.get({
        whereObj: {
          followingUserId: profileId,
        },
        limit,
        offset,
      });

      const followsList = pager.data;
      for (let i = 0; i < followsList.length; i++) {
        const { sharetribeUUID } = await UserService.search({
          id: followsList[i].followedUserId,
        });
        const sharetribeRes = await SharetribeService.showUser(req, res, {
          id: new UUID(sharetribeUUID),
          include: ['profileImage'],
          'fields.image': ['variants.square-small', 'variants.square-small2x'],
        });
        const user = sharetribeRes?.data;
        const included = sharetribeRes?.included;
        user.profileImage = included[0];

        followsList[i].user = user;

        if (req.userId && profileId) {
          followsList[i].following = await FollowsService.searchIsCurrentUserFollowing(
            req.userId,
            profileId
          );
        } else {
          followsList[i].following = false;
        }
      }
      res.send({
        data: followsList,
        count: pager.count,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFollowingList(req, res, next) {
    try {
      const { sharetribeProfileUserId, limit, offset } = req.body;
      const profileId = await UserService.searchIdWithUUID(sharetribeProfileUserId.uuid);
      const pager = await FollowsService.get({
        whereObj: {
          followedUserId: profileId,
        },
        limit,
        offset,
      });

      const followsList = pager.data;
      for (let i = 0; i < followsList.length; i++) {
        const { sharetribeUUID } = await UserService.search({
          id: followsList[i].followingUserId,
        });
        const sharetribeRes = await SharetribeService.showUser(req, res, {
          id: new UUID(sharetribeUUID),
          include: ['profileImage'],
          'fields.image': ['variants.square-small', 'variants.square-small2x'],
        });
        const user = sharetribeRes?.data;
        const included = sharetribeRes?.included;
        user.profileImage = included[0];

        followsList[i].user = user;

        if (req.userId === profileId) {
          followsList[i].following = true;
        } else if (req.userId && req.userId !== profileId) {
          followsList[i].following = await FollowsService.searchIsCurrentUserFollowing(
            req.userId,
            profileId
          );
        } else {
          followsList[i].following = false;
        }
      }

      res.send(pager);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FollowsController;
