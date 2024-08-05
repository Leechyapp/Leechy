class BaseRoute {
  ROOT_PATH = '/';
  constructor(path) {
    this.ROOT_PATH = this.ROOT_PATH + path;
  }
}
module.exports = BaseRoute;
