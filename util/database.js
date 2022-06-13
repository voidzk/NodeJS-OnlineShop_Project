// const mongodb = require('mongodb');
// const MongoClient = mongodb.MongoClient;
// const config = require('../config/env');
// let _db;
// let mongoDbUrl = config.dbUrl;
// const mongoConnect = callback => {
//     MongoClient.connect(mongoDbUrl)
//         .then(client => {
//             console.log('Connected!');
//             _db = client.db();
//             callback();
//         })
//         .catch(err => {
//             console.log(err);
//             throw err;
//         });
// };

// const getDb = () => {
//     if (_db) return _db;
//     throw 'No DB Found!';
// };

// exports.mongoConnect = mongoConnect;
// exports.getDb = getDb;
// //-------------------------------------------
