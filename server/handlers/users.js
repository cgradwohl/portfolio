const _data = require('../lib/data');
const utils = require('../utils');
const verifyToken = require('./tokens').verifyToken;

// Users handler container
const users = {};

// Users request handler
users.request = function(data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        users.http[data.method](data, callback);
    } else {
        callback(405);    
    };
};

// Container for users sub methods
users.http = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
users.http.post = function(data, callback) {
    // Check that all required fields are filled out
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false; 
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && tosAgreement) {
        // Make sure user doesn't already exist 
        _data.read('users', phone, (err, data) => {
            if(err){
                // Hash the password
                const hashedPassword = utils._hash(password);
                
                if(hashedPassword) { 
                    // Create user object
                    const userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone':phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };

                    _data.create('users', phone, userObject, (err) => {
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'A user'})
                        };
                    });
                } else {
                    callback(500, {'Error': 'Could not hash the password.'});
                };
            } else {
                callback(400, {'Error':'A user with that phone number already exists.'});
            };
        });
    } else {
        callback(400, {'Error': 'Missing required fields.'});
    };
};

// Users - get
// Required data: phone
// Optional data: none
users.http.get = function(data, callback) {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObj.phone) == 'string' && data.queryStringObj.phone.trim().length == 10 ? data.queryStringObj.phone.trim() : false;
    if(phone) {

        // Get the token form the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        verifyToken(token, phone, (validToken) => {
            if(validToken){
                // Lookup the user
                _data.read('users', phone, (err, record) => {
                    if(!err && data){
                        // remove the hashed password from the user object before returning it to the requeser
                        delete record.hashedPassword;
                        callback(200, record);
                    } else {
                        callback(404, {'Error': "Record not found."});
                    };
                });
            } else {
                callback(403, {'Error' : 'Missing required token in header.'});
            };
        });
    } else {
        callback(400, {'Error': 'Missing phone number or invalid data.'});
    };
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
users.http.put = function(data, callback) {
    // check for required field
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    
    // Check for the optional fields
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false; 
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    // Error if the phone is invalid
    if(phone) {
        // Error of nothing is sent to update
        if(firstName || lastName || password) {
             // Get the token form the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            verifyToken(token, phone, (validToken) => {
                if(validToken){ 
                    // lookup the user
                    _data.read('users', phone, (err, record) => {
                        if(!err && record) {
                            // Update the fields
                            if(firstName){
                                record.firstName = firstName;
                            }
                            if(lastName){
                                record.lastName = lastName;
                            }
                            if(password){
                                record.hashedPassword = utils.hash(password);
                            }

                            // Store new updates, persisit to disk
                            _data.update('users', phone, record, (err) => {
                                if(!err){
                                    callback(200);
                                } else {  
                                    console.log(err);  
                                    callback(500, {'Error': 'Could not update the user'});
                                }
                            })
                        } else {
                            callback(400, {'Error': 'The specified user does not exist'});
                        };
                    });
                } else {
                    callback(403, {'Error' : 'Missing required token in header.'});
                };
            });
        } else {
            callback(400, {'Error': 'Missing fields to update.'});
        };
    } else {
        callback(400, {'Error': 'Missing required field'});
    };
}; 

// Users - delete
// Required data: phone
// Optional data: none
users.http.delete = function(data, callback) {
    // Check that phone number is valid
    var phone = typeof(data.queryStringObj.phone) == 'string' && data.queryStringObj.phone.trim().length == 10 ? data.queryStringObj.phone.trim() : false;
    if(phone) {
        // Get the token form the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        verifyToken(token, phone, (validToken) => {
             if(validToken){  
                // Lookup the user
                _data.read('users', phone, (err,data) => {
                    if(!err && data) {
                        _data.delete('users', phone, (err) => {
                            if(!err) {
                                callback(200);
                            } else {
                                callback(500,{'Error' : 'Could not delete the specified user'});
                            };
                        });
                    } else {
                        callback(400,{'Error' : 'Could not find the specified user.'});
                    };
                });
            } else {
                callback(403, {'Error' : 'Missing required token in header.'});
            };
        });
    } else {
        callback(400,{'Error' : 'Missing required field'});
    };
}; 

module.exports = users;