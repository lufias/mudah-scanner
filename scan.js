var _ = require('lodash');
var request = require('request');
var cheerio = require('cheerio');
var nodemailer = require('nodemailer');
var fs = require('fs-extra');
var path = require('path')
var moment = require('moment')




var urls = [
	
	{
		location:'Seri Kembangan',
		url: 'http://www.mudah.my/Selangor/Rooms-for-rent-2100?lst=0&fs=1&w=108&cg=2100&sa=330&so=1&st=u&mre=1'
	},
	
	{
		location:'Cyberjaya',
		url: 'http://www.mudah.my/Selangor/Rooms-for-rent-2100?lst=0&fs=1&w=108&cg=2100&sa=286&so=1&st=u&mre=1'
	},

	{
		location:'Shah Alam',
		url: 'http://www.mudah.my/Selangor/Rooms-for-rent-2100?lst=0&fs=1&w=108&cg=2100&sa=333&so=1&st=u&mre=1'
	},

	{
		location:'Klang',
		url: 'http://www.mudah.my/Selangor/Rooms-for-rent-2100?lst=0&fs=1&w=108&cg=2100&sa=303&so=1&st=u&mre=1'
	},
	
	{
		location:'Ampang',
		url: 'http://www.mudah.my/Selangor/Rooms-for-rent-2100?lst=0&fs=1&w=108&cg=2100&sa=268&so=1&st=u&mre=1'
	}
]

var dateLog = {}
var urlToProcessLength = urls.length

var logWorking = function(){	
	var file = path.join(__dirname, 'error-log')

	fs.ensureFile(file, function(err){		
		fs.writeJsonSync(file, {requestOn:  moment().format('MMM DD h:mm A') }, {flag: 'a'})
	})
}

var getLocationDate = function(){
	var file = path.join(__dirname, 'request-log.json')
	return fs.readJsonSync(file)
}

var writeLocationDate = function(){
	
	var file = path.join(__dirname, 'request-log.json')

	fs.ensureFile(file, function(err){
		fs.writeJson(file, dateLog)
	})
}

var process = function(){

	// need to get the date log
	dateLog = getLocationDate()	

	_.each(urls, function(locObj){
		scanAds(locObj.url, locObj.location, dateLog)
	})

	// update the date log
	writeLocationDate()
}

var checkCompletion = function(){
	--urlToProcessLength;
	if(!urlToProcessLength){
		writeLocationDate()
	}
}

var scanAds = function(url, location){
		
	var ads = []

	request(url, function(error, response, html){
		if(!error){
			var $ = cheerio.load(html);	
			var allAds = $('.list_ads');
			
			// collect data for each ads
			_.each(allAds, function(ad){
				var img = $(ad).find('img')
				var adLink = $(ad).find('.list_title a')
				var price = $(ad).find('.ads_price')
				var date = $(ad).find('.location.bottom_info div')[0]

				ads.push({
					img:img.attr('src'),
					adLink: adLink.attr('href'),
					title: adLink.text(),
					price: parseInt(price.text().replace ( /[^\d.]/g, '' )),
					date: $(date).text().trim()

				})
			})



			// we only going to take today ads
			ads = _.filter(ads, function(ad){
				return ad.date.match(/Today,/i)
			})



			// remove the word today
			_.each(ads, function(ad){
				ad.date = ad.date.replace('Today,', '').trim()
			})


			// convert the date string to moment unix
			_.each(ads, function(ad){
				ad.date = moment(ad.date, "HH:mm").unix()
			})




			// remove ads which is older than the latest one log in file
			_.remove(ads, function(ad){				
				return ad.date <= dateLog[location]["lastDate"] 
			})

			// remove ads which is higher than rm300
			_.remove(ads, function(ad){				
				return ad.price > 300
			})			


			// after everything, if there still any ads
			if(ads.length){	
				
				// update the logs with the latest date
				_.set(dateLog, '['+location+'][lastDate]', _.maxBy(ads, 'date').date)
								
			
				// mail the ads
				mail(curateMail(ads), location)
			}
			else{				
				// update the logs with the latest date
				_.set(dateLog, '['+location+'][lastDate]', dateLog[location]["lastDate"])				
			}

			checkCompletion()

		}
		
	})

}

var curateMail = function(ads){
	var html = ''
	_.each(ads, function(ad){
		html+='<img src="'+ad.img+'" />\n';
		html+='<p><a href="'+ad.adLink+'">'+ad.title+'</a><p>'
		html+='<p>RM '+ad.price+'</p>'
		html+='<br />'
	})

	return html
}

var mail = function(body, location){

	var smtpConfig = {
	    host: 'smtp.gmail.com',
	    port: 465,
	    secure: true, // use SSL, 
	                  // you can try with TLS, but port is then 587
	    auth: {
	      user: 'symphony86@gmail.com', // Your email id
	      pass: 'ufuckoff987733' // Your password
	    }
	  };
	var transporter = nodemailer.createTransport(smtpConfig);
	// var transporter = nodemailer.createTransport('smtps://symphony86%40gmail.com:ufuckoff987733@smtp.gmail.com');
 
	// setup e-mail data with unicode symbols 
	var mailOptions = {
	    from: '"Mudah Scanner" <mudah-scanner@craekern.com>', // sender address 
	    to: 'finalboey@gmail.com', // list of receivers 
	    subject: '(Don\'t Reply) New ads from '+location, // Subject line 
	    html: body // html body 
	};
	 
	// send mail with defined transport object 
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        return console.log(error);
	    }
	    console.log('Message sent: ' + info.response);
	});
}

logWorking()
process()
