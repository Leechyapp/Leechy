const knexDB = require('../database/knexDB');

class FollowsService {
  static async get(queryConfig) {
    const { whereObj, offset, limit } = queryConfig;
    const data = await knexDB('Follows')
      .select('*')
      .where(whereObj)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit);
    return {
      data,
      count: await this.getTotalCount(queryConfig),
    };
  }

  static async search(whereObj, columns = ['*']) {
    const data = await knexDB('Follows')
      .first()
      .select(columns)
      .where(whereObj);
    return data;
  }

  static async searchIsCurrentUserFollowing(currentUserId, profileUserId) {
    const data = await knexDB('Follows')
      .first()
      .count({ count: 'id' })
      .where({
        followedUserId: currentUserId,
        followingUserId: profileUserId,
      });
    return data && data?.count > 0;
  }

  static async insert(dataObj) {
    const data = await knexDB('Follows').insert(dataObj);
    return data;
  }

  static async update(id, dataObj) {
    await knexDB('Follows')
      .update(dataObj)
      .where({ id });
  }

  static async delete(dataObj) {
    await knexDB('Follows')
      .where(dataObj)
      .del();
  }

  static async getTotalCount(queryConfig) {
    const { whereObj } = queryConfig;
    const data = await knexDB('Follows')
      .count({ count: 'id' })
      .where(whereObj)
      .first();
    return data.count;
  }
}

module.exports = FollowsService;
