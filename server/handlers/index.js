const users = require('./users');
const tokens = require('./tokens');

// Handlers container
const handlers = {};

// Not found handler
handlers.notFound = (data, callback) => callback(404);

// Ping handler
handlers.ping = (data, callback) => callback(200);

// Users handler
handlers.users = (data, callback) => users.request(data, callback);

// Tokens handler
handlers.tokens = (data, callback) => tokens.request(data, callback);

// Export handlers module
module.exports = handlers;
