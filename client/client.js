  var remote = DDP.connect('http://DDJYLNX1:5000');
  var initialLocation;
  remote.onReconnect = function() {
    remote.subscribe('waitTimes');
    var items = instacareWaitTimes.find();    	
  }
 /* Meteor.call("getInstacareLocations", function(error, locations) {
		//console.log("locationToInsert: "+locations.data[0].city);
    }); */
  Meteor.startup(function() {  
		GoogleMaps.load();
	});
	
  Template.InstacareTemp.events({
    'click .waitTimeRow': function(){
		var self = this;
        var facilityNameStr = self.facilityName;
		Session.set('selectedInstacare', facilityNameStr);
		var selectedInstacare = Session.get('selectedInstacare');
		console.log(selectedInstacare);
		 var destination = instacareWaitTimes.findOne({facilityName:facilityNameStr});	
		var destCoords = new google.maps.LatLng(destination.latitude,destination.longitude);
	    calculateDistances(destCoords,facilityNameStr,destination.currentWaitTimeInMinutes);
    }
  });
  
  var DISTANCE_LIMIT=20;
		Template.dist_form.events({'submit form' : function(event, template) {
    event.preventDefault();

	maxDist = template.find("input[name=maxDist]");
	 DISTANCE_LIMIT = maxDist.value; 
	 maxDist.value="";
   
    console.log("DISTANCE_LIMIT"+DISTANCE_LIMIT);
  }});
  
  
  Template.appoForm.helpers({
    showTheFormDiv:function(){
      if(Session.get('selectedInstacare')){
		 return true
	   }
      else
        return false
       },
	   
	   'selectedInstacare' : function(){
			return Session.get('selectedInstacare');
		}
    });
  	
  
  Template.appoForm.events({'submit form' : function(event, template) {
    event.preventDefault();

	firstname = template.find("input[name=firstname]");
    lastname = template.find("input[name=lastname]"); 
	reason = template.find("input[name=reason]");	
    
	function getAppointmentTime(){
		var currentTime = new Date();
		currentTime.setMinutes(currentTime.getMinutes() + 15);
		//console.log("Time:"+currentTime);
		return currentTime;
	}
		
    var data = {
	  facilityName : Session.get('selectedInstacare'),
      firstName: firstname.value,
      lastName: lastname.value,
	  reason : reason.value,
      time: getAppointmentTime()
    };
    
    firstname.value="";
    lastname.value="";
    reason.value="";
	
    patientAppointments.insert(data, function(err) { /* handle error */ });

  }});
  
  Template.InstacareTemp.helpers({
  
  'waitTimes' : function(){
	  return instacareWaitTimes.find({},{sort:{currentWaitTimeInMinutes:1}});
  },
  
  'locations' : function(){
	  return instacareLocations.find();
  }
  
  }); 
  
  Template.mapTemp.helpers({  
  mapOptions: function() {
    if (GoogleMaps.loaded()) {		
      return {
		center: new google.maps.LatLng(40.743054, -111.926056),
        zoom: 12
      };
    }
   }
  });
  
  
			function calculateDistances(destCoords,instacare,waitTime) {
			  var service = new google.maps.DistanceMatrixService();
			  service.getDistanceMatrix(
				{
				  origins: [initialLocation],
				  destinations: [destCoords],
				  travelMode: google.maps.TravelMode.DRIVING,
				  unitSystem: google.maps.UnitSystem.IMPERIAL,
				  avoidHighways: false,
				  avoidTolls: false
				},
				function callback(response, status) {
				  if (status != google.maps.DistanceMatrixStatus.OK) {
					console.log('Error was: ' + status);
				  } else {
					var origins = response.originAddresses;
					var destinations = response.destinationAddresses;
					
					for (var i = 0; i < origins.length; i++) {
					  var results = response.rows[i].elements;
					  //addMarker(origins[i], false);
					  for (var j = 0; j < results.length; j++) {
						//addMarker(destinations[j], true);
						console.log(origins[i] + ' to ' + destinations[j]
							+ ': ' + results[j].distance.text + ' in about '
							+ results[j].duration.text );
							var distanceStr = results[j].distance.text;
							var distance = distanceStr.split(" ");
							var durationStr = results[j].duration.text;
							var duration = durationStr.split(" ");
							console.log("waitTime "+waitTime+" duration "+duration[0]);					
							if( parseInt(duration[0]) > waitTime)
							{						
								//markDestination(destinations[j]);
								alert("Drive to "+instacare+ " will take "+duration[0] +" mins and the "+
								"wait time is "+waitTime +" mins. So please choose a different appointment time or a different Instacare.");
							}
							
					  }
					  
					}
					
				  }
				} 
				
				);
			}
  
  
  
  Template.mapTemp.onCreated(function() {
	 
		
	  
	GoogleMaps.ready('map', function(map) {
		var geocoder = new google.maps.Geocoder();
		var markers = {};
		var infos = {};				 
		var InstacaresWithInTenMiles = {};
		var InstacaresListWithInTenMiles = [];		
		if(navigator.geolocation) {			
			  navigator.geolocation.getCurrentPosition(function(position) {
			  initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
			  //console.log("Location:"+ initialLocation);
			 			  
			   var myLocationMarker= new google.maps.Marker({
				//icon: image,
				animation: google.maps.Animation.DROP,
				position: initialLocation,				
				map: map.instance
		    });
			  var myLocInfowindow = new google.maps.InfoWindow({
			  content: "My Location"
			});
			myLocInfowindow.open(map.instance,myLocationMarker);
			map.instance.setCenter(initialLocation);
			
			/*google.maps.event.addListener(marker, 'click', function(event) {
			  Session.set('selectedInstacare', document.facilityName);
			  destination = marker.position;			  
			  calculateDistances(destination,document.facilityName,document.currentWaitTimeInMinutes);
			});*/
			
			/*google.maps.event.addListener(myLocationMarker, 'click', function(event) {				
				myLocInfowindow.open(map.instance,myLocationMarker);
			});*/
			
			//destinationList=instacareWaitTimes.find().fetch();
			//Meteor.call('removeAllinstacaresCloseBy');
			/*for(i=0;i<destinationList.length;i++)
			{
				var destCoords = new google.maps.LatLng(destinationList[i].latitude,destinationList[i].longitude);
				var truncLat=Math.floor(destinationList[i].latitude * 100) / 100;
				var truncLng=Math.floor(destinationList[i].longitude * 100) / 100;
				var added = truncLat+","+truncLng;
				InstacaresWithInTenMiles[added] = destinationList[i].facilityName;
				//console.log("Dest :"+ added);
				calculateDistances(destCoords,destinationList[i]);
			}*/
			
			
			//var destCoords = new google.maps.LatLng(destination.latitude,destination.longitude);
			//calculateDistances(destCoords,destination);
			
		  });
		  
		  
	   
			//var destination = instacareWaitTimes.findOne({facilityName:"Sandy InstaCare"});
			//console.log("Dest:"+ destination.latitude+", "+destination.longitude);
			//var destCoords = new google.maps.LatLng(destination.latitude,destination.longitude);
			//console.log("Dest coords:"+ destCoords);
			
			
			
			
			
			
		
		
		
		function markDestination(location) {
		   geocoder.geocode({'address': location}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				var truncLat=Math.floor(results[0].geometry.location.lat() * 100) / 100;
				var truncLng=Math.floor(results[0].geometry.location.lng() * 100) / 100;
				var added = truncLat+","+truncLng;
				//console.log("loc :"+ added);	
				if(InstacaresWithInTenMiles[added] !== undefined)	{
					//console.log("Loc:"+InstacaresWithInTenMiles[added]);			
										
					var data = {
					  facilityName : InstacaresWithInTenMiles[added]					  
					};
					
					instacaresCloseBy.insert(data, function(err) {    });
					palceNewMarkers(InstacaresWithInTenMiles[added],results[0].geometry.location.lat(),results[0].geometry.location.lng());
				}
			} else {	  
			}
		  });
		  
		}
		
		function palceNewMarkers(facName,lat,lng) {
			var image = {  
				url: '',				
			};
			var marker = new google.maps.Marker({
				icon: image,
				animation: google.maps.Animation.DROP,
				position: new google.maps.LatLng(lat,lng),				
				map: map.instance
		    });
			
			
			 var contentString = '<div id="content">'+
			  '<div id="siteNotice">'+
			  ''+facName+'&nbsp</br>'+
			  '</div>';
					
			var infowindow = new google.maps.InfoWindow({
			  content: contentString
			});			
     		infowindow.open(map.instance,marker);
			
		}

		 
    }
		
		instacareWaitTimes.find().observe({
			
			added: function(document) {
			// Create a marker for this document
			var image = {  
				url: '#',				
			};
			var marker = new google.maps.Marker({
				//icon: image,
				animation: google.maps.Animation.DROP,
				position: new google.maps.LatLng(document.latitude, document.longitude),
				title: ""+document.currentWaitTimeInMinutes,
				map: map.instance
		    });
			markers[document.ncid] = marker;
			
			 var contentString = '<div id="content">'+
			  '<div id="siteNotice">'+
			  ''+document.facilityName+'&nbsp</br>'+		  
			  ''+document.currentWaitTimeInMinutes+' mins'+
			  '</div>';
					
			var infowindow = new google.maps.InfoWindow({
			  content: contentString
			});
			infos[document.ncid] = infowindow;
     		infowindow.open(map,marker);
			
			
			
			
		},
		 changed: function(newDocument, oldDocument) {
			var _marker = markers[newDocument.ncid];
			var _info = infos[newDocument.ncid];
			
			//_info.close();
			var contentString = '<div id="content">'+
			  '<div id="siteNotice">'+
			  ''+newDocument.facilityName+'&nbsp</br>'+		  
			  ''+newDocument.currentWaitTimeInMinutes+' mins'+
			  '</div>';
			  
			_info.setContent(contentString);
			//_info.open(map.instance,_marker);
			
			
		},
		
		
		 removed: function(oldDocument) {
			
         }
		
	   });
     
  });
});
