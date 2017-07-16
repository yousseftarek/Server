var mongo = require('mongodb').MongoClient;
var config = require('./config');
var DB = null;
var dbURL = config.database;

exports.connect = function connect(cb){
  mongo.connect(dbURL, function(err, db){
    if(!err){
      console.log("Database Online & Connected!");
      DB = db;
      cb(null, db);
    }
    else{
      cb(err);
    }
  })
}

exports.db = function db(){
  if(DB === null) throw Error('DB instance has not been initialized');
  return DB;
}

exports.clearDB = function clearDB(done){
  DB.listCollections().toArray().then(function(collections){
    collections.forEach(function(c){
      DB.collection(c.email).remove();
    });
    done();
  }).catch(done);
}
