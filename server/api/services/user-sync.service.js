const knexDB = require('../database/knexDB');

class UserSyncService {
  static async insert(currentUser, uuid) {
    const userData = {};
    userData.sharetribeUUID = uuid;
    const inserted = await knexDB('User').insert(userData);
    return inserted;
  }
}

module.exports = UserSyncService;
