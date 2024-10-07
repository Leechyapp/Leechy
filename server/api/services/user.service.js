const knexDB = require('../database/knexDB');

class UserService {
  static async searchIdWithUUID(uuid) {
    const user = await knexDB('User')
      .first()
      .select('id')
      .where({ sharetribeUUID: uuid });
    return user ? user.id : null;
  }

  static async search(whereObj, columns) {
    const user = await knexDB('User')
      .first()
      .select(columns)
      .where(whereObj);
    return user;
  }

  static async insert(dataObj) {
    const data = await knexDB('User').insert(dataObj);
    return data;
  }

  static async update(id, dataObj) {
    await knexDB('User')
      .update(dataObj)
      .where({ id });
  }
}

module.exports = UserService;
