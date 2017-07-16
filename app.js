var express = require("express");
var functions = require("./functions.js");
var fs = require('fs');

exports.app = express();
exports.app.use(express.static('public'));
