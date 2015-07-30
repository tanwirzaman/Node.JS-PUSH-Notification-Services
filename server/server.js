	
  Meteor.publish('waitTimes', function() {
    return instacareWaitTimes.find();
  });

  Meteor.startup(function () {
         SyncedCron.start();		
		 Meteor.call("getInstacareLocations", function(error, locations) {
			 for ( i=0; i < locations.data.length; i++){	
				var location = instacareLocations.findOne({hddNcid : locations.data[i].hddNcid});
				if(location === undefined){
					instacareLocations.insert(locations.data[i]);
				}
			 }
		 });
    });
	
  SyncedCron.add({
  name: 'Get DIG data every 50 mins',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 50 mins');
  },
  job: function() {
     Meteor.call("getDIGWaitTimes", function(error, waitTimes) {
	     var instacareWaitTime=waitTimes.data;			 
		 for ( i=0; i < instacareWaitTime.WaitTime.length; i++){
				//console.log("locationToInsert: "+locationToInsert);
				var instacare = instacareWaitTimes.findOne({ncid : instacareWaitTime.WaitTime[i].ncid});
				var locations = instacareLocations.findOne({hddNcid : ""+instacareWaitTime.WaitTime[i].ncid+""});				
				if(instacare !== undefined && locations !== undefined){
					instacareWaitTimes.update({ncid:instacareWaitTime.WaitTime[i].ncid},{$set:{isOpen:instacareWaitTime.WaitTime[i].isOpen,currentWaitTimeInMinutes:instacareWaitTime.WaitTime[i].currentWaitTimeInMinutes,currentDayOpenHour:instacareWaitTime.WaitTime[i].currentDayOpenHour,currentDayCloseHour:instacareWaitTime.WaitTime[i].currentDayCloseHour,waitTimeLabel:instacareWaitTime.WaitTime[i].waitTimeLabel,lastCalculated:instacareWaitTime.WaitTime[i].lastCalculated,type:instacareWaitTime.WaitTime[i].type,allowCheckin:instacareWaitTime.WaitTime[i].allowCheckin,minutesUntilAllowingCheckin:instacareWaitTime.WaitTime[i].minutesUntilAllowingCheckin,latitude:locations.latitude,longitude:locations.longitude}});
				}
				else{					
				    instacareWaitTime.WaitTime[i].latitude=locations.latitude;
					instacareWaitTime.WaitTime[i].longitude=locations.longitude;
					instacareWaitTimes.insert(instacareWaitTime.WaitTime[i]);
				}
		   }		
    });
  }
});

  SyncedCron.add({
  name: 'Check appointments within the next 30 mins.',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 30 mins');
  },
  job: function() {
	  var currentTime = new Date();	 
	  var ct=currentTime.toISOString();
	 // console.log("CT:"+ct);
	  var futureTime = new Date();	 
	   futureTime.setMinutes(futureTime.getMinutes() + 50);
	   var ft=futureTime.toISOString();
	    //console.log("FT:"+ft);	 
	  var upcomingAppointments = patientAppointments.find({
		  time:{			
			$gte: new Date(ct),
			$lt: new Date(ft)
		  }		
/*
{
time:{
 $gte: ISODate("2015-07-16T15:10:00.000"),
 $lt: ISODate("2015-07-16T15:50:00.000")
}
*/
		  
	  }).fetch();
	  console.log(upcomingAppointments.length);
	  Meteor.call('removeOldAppointments');
	  for ( i=0; i < upcomingAppointments.length; i++){
		  var Message ="upcomingAppointments for: "+upcomingAppointments[i].firstName+" "+upcomingAppointments[i].lastName;
		  //Meteor.call('sendGCMMessage',Message);
		  Meteor.call('sendAPNSMessage',Message);
		 // console.log("upcomingAppointments for: "+upcomingAppointments[i].firstName+upcomingAppointments[i].lastName)
	  }
  }
});


  Meteor.methods({
        getDIGWaitTimes: function () {
            this.unblock();
			var dev_url= "https://tacweb-dev.co.ihc.com/dig/service/rest/wait/waitTimes"
			var prod_url= "https://dig.co.ihc.com/dig/service/rest/wait/waitTimes"
            return Meteor.http.call("GET", dev_url,{headers: {'Content-Type': 'application/json'}});
        },
		
		getInstacareLocations : function(){
			this.unblock();
			return Meteor.http.call("GET", "https://ma.intermountainhealthcare.org/PatientWaitTimeServices/waitTimes?latitude=40.696582&longitude=-112.013368&type=INSTACARE&sort=distance",{headers: {'Content-Type': 'application/json'}});
		},
		
		removeAllinstacaresCloseBy: function() {
			return instacaresCloseBy.remove({});
       },
	   
	   removeOldAppointments: function() {
		    var currentTime = new Date();	 
			var ct=currentTime.toISOString();  
			var OldAppointments = patientAppointments.find({
			  time:{			
				$lt: new Date(ct)
			  }			  
		  }).fetch();
		  var idList=[];
		  for ( i=0; i < OldAppointments.length; i++){
			idList.push(OldAppointments[i]._id);
	      }
			return patientAppointments.remove({_id:{$in:idList}});
       },
	   
	    sendGCMMessage: function(msg){
      /*console.log("message: "+msg);
      var gcm = Meteor.npmRequire('node-gcm');
      var message = new gcm.Message({
        collapseKey:new Date().getTime().toString(),
        delayWhileIdle: false,
        timeToLive: 2419200,
        data: {
          "title": "Your Appointment is due.",
          "message":msg
        }
      });

      message.addData('msgcnt','3');
      message.addData("notId", parseInt(Math.random() * 25));
      var sender = new gcm.Sender('AIzaSyCPw2ojL5AJTwzl4fS9IOilVQNYndSQuPM');
      var registrationIds = [];
      registrationIds.push('APA91bFI7Wd3FyCwKDZ2aJ4aEGgk-YAxofygUOEvio_B8cKqpSQxbvBI5ZwGTSZfVt6QtktnOBbJByRT0ijLY6LPz5bGCNbCbnasatj6RuC1ej_nQUKGI3E4GT68h0jXjUgb2MxIteN2');
      sender.send(message, registrationIds, 5, function (err, result) {
        if(err) {
        }
        else   {
          console.log(message);
        }
      });*/
    },
	
	 sendAPNSMessage: function(msg){
			  console.log("message: "+msg);			 
			  var appRootPath="C:/APNS_Certificates";

				  var apnError = function(err){
				console.log("APN Error:", err);
			 }
			console.log(" Test Path"+appRootPath);
			var apn = Meteor.npmRequire("apn"),
				  path = Npm.require('path'),
				  //apnOptions = Meteor.settings.apnOptions || {},
				  //alertSound = apnOptions.sound || "alert.aiff",
				  apnConnection;
				  apnOptions={
					passphrase: 'abhi'
					},
				 apnOptions = _.extend({
					cert: path.join(appRootPath,  "MHCert.pem"),
					key: path.join(appRootPath,  "MHKey.pem"),
				 }, apnOptions);
				  apnOptions.errorCallback = apnError;
				  apnConnection = new apn.Connection(apnOptions);
				  apnConnection.on("error", function (err) {
			      console.log("Local APN Error:", err);
			})
				  var note = new apn.Notification()

				// expires 1 hour from now
				//note.expiry = Math.floor(Date.now() / 1000) + 3600
				note.sound =  "default"
				note.alert = "Your appointment is due"
				note.payload = {'url': "test"}
				var device = new apn.Device("a69e94645e6cedb9ed94359229ceaf47f1216e650e770b41c7ed73eba394ba28");
				apnConnection.pushNotification(note, device);
			   // // _.each(pushIds, function (token) {
			   //    var device = new apn.Device(token)
			   //    apnConnection.pushNotification(note, device)
			   // // })
			console.log(" Notification done");
		}  

		 
    

	   
    });