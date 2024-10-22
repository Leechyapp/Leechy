const knexDB = require('../database/knexDB');

class FcmTokenService {
  static async getFcmTokenCount(fcmToken) {
    const tokenExists = await knexDB('FcmToken')
      .first()
      .count({ count: 'userId' })
      .where({ fcmToken: fcmToken });
    return tokenExists.count;
  }

  static async getUserFcmTokenMatch(fcmToken, userId) {
    const user = await knexDB('FcmToken')
      .first()
      .select('userId')
      .where({ fcmToken, userId });
    return user ? true : false;
  }

  static async getUserFcmToken(userId) {
    const user = await knexDB('FcmToken')
      .first()
      .select('fcmToken')
      .whereRaw(`userId = ? AND CURRENT_TIMESTAMP() < DATE_ADD(lastActive, interval 2 month)`, [
        userId,
      ])
      .orderBy('lastActive', 'DESC');
    return user ? user.fcmToken : null;
  }

  static async insertUserFcmToken(fcmToken, userId) {
    await knexDB('FcmToken').insert({
      fcmToken: fcmToken,
      userId: userId,
      lastActive: knexDB.raw('CURRENT_TIMESTAMP()'),
    });
  }

  static async updateLastActiveUserFcmToken(fcmToken, userId) {
    await knexDB('FcmToken')
      .update({ lastActive: knexDB.raw('CURRENT_TIMESTAMP()') })
      .where({ fcmToken, userId });
  }

  static async deleteUserWithFcmToken(fcmToken) {
    await knexDB('FcmToken')
      .where({ fcmToken })
      .del();
  }
}
module.exports = FcmTokenService;
