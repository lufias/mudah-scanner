var fs = require('fs-extra');
var path = require('path');
var moment = require('moment')


var now = moment().unix()

var jsonObj = {
	"Seri Kembangan":{
		lastDate: now
	},
	"Cyberjaya":{
		lastDate: now
	},
	"Shah Alam":{
		lastDate: now
	},
	"Klang":{
		lastDate: now
	},
	"TTDI":{
		lastDate: now
	}

}

var file = path.join('./request-log.json')

fs.ensureFile(file, function(err){
	fs.writeJson(file, jsonObj)
})