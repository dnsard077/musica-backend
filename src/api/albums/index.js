const AlbumHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'albums',
  version: '1.0.0',
  register: async (server, {
    albumService, storageService, likesService, validator,
  }) => {
    const albumHandler = new AlbumHandler(albumService, storageService, likesService, validator);
    server.route(routes(albumHandler));
  },
};
