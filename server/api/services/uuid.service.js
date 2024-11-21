const { v4: uuidv4 } = require('uuid');
class UUIDService {
  static generate() {
    return uuidv4();
  }
}
module.exports = UUIDService;
