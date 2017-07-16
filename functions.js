var db                  = require('./db.js');
var fs                  = require('fs');
var bcrypt              = require('bcrypt');

var mock_users          = require('./records/mock_users.json');
var mock_productivity   = require('./records/mock_productivity.json');
var mock_sleep_sensors  = require('./records/mock_sleep_sensors.json');
var mock_locations      = require('./records/mock_locations.json');
var mock_sleep          = require('./records/mock_sleep.json');
var mongo               = require('mongodb');

var moment              = require('moment');
// var users = require("./records/users.json");
// var sleepPatterns = require("./records/sleepPatterns.json");
// var locations = require("./records/locations.json");
// var locationRecords = require("./records/locationRecords.json");

moment().format();

exports.getUsersFromDB = function getUsersFromDB(cb) {
    db.db().collection("users").find().toArray(function(err, users) {
        cb(err, users);
    })
}

exports.createUser = function createUser(info, cb) {
    bcrypt.genSalt(10, function(err, salt) {
        if (!err) {
            bcrypt.hash(info.password, salt, function(err, hash) {
                if (!err) db.db().collection("users").insert({
                    email: info.email,
                    password: hash,
                    name: info.name,
                    gender: info.gender,
                    birthday: info.birthday,
                    home: info.home,
                    work: info.work,
                    tokens: info.tokens
                }, null, function(err, records){
                  if(!err){
                    cb(err, records.ops[0]);
                  }
                  else{
                    console.log(err);
                  }
                });
                else console.log(err);
            });
        } else {
            console.log(err);
        }
    });
}

exports.signIn = function signIn(email, password, cb) {
    db.db().collection("users").find({
        email: email
    }).toArray(function(err, usern) { //apparently we have to use the toArray() function to actually extract the data returned from the database. Sill don't know why.
        var user = usern[0];
        if (user === undefined) {
            console.log("No User Found.");
            cb(null);
        } else {
            bcrypt.compare(password, user.password, function(err, res) {
                if (!err) {
                    if (res) {
                        cb(user);
                    } else {
                        cb(null);
                    }
                } else {
                    console.log("Something Went Wrong When Comparing Passwords.", err);
                }
            });
        }
    });
}

exports.validateUser = function validateUser(email, password) {
    var user = db.db().collection("users").find({
        email: email
    });
    bcrypt.compare(password, user.password, function(err, res) {
        if (!err) return res;
        else console.log(err);
    })
}

exports.addFacebookToken = function addFacebookToken(userID, token, cb){
  var o_id = new mongo.ObjectID(info.recordID);

  db.db().collection("users").findAndModify({_id: o_id},[],
    {$push: {tokens: {token: token, provider: "Facebook", token_secret: ""}}},
     {new: true}, function(err, record){
       if (!err) {
         cb(null);
       } else {
         cb(err);
       }
     });
}

//--------------------------------------- Location Queries ----------------------------------------------

exports.getLocationsDay = function getLocationsDay(userId, date, cb){
  var temp = date.split("-");
  var year = parseInt(temp[0]);
  var month = parseInt(temp[1]);
  var day = parseInt(temp[2]);

  db.db().collection("locations").find({'updated_at.day':day, 'updated_at.month':month, 'updated_at.year':year, user_id:userId}).toArray(function(err, records){
    if(!err){
      cb(null, records);
    }
    else{
      cb(err, []);
    }
  });
}

exports.getLocationsMonth = function getLocationsMonth(userId, month, year, cb){

  db.db().collection("locations").find({'updated_at.month': parseInt(month), 'updated_at.year': parseInt(year), user_id: userId}).toArray(function(err, records){
    if(!err){
      cb(null, records);
    }
    else{
      cb(err, []);
    }
  });

}

exports.updateLocationRecord = function updateLocationRecord(info, cb){
  var o_id = new mongo.ObjectID(info.recordID);
  var date = info.date.split("-");
  var updated = {
    day: parseInt(date[2]),
    month: parseInt(date[1]),
    year: parseInt(date[0]),
    time: info.time,
    offset: "+2:00"
  };

  db.db().collection("locations").findAndModify({_id: o_id},[],
  {$set: {updated_lat: info.latitude, updated_long: info.longitude, 'updated_at.day': parseInt(date[2]),
   'updated_at.month': parseInt(date[1]), 'updated_at.year': parseInt(date[0]), 'updated_at.time': info.time}},
   {new: true}, function(err, record){
     if (!err) {
       cb(null, record);
     } else {
       cb(err, null);
     }
 });
}

exports.addLocationRecord = function addLocationRecord(record, cb) {
  var date = record.date.split("-");
  db.db().collection("locations").insert({
    provider: "User Provided",
    lat: record.lat,
    long: record.long,
    updated_lat: record.lat,
    updated_long: record.long,
    user_id: record.userID,
    issued_at: {
      day: parseInt(date[2]),
      month: parseInt(date[1]),
      year: parseInt(date[0]),
      time: record.time,
      offset: "+2:00"
    },
    created_at: {
      day: parseInt(date[2]),
      month: parseInt(date[1]),
      year: parseInt(date[0]),
      time: record.time,
      offset: "+2:00"
    },
    updated_at: {
      day: parseInt(date[2]),
      month: parseInt(date[1]),
      year: parseInt(date[0]),
      time: record.time,
      offset: "+2:00"
    }
  }, null, function(err, records){
    if(!err){
      cb(null, records.ops[0]);
    }
    else{
      console.log(err);
      cb(err, {});
    }
  });
}

//------------------------------------- Productivity Queries ---------------------------------------------


exports.autoAddProductivityRecord = function autoAddProductivityRecord(record, cb) {//---------bta3t fatma
    var date = record.start_date.split("-");
    var time = record.start_time.split(":");
    db.db().collection("productivity_records").insert({
      user_id: record.user_id,
      start_date: {
        day: parseInt(date[0]),
        month: parseInt(date[1]),
        year: parseInt(date[2])
      },
      start_time: {
        hour: parseInt(time[0]),
        minute: parseInt(time[1]),
        second: 0,
        offset: "+2:00"
      },
      category: record.category,
      duration: record.duration,
      productive: record.productive,
      activity: record.activity,
      source: record.source,
      location: {
        lat: "",
        long: ""
      },
      updated_productive: record.productive,
      updated_activity: record.activity
    }, null, function(err, records) {
      if(!err){
        cb(err, records.ops[0]);
      }
      else{
        console.log(err);
        cb(err, {});
      }
    });
  }

exports.getProductivityDay = function getProductivityDay(userId, date, cb){
  var temp = date.split("-");
  var year = parseInt(temp[0]);
  var month = parseInt(temp[1]);
  var day = parseInt(temp[2]);
  db.db().collection("productivity").find({user_id:userId, start_date: {day:day, month:month, year:year}}).toArray(function(err, records){
    if(!err){
      if (records != []) {

        getAverageFromProductivityRecords(records, function(productive, nonProductive, percentage){
          cb(null, records, productive, nonProductive, percentage);
        });

      } else {
        cb(null, [], {}, {}, {});
      }
    }
    else {
      cb(err, null);
    }
  })
}

exports.getProductivityMonth = function getProductivityMonth(userId, month, year, cb){
  db.db().collection("productivity").find({user_id:userId, 'start_date.month': parseInt(month), 'start_date.year': parseInt(year)}).toArray(function(err, records){
    if (!err) {
      if(records !== []){

        getAverageFromProductivityRecords(records, function(productive, nonProductive, percentage){
          cb(null, records, productive, nonProductive, percentage);
        });

      }
      else {
        cb(null, [], {}, {}, {});
      }
    } else {
      cb(err, null);
    }
  });
}

exports.updateProductivityRecord = function updateProductivityRecord(recordID, updatedProductive, updatedActivity, cb){
  var o_id = new mongo.ObjectID(recordID);
  db.db().collection("productivity").findAndModify({ _id: o_id }, [],
    {$set: {updated_activity: updatedActivity, updated_productive: updatedProductive}},
    {new:true}, function(err, record){
    if (!err) {
      cb(null, record);
    } else {
      cb(err, {});
    }
  })
}

exports.addProductivityRecord = function addProductivityRecord(record, cb) { //bta3et joe
  var date = record.date.split("-");
  var time = record.time.split(":");
  db.db().collection("productivity").insert({
    user_id: record.userID,
    start_date: {
      day: parseInt(date[0]),
      month: parseInt(date[1]),
      year: parseInt(date[2])
    },
    start_time: {
      hour: parseInt(time[0]),
      minute: parseInt(time[1]),
      second: parseInt(time[2]),
      offset: "+2:00"
    },
    category: record.category,
    duration: record.duration,
    productive: record.productive,
    activity: record.activity,
    source: record.source,
    location: {
      lat: "",
      long: ""
    },
    updated_productive: record.productive,
    updated_activity: record.activity
  }, null, function(err, records) {
    if(!err){
      cb(err, records.ops[0]);
    }
    else{
      console.log(err);
      cb(err, {});
    }
  });
}


function getAverageFromProductivityRecords(records, cb) {
  var averageProductive    = 0;
  var averageNonProductive = 0;
  var numberProductive     = 0;
  var numberNonProductive  = 0;
  var total                = 0;

  for (var i = 0; i < records.length; i++) {
    var duration = records[i].duration;
    var momentDuration = moment.duration(duration).asSeconds();
    total += momentDuration;
    if(records[i].updated_productive){
      averageProductive += momentDuration;
      numberProductive++;
    }
    else{
      averageNonProductive += momentDuration;
      numberNonProductive++;
    }
  }

  var percentage = {
    productive : (averageProductive*100)/total,
    nonProductive : (averageNonProductive*100)/total
  }

  console.log(percentage);

  var hours   = 0;
  var minutes = 0;

  var nonProductive = {
    hours: 0,
    minutes: 0
  };
  var productive    = {
    hours: 0,
    minutes: 0
  };

  var totalTime     = {
    hours: 0,
    minutes: 0
  }

  if(averageNonProductive != 0){
    averageNonProductive = averageNonProductive/numberNonProductive;
    nonProductive.hours = Math.floor(averageNonProductive/3600);
    averageNonProductive = averageNonProductive - (hours*3600);
    nonProductive.minutes = Math.floor(averageNonProductive/60);
  }

  if(averageProductive != 0){
    averageProductive = averageProductive/numberNonProductive;
    productive.hours = Math.floor(averageProductive/3600);
    averageProductive = averageProductive - (hours*3600);
    productive.minutes = Math.floor(averageProductive/60);
  }

  if(total != 0){
    total.hours = Math.floor(total/3600);
    total = total - (hours*3600);
    total.minutes = Math.floor(total/60);
  }

  cb(productive, nonProductive, percentage);
}

//-------------------------------------- Sleep Queries -------------------------------------------

//------------ Rowan --------------------
exports.addSleepTime = function addSleepTime(info , cb) {
  var o_id = new mongo.ObjectID(info.sleep_id);
  var StartDateTemp = info.start_date.split("-");
  var EndDateTemp = info.end_date.split("-");
  var StartTimeTemp = info.start_time.split(":");
  var EndTimeTemp = info.end_time.split(":");
  var startdate = {
    day: parseInt(StartDateTemp[0]),
    month: parseInt(StartDateTemp[1]),
    year: parseInt(StartDateTemp[2])
  }
  var enddate = {
    day: parseInt(EndDateTemp[0]),
    month: parseInt(EndDateTemp[1]),
    year: parseInt(EndDateTemp[2])
  }
  var starttime = {
    hour: parseInt(StartTimeTemp[0]),
    minute :parseInt(StartTimeTemp[1]),
    second : parseInt("0"+"0") ,
    offset : info.offset
  }
  var endtime = {
    hour: parseInt(EndTimeTemp[0]),
    minute :parseInt(EndTimeTemp[1]),
    second : parseInt("00") ,
    offset : info.offset
  }
  var startday = info.start_day;
  var duration = info.duration;
  // console.log(info.sleep_id);
  // get the pervious record ... al id sa7
  db.db().collection("sleep_sensors").find({user_id: info.user_id , _id: o_id})
  .toArray(function (err , records) {
    if(!err){

      // console.log(records);  // bygeeb al record !!!
      if(records[0] != null){
        var startdateold = records[0].start_date;
        var starttimeold = records[0].start_time;
        // console.log(records[0].start_time);

        var startdayold = records[0].start_day;
        var endtimeold = records[0].end_time;
        var temps = starttime.hour + ":" + starttime.minute + ":" + starttime.second ;
        var tempeo = records[0].end_time.hour + ":" + records[0].end_time.minute + ":" + records[0].end_time.second ;
        var startmoment = moment(temps, "HH:mm:ss");
        var endmomentold = moment(tempeo , "HH:mm:ss");
        // console.log(startmoment); //moment.invalid(/* [object Object] */) da la bytl3 w t2rebn al moshkla hena
        // console.log(endmomentold); // moment.invalid(/* undefined */)
        // console.log(moment.duration(startmoment.diff(endmomentold))._data.minutes); // always equals zero
        // console.log("find if");
        // cb(null, records[0]);
        if(moment.duration(endmomentold.diff(startmoment))._data.minutes <= 2 && records[0].start_time.hour == starttime.hour && records[0].start_day == info.start_day)
        {
          // remove the pervious record law al difference is less than 5
          db.db().collection("sleep_sensors").remove({"_id" : o_id} , null , function (err) {
            if(!err)
            {
              // startdate = startdateold;
              // starttime = starttimeold;
              // startday =startdayold;
              var tempe = endtime.hour + ":" + endtime.minute + ":" + endtime.second ;
              var tempso = records[0].start_time.hour + ":" + records[0].start_time.minute + ":" + records[0].start_time.second ;
              var endmoment = moment(tempe, "HH:mm:ss");
              var startmomentold = moment(tempso ,"HH:mm:ss" )
            // console.log(endmoment);
              duration = moment.duration(endmoment.diff(startmomentold))._data.hours + ":" + moment.duration(endmoment.diff(startmomentold))._data.minutes + ":" + moment.duration(endmoment.diff(startmomentold))._data.seconds;
              // console.log(duration);
              // console.log("delete if");
                // cb(null, {} );
              db.db().collection("sleep_sensors").insert({
                user_id:info.user_id,
                start_date:startdateold,
                start_time:starttimeold,
                end_time:endtime,
                end_date:enddate,
                duration:duration,
                start_day:startdayold,
                end_day:info.end_day
              }, null , function (err , records) {
                if(!err){

                  // console.log("sucess" );
                  // console.log("insert if");
                    console.log(sucess);
                  cb(null, records.ops[0]);

                }
                else {
                  // console.log("while inserting a record in sleep_sensors" + err);
                  // console.log("insert else");
                    console.log(err);
                  cb(err, {});
                }

              });            }
          else {
            // console.log("delete else");
            console.log(err);
            cb(err, {});
          }
        });

        }
        else {
          db.db().collection("sleep_sensors").find({user_id: info.user_id , _id: o_id})
          .toArray(function (err , records) {
            if(!err){
            db.db().collection("sleep").insert({
              user_id:records[0].user_id,
              start_date:records[0].start_date,
              start_time:records[0].start_time,
              end_time:records[0].end_time,
              end_date:records[0].end_date,
              duration:records[0].duration,
              start_day:records[0].start_day,
              end_day:records[0].end_day,
              updated_start_date:records[0].start_date,
              updated_start_time:records[0].start_time,
              updated_end_time:records[0].end_time,
              updated_end_date:records[0].end_date,
              updated_duration:records[0].duration,
              updated_start_day:records[0].start_day,
              updated_end_day:records[0].end_day
            }) ,null , function (err) {
              if(!err){
                  console.log("sucess");
                cb(null, records[0]);
              }
              else{
                  console.log(err);
                  cb(err, {});
              }
            }

            }
            else {
                console.log(err);
                cb(err, {});
            }
          });
          db.db().collection("sleep_sensors").insert({
            user_id:info.user_id,
            start_date:startdate,
            start_time:starttime,
            end_time:endtime,
            end_date:enddate,
            duration:info.duration,
            start_day:startday,
            end_day:info.end_day
          }, null , function (err , records) {
            if(!err){

              console.log("sucess" );
              // console.log("insert if");
              cb(null, records.ops[0]);

            }
            else {
              // console.log("while inserting a record in sleep_sensors" + err);
              // console.log("insert else");
                console.log(err);
              cb(err, {});
            }

          });
        }

      }
else {
  db.db().collection("sleep_sensors").insert({
    user_id:info.user_id,
    start_date:startdate,
    start_time:starttime,
    end_time:endtime,
    end_date:enddate,
    duration:info.duration,
    start_day:startday,
    end_day:info.end_day
  }, null , function (err , records) {
    if(!err){

      console.log("sucess" );
      // console.log("insert if");
      cb(null, records.ops[0]);

    }
    else {
      console.log("while inserting a record in sleep_sensors" + err);
      // console.log("insert else");
        console.log(err);
      cb(err, {});
    }

  });
}
    }else{
      console.log(err);
      // console.log("find else");


    }

  });




// add the new record


}

exports.deleteDuplicates = function deleteDuplicates (info , cb ){
  var StartDateTemp = info.start_date.split("-");
  var EndDateTemp = info.end_date.split("-");
  var StartTimeTemp = info.start_time.split(":");
  var EndTimeTemp = info.end_time.split(":");
  var  dayS = parseInt(StartDateTemp[0]);
  var  monthS= parseInt(StartDateTemp[1]);
  var  yearS =parseInt(StartDateTemp[2]);

  var  dayE = parseInt(EndDateTemp[0]);
  var  monthE= parseInt(EndDateTemp[1]);
  var  yearE= parseInt(EndDateTemp[2]);


  var  hourS= parseInt(StartTimeTemp[0]);
  var  minuteS =parseInt(StartTimeTemp[1]);
  var    secondS = parseInt("0"+"0") ;
  var    offset = info.offset;

  var    hourE= parseInt(EndTimeTemp[0]);
  var    minuteE =parseInt(EndTimeTemp[1]);
  var    secondE = parseInt("00") ;
  var userID = info.user_id  ;

  db.db().collection("sleep_sensors").remove({'start_date.day':dayS , 'start_date.month':monthS , 'start_date.year':yearS , 'end_date.day':dayE , 'end_date.month':monthE , 'end_date.year':yearE , 'start_time.hour':hourS , 'start_time.minute':minuteS ,  'start_time.offset':offset ,
'end_time.hour':hourE , 'end_time.minute':minuteE ,  'end_time.offset':offset , 'user_id':userID } , null , function (err) {
  if(!err){
    cb(null, {});
    console.log("sucess" );
  }
  else {
    console.log("while deleting  records in sleep_sensors" + err);
    cb(err, {});
  }
});
}
//----------------------------------------

exports.getSleepDay = function getSleepDay(userId, date, cb){
  var temp = date.split("-");
  var day = parseInt(temp[2]);
  var month = parseInt(temp[1]);
  var year = parseInt(temp[0]);

  db.db().collection("sleep")
  .find({user_id: userId, 'start_date.day': day, 'start_date.month': month, 'start_date.year': year, 'start_time.hour': {$lt: 12}})
  .toArray(function(err, records) {
    if (!err) {
      var today = moment(temp);
      var yesterday = today.subtract(1, "days");//create a moment.js date from the submitted date and subtract a day then save it in a var.
      var yesterdayString = yesterday.format("yyyy-MM-dd");
      var dayYesterday = parseInt(temp[2]);
      var monthYesterday = parseInt(temp[1]);
      var yearYesterday = parseInt(temp[0]);

      db.db().collection("sleep").find({user_id: userId, 'start_date.day': dayYesterday,
       'start_date.month': monthYesterday, 'start_date.year': yearYesterday, 'start_time.hour': {$gte: 12, $lte: 23}})
       .toArray(function(err, newRecords){
         if (!err) {
           newRecords.push.apply(newRecords, records);
           cb(null, newRecords);
         } else {
          console.log(err);
          cb(err, {});
         }
       });

    } else {
      console.log(err);
      cb(err, {});
    }
  });
}

exports.getSleepMonth = function getSleepMonth(userId, month, year, cb) {
  db.db().collection("sleep")
  .find({user_id: userId, 'start_date.month': parseInt(month), 'start_date.year': parseInt(year)})
    .toArray(function(err, records) {
      if (!err) {
        cb(null, records);
      } else {
        console.log(err);
        cb(err, {});
      }
    });
}

function getSleepMonthData(records){
  var data = new Array(31);
  var temp = moment.duration("00:00:00");
  var currDay = 1;
  var recordDuration = moment.duration("00:00:00");
  var remainingDuration;
  records.forEach(function(record, index){
    recordDuration.add(moment.duration(record.duration));
    if (record.updated_start_date.day == currDay) {
      if (record.updated_end_date.day == record.updated_start_date) {
        temp.add(recordDuration);
      } else {
        var startHour = standardizeTimeToString(record.updated_start_time.hour);
        var startMinute =  standardizeTimeToString(record.updated_start_time.minute);
        var startSecond =  standardizeTimeToString(record.updated_start_time.second);

        var startDay = standardizeTimeToString(record.updated_start_date.day) + "-" + standardizeTimeToString(record.updated_start_date.month) + "-" + record.updated_start_date.year;
        var startTime = startHour + ":" + startMinute + ":" + startSecond;
        var startMoment = moment(startDay + " " + startTime, "DD-MM-YYYY HH:mm:ss");
        var midnight = moment(startDay + " " + startTime, "DD-MM-YYYY HH:mm:ss");
        midnight.add(1, 'd');
        midnight.subtract(record.updated_start_time.hour, 'h').subtract(record.updated_start_time.minute, 'm').subtract(record.updated_start_time.second, 's');
        var newDuration = moment(midnight.diff(startMoment)).format("HH:mm:ss");
        remainingDuration = recordDuration.subtract(moment.duration(newDuration)).format("HH:mm:ss");

      }
    }
    var duration = moment.duration(record.duration).asHours(); //continue here; getting the duration and adding it to the array. Need to add checking for the day of each record and grouping durations.
  });
}

function standardizeTimeToString(time){
  if (time<10) {
    return "0" + time;
  } else {
    return "" + time;
  }
}

exports.addSleepRecord = function addSleepRecord(record, cb) { //doesn't handle adding a record that overlaps with one in the DB.

  var startHour = ((record.start_time.hour < 10) ? "0" + record.start_time.hour : "" + record.start_time.hour);
  var startMinute = ((record.start_time.minute < 10) ? "0" + record.start_time.minute : "" + record.start_time.minute);
  var startSecond = "0" + record.start_time.second;
  var startString = startHour+":" + startMinute + ":" + startSecond;

  var endHour = ((record.end_time.hour < 10) ? "0" + record.end_time.hour : "" + record.end_time.hour);
  var endMinute = ((record.end_time.minute < 10) ? "0" + record.end_time.minute : "" + record.end_time.minute);
  var endSecond = "0" + record.end_time.second;
  var endString = endHour+":" + endMinute + ":" + endSecond;

  var startMoment = moment(startString, "HH:mm:ss");
  var endMoment = moment(endString, "HH:mm:ss");
  //console.log(start.format("HH:mm:ss"));

  if(endMoment.isBefore(startMoment)) endMoment.add(1, 'day');

  var Duration = moment.duration(endMoment.diff(startMoment));

  var temp = record.start_date.split("-");
  var temp2 = record.end_date.split("-");

  db.db().collection("sleep")
  .insert({
    user_id: record.userID,
    start_date: {
      day: parseInt(temp[2]),
      month: parseInt(temp[1]),
      year: parseInt(temp[0])
    },
    start_time: {
      hour: parseInt(startHour),
      minute: parseInt(startMinute),
      second: parseInt(startSecond)
    },
    end_date: {
      day: parseInt(temp2[2]),
      month: parseInt(temp2[1]),
      year: parseInt(temp2[0])
    },
    end_time : {
      hour: parseInt(endHour),
      minute: parseInt(endMinute),
      second: parseInt(endSecond)
    },
    duration : Duration.format("HH:mm:ss"),
    updated_start_date: {
      day: parseInt(temp[2]),
      month: parseInt(temp[1]),
      year: parseInt(temp[0])
    },
    updated_start_time: {
      hour: parseInt(startHour),
      minute: parseInt(startMinute),
      second: parseInt(startSecond)
    },
    updated_end_date: {
      day: parseInt(temp2[2]),
      month: parseInt(temp2[1]),
      year: parseInt(temp2[0])
    },
    updated_end_time : {
      hour: parseInt(endHour),
      minute: parseInt(endMinute),
      second: parseInt(endSecond)
    },
    updated_duration : Duration.format("HH:mm:ss")
  }, null, function(err, records){
    if(!err){
      cb(null, records.ops[0]);
    }
    else {
      console.log(err);
      cb(err, {});
    }
  });
}

// exports.getSleepNight = function getSleepNight(userId, date, cb){
//   var temp = date.split("-");
// }

//------------------------- Tasks Data----------------------------

exports.addTask = function addTask(task, cb) {
  db.db().collection("tasks").insert(task, null, function(err, records){
    if (!err) {
      cb(null, records.ops[0]);
    } else {
      console.log(err);
      cb(err, {});
    }
  });
}

exports.getTasksDay = function getTasksDay(userId, date, cb){
  var temp = date.split("-");
  var day = parseInt(temp[2]);
  var month = parseInt(temp[1]);
  var year = parseInt(temp[0]);

  db.db().collection("tasks")
  .find({user_id: userId, 'date.day': day, 'date.month': month, 'date.year': year})
  .toArray(function(err, records){
    if (!err) {
      cb(null, records.ops[0]);
    }
    else{
      console.log(err);
      cb(err, []);
    }
  });
}

//------------------------------- Meal Data ------------------------
exports.addMeal = function addMeal(meal, cb){
  db.db().collection("meals").insert(meal, null, function(err, records){
    if(!err){
      cb(null, records.ops[0]);
    }
    else{
      console.log(err.message);
      cb(err, {});
    }
  });
}

exports.getMealsDay = function getMealDay(userId, date, cb){
  var temp = date.split("-");
  var day = parseInt(temp[2]);
  var month = parseInt(temp[1]);
  var year = parseInt(temp[0]);

  db.db().collection("meals")
  .find({user_id: userId, 'date.day': day, 'date.month': month, 'date.year': year})
  .toArray(function(err, records){
    if(!err){
      cb(null, records);
    }
    else{
      console.log(err);
      cb(err, []);
    }
  });
}

//------------------------------------- Mood Functions --------------------------------------------------

exports.addMoodRecord = function addMoodRecord(record, cb) {
  db.db().collection("mood").insert(record, null, function(err, records){
    if (!err) {
      cb(null, records.ops[0]);
    } else {
      console.log(err);
      cb(err, {});
    }
  });
}

exports.getMoodDay = function getMoodDay(userId, date, cb) {
  var temp = date.split("-");
  var day = parseInt(temp[0]);
  var month = parseInt(temp[1]);
  var year = parseInt(temp[2]);

  db.db().collection("mood")
  .find({user_id: userId, 'date.day': day, 'date.month': month, 'date.year': year})
  .toArray(function(err, records){
    if(!err){
      cb(null, records);
    }
    else {
      console.log(err);
      cb(err, []);
    }
  });
}

//------------------------------------- Retrieving All Data At Once ------------------------------------------------

exports.getDay = function getDay(userId, date, cb) {
  var records = [];
  var temp = date.split("-");
  var day = parseInt(temp[2]);
  var month = parseInt(temp[1]);
  var year = parseInt(temp[0]);
//, 'start_time.hour': {$lt: 12}
  db.db().collection("sleep")
  .find({user_id: userId, 'start_date.day': day, 'start_date.month': month, 'start_date.year': year})
  .toArray(function(sleepErr, sleepRecords){
    if(!sleepErr){
      if (sleepRecords.length > 0) {
        var tempSleepRecord = {};
        var tempDuration;
        var tempSleepStart;
        var startHour;
        var startMinute;
        var startSecond;
        var startString;
        sleepRecords.forEach(function(sleepRecord, index){
          tempDuration = moment.duration(sleepRecord.updated_duration).asSeconds();

          startHour = ((sleepRecord.updated_start_time.hour < 10) ? "0" + sleepRecord.updated_start_time.hour : "" + sleepRecord.updated_start_time.hour);
          startMinute = ((sleepRecord.updated_start_time.minute < 10) ? "0" + sleepRecord.updated_start_time.minute : "" + sleepRecord.updated_start_time.minute);
          startSecond = ((sleepRecord.start_time.second < 10) ? "0" + sleepRecord.start_time.second : "" + sleepRecord.start_time.second);
          startString = startHour+":" + startMinute + ":" + startSecond;

          tempSleepRecord = {
            recordType : "SLEEP",
            recordID : sleepRecord._id,
            start_time_object : sleepRecord.updated_start_time,
            start_time_moment : moment(date + " " + startString + " +0000", "YYYY-MM-DD HH:mm:ss Z"),
            duration_verbose : sleepRecord.updated_duration,
            duration : tempDuration,
            end_time_object: sleepRecord.updated_end_time
          };

          records.push(tempSleepRecord);
        });
      } else {
        console.log("No Sleep Records.");
      }

      db.db().collection("productivity")
      .find({user_id:userId, start_date: {day:day, month:month, year:year}})
      .toArray(function(productivityErr, productivityRecords){
        if (!productivityErr) {
          if (productivityRecords.length > 0) {
            var tempProductivityRecord = {};
            var tempDuration;
            var tempProductivityStart;
            var startHour;
            var startMinute;
            var startSecond;
            var startString;

            productivityRecords.forEach(function(productivityRecord, index){
              tempDuration = moment.duration(productivityRecord.duration).asSeconds();

              startHour = ((productivityRecord.start_time.hour < 10) ? "0" + productivityRecord.start_time.hour : "" + productivityRecord.start_time.hour);
              startMinute = ((productivityRecord.start_time.minute < 10) ? "0" + productivityRecord.start_time.minute : "" + productivityRecord.start_time.minute);
              startSecond = ((productivityRecord.start_time.second < 10) ? "0" + productivityRecord.start_time.second : "" + productivityRecord.start_time.second);
              startString = startHour+":" + startMinute + ":" + startSecond;

              tempProductivityRecord = {
                recordType : "PRODUCTIVITY",
                recordID : productivityRecord._id,
                start_time_object : productivityRecord.start_time,
                start_time_moment : moment(date + " " + startString + " +0000", "YYYY-MM-DD HH:mm:ss Z"),
                duration_verbose : productivityRecord.duration,
                duration : tempDuration,
                source: productivityRecord.source
              }

              records.push(tempProductivityRecord);
            });
          } else {
            console.log("No Productivity Records");
          }

          db.db().collection("locations")
          .find({'created_at.day':day, 'created_at.month':month, 'created_at.year':year, user_id:userId})
          .toArray(function(locationErr, locationRecords){
            if(!locationErr){
              if (locationRecords.length > 0) {
                var tempLocationRecord = {};
                var tempDuration;
                var tempLocationStart;
                // var startDay;
                // var startMonth;
                // var startYear;
                 var startString;
                var startHour;
                var startMinute;
                var startSecond;

                locationRecords.forEach(function(locationRecord, index){

                  // startDay = ((locationRecord.created_at.day < 10) ? "0" + locationRecord.created_at.day : "" + locationRecord.created_at.day);
                  // startMonth = ((locationRecord.created_at.month < 10) ? "0" + locationRecord.created_at.month : "" + locationRecord.created_at.month);
                  // startYear = "" + locationRecord.created_at.year;
                  // startString = startYear + "-" + startMonth + "-" + startDay + " " + locationRecord.created_at.time;

                  startString =  locationRecord.created_at.time.split(":");
                  startHour = parseInt(startString[0]);
                  startMinute = parseInt(startString[1]);
                  startSecond = parseInt(startString[2]);

                  tempLocationRecord = {
                    recordType : "LOCATION",
                    recordID : locationRecord._id,
                    start_time_moment : moment(date + " " + locationRecord.created_at.time + " +0000", "YYYY-MM-DD HH:mm:ss Z"),
                    start_time_object: {
                      hour: startHour,
                      minute: startMinute,
                      second: startSecond,
                      offset: "+2:00"
                    },
                    location : {
                      latitude : locationRecord.updated_lat,
                      longitude: locationRecord.updated_long
                    }
                  }

                  records.push(tempLocationRecord);
                });
              } else {
                console.log("No Location Records!");
              }

              db.db().collection("tasks")
              .find({'date.day': day, 'date.month': month, 'date.year': year, user_id: userId})
              .toArray(function(tasksErr, taskRecords){
                if (!tasksErr) {
                  if(taskRecords.length > 0){
                    var tempTaskRecord = {};
                    var tempDuration;
                    var timeString;
                    var taskHour, taskMinute, taskSecond;
                    taskRecords.forEach(function(taskRecord, index) {
                      taskHour = (taskRecord.time.hour < 10) ? "0"+taskRecord.time.hour : ""+taskRecord.time.hour;
                      taskMinute = (taskRecord.time.minute < 10) ? "0"+taskRecord.time.minute : ""+taskRecord.time.minute;
                      taskSecond = (taskRecord.time.second < 10) ? "0"+taskRecord.time.second : ""+taskRecord.time.second;
                      timeString = taskHour + ":" + taskMinute + ":" + taskSecond;

                      taskHour = (taskRecord.duration.hour < 10) ? "0"+taskRecord.duration.hour : ""+taskRecord.duration.hour;
                      taskMinute = (taskRecord.duration.minute < 10) ? "0"+taskRecord.duration.minute : ""+taskRecord.duration.minute;
                      taskSecond = (taskRecord.duration.second < 10) ? "0"+taskRecord.duration.second : ""+taskRecord.duration.second;
                      tempDuration = taskHour + ":" + taskMinute + ":" + taskSecond;
                      tempTaskRecord = {
                        recordType: "TASK",
                        recordID: taskRecord._id,
                        start_time_moment: moment(date + " " + timeString + " +0000", "YYYY-MM-DD HH:mm:ss Z"),
                        start_time_object: {
                          hour: taskRecord.time.hour,
                          minute: taskRecord.time.minute,
                          second: taskRecord.time.second,
                          offset: "+2:00"
                        },
                        duration_verbose: tempDuration,
                        title: taskRecord.title
                      }

                      records.push(tempTaskRecord);
                    });
                  }
                  else{
                    console.log("No Task Records");
                  }

                  db.db().collection("meals")
                  .find({'date.day': day, 'date.month': month, 'date.year': year, user_id: userId})
                  .toArray(function(mealsErr, mealRecords){
                    if (!mealsErr) {
                      if(mealRecords.length > 0){
                        var tempMealRecord = {};
                        var tempDuration;
                        var timeString;
                        var mealHour, mealMinute, mealSecond;
                        mealRecords.forEach(function(mealRecord, index){
                          mealHour = (mealRecord.time.hour < 10) ? "0"+mealRecord.time.hour : ""+mealRecord.time.hour;
                          mealMinute = (mealRecord.time.minute < 10) ? "0"+mealRecord.time.minute : ""+mealRecord.time.minute;
                          mealSecond = (mealRecord.time.second < 10) ? "0"+mealRecord.time.second : ""+mealRecord.time.second;
                          timeString = mealHour + ":" + mealMinute + ":" + mealSecond;

                          tempMealRecord = {
                            recordType: "MEAL",
                            recordID: mealRecord._id,
                            start_time_moment: moment(date + " " + timeString + " +0000", "YYYY-MM-DD HH:mm:ss Z"),
                            start_time_object: {
                              hour: mealRecord.time.hour,
                              minute: mealRecord.time.minute,
                              second: mealRecord.time.second,
                              offset: "+2:00"
                            },
                            duration_verbose: mealRecord.duration,
                            type: mealRecord.type
                          }

                          records.push(tempMealRecord);
                        });
                      }
                      else{
                        console.log("No Meal Records");
                      }

                      //call the sorting function
                      sortRecords(records, function(sorted){
                        console.log(sorted);
                        cb(null, sorted);
                      });

                    } else {
                      console.log(mealsErr);
                      cb(mealsErr, []);
                    }
                  });

                } else {
                  console.log(tasksErr);
                  cb(tasksErr, []);
                }
              })


            } else {
              console.log("Error retrieving location records! ", locationErr);
              cb(locationErr, []);
            }
          });
        } else {
          console.log("Error retrieving productivity records! ", productivityErr);
          cb(productivityErr, []);
        }
      });
    }
    else {
      console.log("Error retrieving sleep records", err);
      cb(err, []);
    }
  });
}

function sortRecords(records, cb) {
  cb(mergeSort(records));
}

function mergeSort(records){
  if(records.length < 2){
    return records;
  }

  var middle = parseInt(records.length/2);
  var left = records.slice(0, middle);
  var right = records.slice(middle, records.length);

  return merge(mergeSort(left), mergeSort(right));
}

function merge(left, right){
  var result = [];

  while(left.length && right.length){
    if(left[0].start_time_moment.isBefore(right[0].start_time_moment)){
      result.push(left.shift());
    }
    else{
      result.push(right.shift());
    }
  }

  while(left.length){
    result.push(left.shift());
  }
  while (right.length) {
    result.push(right.shift());
  }

  return result;
}

//---------------------------------- Seeding DB ----------------------------------------
exports.seed = function(){
  // for (var i = 0; i < mock_users.length; i++) {
  //   var user = mock_users[i];
  //   user.password = "password";
  //   exports.createUser(user, function(err, user){
  //     if(user !== null){
  //       console.log("User: " + user.name + " entered in DB!");
  //     }
  //     else{
  //       console.log(err);
  //     }
  //   });
  // }
  // db.db().collection("productivity").insertMany(mock_productivity, null, function(err, records){
  //   if(!err){
  //     console.log(records);
  //   }
  //   else {
  //     console.log(err);
  //   }
  // })

  // db.db().collection("locations").insertMany(mock_locations, null, function(err, records){
  //   if(!err){
  //     console.log(records);
  //   }
  //   else{
  //     console.log(err);
  //   }
  // });

  // db.db().collection("sleep").insertMany(mock_sleep, null, function(err, records){
  //   if(!err){
  //     console.log(records);
  //   }
  //   else{
  //     console.log(err);
  //   }
  // });
}
