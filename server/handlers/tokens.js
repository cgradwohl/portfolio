
const _data = require('../lib/data');
const utils = require('../utils');

// Tokens handler
const tokens = {};

// Main request function, defines available http methods
tokens.request = function(data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        tokens.http[data.method](data, callback);
    } else {
        callback(405);    
    };
};

// Container for tokens http methods
tokens.http = {};

// Tokens - post
// Required data : phone, password
// Optional data : None
tokens.http.post = function(data, callback) {
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password) {
        // Lookup the user who matches that phone number
        _data.read('users', phone, (err, record) => {
            if(!err && record) {
                // has the sent password and compare to the pw in the record
                const hashedPassword = utils._hash(password);
                if(hashedPassword == record.hashedPassword) {
                    // create new token with random name, set exp for 1 hour
                    const tokenId = utils.createRandomString(20);
                    const exp = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': exp
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if(!err){
                            callback(200, tokenObject);
                        } else {
                            callback(500, {'Error': 'Could not create new token'});
                        };
                    });
                } else {
                    callback(400, {'Error': 'Password is invalid.'});
                };
            } else {
                callback(400, {'Error': 'Could not find the user.'});
            };
        });
    } else {    
        callback(400, {'Error': 'Missing required fields.'});
    };
};

// Tokens - get
// Required data : id
// Optional data : None
tokens.http.get = function(data, callback) {
    // Check that the id number is valid
    const id = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == 20 ? data.queryStringObj.id.trim() : false;
    if(id) {
        // Lookup the user
        _data.read('tokens', id, (err, record) => {
            if(!err && record) {
                // remove the hashed password from the user object before returning it to the requeser
                callback(200, record);
            } else {
                callback(404, {'Error': "Record not found."});
            };
        });
    } else {
        callback(400, {'Error': 'Missing fields or invalid data.'});
    };
}

// Tokens - put
// Required data : id, extend
// Optional data : None
tokens.http.put = function(data, callback) {
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    
    // Check if request has id and extend is in the payload
    if(id && extend) {
        _data.read('tokens', id, (err, record) => {
            if(!err && record) {
                // Check a valid token exists
                if(record.expires > Date.now()) {
                    record.expires = Date.now() + 1000 * 60 * 60;

                    _data.update('tokens', id, record, (err) => {
                        if(!err){
                            callback(200);
                        } else {
                            callback(500, {'Error' : 'Cannot update token expiration.'});
                        }
                    })
                } else {
                    callback(400, {'Error' : 'Token is expired'});
                };
            } else {
                callback(400, {'Error': 'Could not find the specified token.'});
            };
        });
         
    } else {
        callback(400, {'Error': 'Missing required field.'});
    };
    
};

// Tokens - delete
// Required data : id
// Optional data : none
tokens.http.delete = function(data, callback) {
    // Check that phone number is valid
    var id = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == 20 ? data.queryStringObj.id.trim() : false;
    if(id){
        // Lookup the user
        _data.read('tokens', id, (err,data) => {
            if(!err && data){
                _data.delete('tokens', id, (err) => {
                    if(!err){
                        callback(200);
                    } else {
                        callback(500,{'Error' : 'Could not delete the specified token.'});
                    };
                });
            } else {
                callback(400,{'Error' : 'Could not find the specified token.'});
            };
        });
    } else {
        callback(400,{'Error' : 'Missing required field.'});
    };
};

// Tokens - verifyToken
// Required data : id, phone
// Optional data : none
verifyToken = function(id, phone, callback) {
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData) {
            // check token ,matches phone
            if(tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        };
    });
};

module.exports = {
    tokens,
    verifyToken
};