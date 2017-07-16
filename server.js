var express     = require("express");
var app         = require("./app.js").app;
var functions   = require("./functions.js");
var db          = require("./db.js");
var bodyparser  = require('body-parser');
var config      = require('./config');
var jwt         = require('jsonwebtoken');
var morgan      = require('morgan');

var port = process.env.PORT || 8080; //Setting the port number

db.connect(function(err, database) { //Connecting to the database
    if (err) {
        console.log(err);
    }
    else{
      //functions.seed();
    }
});

app.set('superSecret', config.secret); //Setting a secret variable to authenticate tokens

app.use(bodyparser.urlencoded({
    extended: false
}));
app.use(bodyparser.json());
app.use(morgan('dev')); //used to log requests to the console.


var apiRoutes = express.Router();

apiRoutes.post('/authenticate', function(req, res) {
    functions.signIn(req.body.email, req.body.password, function(user) {
        if (user !== null) {
            var token = jwt.sign(user, app.get('superSecret'), {
                expiresIn: 60 * 60 * 12
            });
            res.json({
                success: true,
                user: user,
                token: token
            });
        } else {
            res.json({
                success: false,
                message: "Sorry Fam. Wrong email or password."
            });
        }
    });
});

apiRoutes.post('/signup', function(req, res) {
  var userInfo = {
    name: req.body.name,
    birthday: req.body.birthday,
    email: req.body.email,
    password: req.body.password,
    gender: req.body.gender,
    home: {
      lat: "",
      long: ""
    },
    work: {
      lat: "",
      long: ""
    },
    tokens: {}
  };
  functions.createUser(userInfo, function(err, user){
    if(user !== null){
      var token = jwt.sign(user, app.get('superSecret'), {
          expiresIn: 60 * 60 * 1
      });
      res.json({
          success: true,
          user: user,
          token: token
      });
    }
    else{
      res.json({
          success: false,
          user: user,
          token: ""
      });
    }
  });
});

apiRoutes.use(function(req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {
            if (err) {
                return res.json({
                    success: false,
                    cause: "TOKEN FAIL",
                    message: "Failed to authenticate token."
                })
            } else {
                req.decoded = decoded;
                next();
            }
        })
    } else {
        return res.status(403).send({
            success: false,
            message: "No token Provided."
        });
    }
});

apiRoutes.post('/addFacebookToken', function(req, res){
  functions.addFacebookToken(req.body.userID, req.body.tokenFB, function(err){
    if(!err){
      res.json({
        success: true
      });
    }
    else{
      res.json({
        success: false,
        message: err.message
      });
    }
  });
});

apiRoutes.post('/getLocationsDay', function(req, res){
  functions.getLocationsDay(req.body.userID, req.body.date, function(err, locations){
    if(!err){
      res.json({
        success: true,
        records: locations
      });
    }
    else{
      res.json({
        success: false,
        message: "Something Went Wrong While Retrieving Records From The Database"
      })
    }
  });
});

apiRoutes.post('/getLocationsMonth', function(req, res){
  functions.getLocationsMonth(req.body.userID, req.body.month, req.body.year, function(err, locations){
    if(!err){
      res.json({
        success: true,
        records: locations
      });
    }
    else{
      res.json({
        success: false,
        message: "Something Went Wrong While Retrieving Records From The Database"
      })
    }
  });
});

apiRoutes.post('/addLocationRecord', function(req, res) {
  var record = {
    userID: req.body.userID,
    lat: req.body.lat,
    long: req.body.long,
    date: req.body.date,
    time: req.body.time
  };
  functions.addLocationRecord(record, function(err, record) {
    if(!err){
      res.json({
        success: true,
        record: record
      });
    }
    else{
      res.json({
        success: false,
        cause: "DB ERROR",
        message: "Failed to Add Record in DB!"
      })
    }
  });
});

apiRoutes.post('/addProductivityAuto',function(req,res){
  var info ={
    user_id:req.body.user_id,
    start_date:req.body.start_date,
    start_time:req.body.start_time,
    location:req.body.location,
    duration:req.body.duration,
    source:req.body.source,
    category:req.body.category,
    productive:req.body.productive,
    updated_productive:req.body.productive,
    activity:req.body.activity,
    updated_activity:req.body.updated_activity,
    token:req.body.token,
    offset: req.body.offset

  };
  functions.autoAddProductivityRecord(info,function(err,record){
// console.log(req.body.user_id)
if(!err){
  res.json({
    success:true,
    record:record
  });
}else {
  res.json({
    success:false,
    message: "Error"
  });
}
});

});

apiRoutes.post('/getProductivityDay', function(req, res){
  functions.getProductivityDay(req.body.userID, req.body.date, function(err, records, productive, nonProductive, percentage){
    if(!err){
      res.json({
        success: true,
        records: records,
        productiveAverage: productive,
        nonProductiveAverage: nonProductive,
        percentage: percentage
      });
    }
    else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: "Error Retreiving records from DB."
      });
    }
  })
});

apiRoutes.post('/getProductivityMonth', function(req, res){
  functions.getProductivityMonth(req.body.userID, req.body.month, req.body.year, function(err, records, productive, nonProductive, percentage){
    if(!err){
      res.json({
        success: true,
        records: records,
        averageProductive: productive,
        averageNonProductive: nonProductive,
        percentage: percentage
      });
    }
    else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: "Error Retreiving records from DB."
      });
    }
  });
});

apiRoutes.post('/addProductivityRecord', function(req, res){
  var productive;
  if(req.body.productive === "true"){
    productive = true;
  }
  else{
    productive = false;
  }
  var record = {
    userID: req.body.userId,
    date: req.body.date,
    time: req.body.time,
    duration: req.body.duration,
    productive: productive,
    activity: req.body.activity,
    source: req.body.source,
    category: req.body.category
  }
  functions.addProductivityRecord(record, function(err, record) {
    if(!err){
      res.json({
        success: true,
        record: record
      });
    }
    else{
      res.json({
        success: false,
        cause: "DB ERROR",
        message: "Error Adding Record to DB!"
      });
    }
  })
});

apiRoutes.post('/addSleepTime' , function (req , res) { //---------------Rowan-------------
  var info ={
    user_id:req.body.user_id,
    start_date:req.body.start_date,
    start_time:req.body.start_time,
    end_time:req.body.end_time,
    end_date:req.body.end_date,
    duration:req.body.duration,
    start_day:req.body.start_day,
    end_day:req.body.end_day,
    token:req.body.token,
    offset: req.body.offset
  };
  functions.addSleepTime(info , function (err , record) {
    console.log(req.body.user_id)
        if (!err) {
      res.json({
        success:true,
        record : record,
        duration:req.body.duration
      });

    } else {
      res.json({
        success: false,
        message: "error"
      });

    }
  });
});

apiRoutes.post('/deleteDuplicates' , function (req ,res) {
  var info ={
    user_id:req.body.user_id,
    start_date:req.body.start_date,
    start_time:req.body.start_time,
    end_time:req.body.end_time,
    end_date:req.body.end_date,
    token:req.body.token,
    offset: req.body.offset
  };
  functions.deleteDuplicates(info , function (err) {
    if(!err){
      res.json({
        success:true
      });
    }else{
      res.json({
        success:false,
        message: "mnf3eesh :("
      });
    }
  });
});

//---------------------------------
apiRoutes.post('/getSleepDay', function(req, res){
  functions.getSleepDay(req.body.userID, req.body.date, function(err, records){
    if(!err){
      res.json({
        success: true,
        records: records
      });
    }
    else{
      res.json({
        success: false,
        cause: "DB ERROR",
        message: "Error Retrieving Records From DB"
      });
    }
  });
});

apiRoutes.post('/getSleepMonth', function(req, res){
  functions.getSleepMonth(req.body.userID, req.body.month, req.body.year, function(err, records){
    if (!err) {
      res.json({
        success: true,
        records: records
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: "Error Retrieving Records From DB"
      });
    }
  });
});

apiRoutes.post('/addSleepRecord', function(req, res) {
  var temp = req.body.start_time.split(":");
  var temp2 = req.body.end_time.split(":");

  var record = {
    userID: req.body.userID,
    start_time: {
      hour: parseInt(temp[0]),
      minute: parseInt(temp[1]),
      second: 0,
      offset: "+2:00"
    },
    end_time: {
      hour: parseInt(temp2[0]),
      minute: parseInt(temp2[1]),
      second: 0,
      offset: "+2:00"
    },
    start_date: req.body.start_date,
    end_date: req.body.end_date
  };
  functions.addSleepRecord(record, function(err, records){
    if (!err) {
      res.json({
        success: true,
        records: records
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: "Failed to Add Record In DB"
      });
    }
  });
});

apiRoutes.post('/updateLocationRecord', function(req, res){
  var info = {
    recordID: req.body.recordID,
    date: req.body.date,
    time: req.body.time,
    latitude: req.body.lat,
    longitude: req.body.long
  }
  functions.updateLocationRecord(info, function(err, location){
    if(!err){
      res.json({
        success: true,
        record: location.value
      });
    }
    else{
      res.json({
        success: false,
        message: "Failed To Update Record"
      })
    }
  });
});

apiRoutes.post('/updateProductivityRecord', function (req, res) {
  var temp = false;
  if(req.body.updated_productive === "true"){
    temp = true;
  }
  functions.updateProductivityRecord(req.body.recordID, temp, req.body.updated_activity, function(err, record){
    if(err === null){
      res.json({
        success: true,
        record: record.value
      });
    }
    else{
      res.json({
        success: false,
        message: "Error updating record in database"
      });
    }
  });
});

apiRoutes.post('/updateSleepRecord', function(req, res){
  //<------------- Continue here -------------->
});

//-------------------------------- Mood API --------------------------

apiRoutes.post('/addMoodRecord', function(req, res){
  var date = req.body.date.split("-");
  var time = req.body.time.split(":");
  var record = {
    user_id: req.body.userId,
    date: {
      day: parseInt(date[2]),
      month: parseInt(date[1]),
      year: parseInt(date[0])
    },
    time: {
      hour: parseInt(time[0]),
      minute: parseInt(time[1]),
      second: parseInt(time[2]),
      offset: "+2:00"
    },
    mood: req.body.mood
  };

  functions.addMoodRecord(record, function(err, record){
    if (!err) {
      res.json({
        success: true,
        record: record
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: err.message
      });
    }
  });
});

apiRoutes.post('/getMoodDay', function(req, res){
  functions.getMoodDay(req.body.userID, req.body.date, function(err, records){
    if (!err) {
      res.json({
        success: true,
        records: records
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: err.message
      });
    }
  });
});

//-------------------------------- Meals API -------------------------

apiRoutes.post('/getMealsDay', function(req, res){
  functions.getMealsDay(req.body.userID, req.body.date, function(err, records){
    if (!err) {
      res.json({
        success: true,
        records: records
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: err.message
      });
    }
  });
});

apiRoutes.post('/addMeal', function(req, res){
  var temp = req.body.date.split("-");
  var temp2 = req.body.time.split(":");
  var meal = {
    user_id : req.body.userID,
    date: {
      day: parseInt(temp[0]),
      month: parseInt(temp[1]),
      year: parseInt(temp[2])
    },
    time: {
      hour: parseInt(temp2[0]),
      minute: parseInt(temp2[1]),
      second: 0,
      offset: "+2:00"
    },
    type: req.body.type,
    duration: req.body.duration
  };
  functions.addMeal(meal, function(err, record){
    if (!err) {
      res.json({
        success: true,
        record: record
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: err.message
      });
    }
  })
});

//-------------------------------- Tasks API -------------------

apiRoutes.post('/getTasksDay', function(req, res){
  functions.getTasksDay(req.body.userID, req.body.date, function(err, records){
    if (!err) {
      res.json({
        success: true,
        records: records
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: err.message
      });
    }
  });
});

apiRoutes.post('/addTask', function(req, res){
  var temp = req.body.date.split("-");
  var temp2 = req.body.time.split(":");
  var temp3 = req.body.duration.split(":");
  var task = {
    user_id: req.body.userID,
    date: {
      day: parseInt(temp[0]),
      month: parseInt(temp[1]),
      year: parseInt(temp[2])
    },
    time: {
      hour: parseInt(temp2[0]),
      minute: parseInt(temp2[1]),
      second: 0,
      offset: "+2:00"
    },
    duration: {
      hour: parseInt(temp3[0]),
      minute: parseInt(temp3[1]),
      second: 0,
      offset: "+2:00"
    },
    title: req.body.title,
    description: req.body.description
  };
  functions.addTask(task, function(err, record){
    if (!err) {
      res.json({
        success: true,
        record: record
      });
    } else {
      res.json({
        success: false,
        cause: "DB ERROR",
        message: err.message
      });
    }
  });
});

//---------------------------------- Getting an Entire Day ----------------------
apiRoutes.post('/getDay', function(req, res){
  functions.getDay(req.body.userID, req.body.date, function(err, records){
    if(!err){
      res.json({
        success: true,
        records: records
      });
    }
    else{
      res.json({
        success: false,
        cause: "DB ERROR",
        message : err.message
      });
    }
  });
})


apiRoutes.get('/users', function(req, res) {
    functions.getUsersFromDB(function(err, users) { //Test this. And Modify mock_productivity records to further specify the date and split it to an object with day + month + year.
        if (!err) res.json(users);
    });
});

apiRoutes.get('/', function(req, res) {
  res.send('Hello! Your Server is Running on Port 8080!');
});

app.use('/api', apiRoutes);

app.listen(port);









// db.connect(function(err, database){
//   if(!err){
//     app.listen(8080, function(err){
//       if(err){
//         console.log(err);
//       }
//       else{
//         console.log("Server Running On Port 8080");
//       }
//     })
//   }
//   else{
//     console.log(err);
//   }
// })





//   functions.seed(function(err, seeded){
//     if(!err){
//       app.listen(8080, function(err){
//         if(!err){
//           console.log("Server up and running on port 8080");
//         }
//         else{
//           console.log(err);
//         }
//     });
//   }
//   else{
//     console.log(err);
//   }
// });
