'use strict';
var scrap = require('scrap'),
	proj4 = require('proj4'),
	fs= require('fs');

var bassins =[],
	stations_url=[], 
	stations=[];

function scrapBassins(){
	scrap('http://www.vigicrues.gouv.fr/niv2.php', function(err, $) {
	  var links = $('.contenu_cadre a');
	  links.each(function(pos,item){
		  
		  bassins.push({
			  url:item.attribs.href,
			  text:item.children[0].data
		  });
	  }); 
	  scrapStations();
	});
}

function scrapStations(){
	console.log('station ')
	
	if(!bassins.length){
		scrapStationDetail();
		return;
	}
	var bassin = bassins.pop();
	
	scrap('http://www.vigicrues.gouv.fr/'+bassin.url, function(err,$){
		$('area[shape=circle]')
			.each(function(pos,area){
				stations_url.push({
					url:area.attribs.href,
					bassin:bassin.text
				})
			});
			scrapStations();
	});
}

function scrapStationDetail(){
	console.log('station detail')
	if(!stations_url.length){
		makegeoJSON();
		return;
	}
	var station_url = stations_url.pop();
	scrap('http://www.vigicrues.gouv.fr/'+station_url.url+'&ong=3', function(err,$){
		 var spans = $('.contenu_cadre  p span'); 
		 var txt =  $('.contenu_cadre div').text();
		 var reg = /\r\n\t  Station : \r\n\t  (.*)\r\n\t  Département : \r\n\t  ([0-9]{2})\r\n\t   \r\n\r\n\t  Cours d\'eau : \r\n\t  (.*)\r\n\t   \r\n\r\n\t  Coordonnées Lambert II : \r\n\t  X=([0-9]+) m, Y=([0-9]+)/m
		 //var reg =/.*Station.*/
		 var matches = txt.match(reg);
		 var lambert2 ='+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs ';
		 console.log([parseInt(matches[4],10),parseInt(matches[5],10)])
		 var latlng = proj4(lambert2).inverse([parseInt(matches[4],10),parseInt(matches[5],10)]);
		 var lng = latlng[0];
		 var lat = latlng[1]; 
		 var station ={
			 bassin:station_url.bassin,
			 url:'http://www.vigicrues.gouv.fr/'+station_url.url,
			 station:matches[1],
			 department:matches[2],
			 river:matches[3],
			 X:matches[4],
			 Y:matches[5],
			 lat:lat,
			 lng:lng

		 } 
		 console.log(station)
		 stations.push(station);
		 scrapStationDetail();
	});
}

function makegeoJSON(){
	var json={ "type": "FeatureCollection",
  "features": []	
	}
	stations.forEach(function(station){
		json.features.push({
			type:'Feature',
			geometry:{type:'Point',coordinates:[station.lng,station.lat]},
			properties:station
		})
	})
	var str = JSON.stringify(json);
	fs.writeFile('geojson.json', str,function(err){
		console.log('done');
		console.log(err);
	})
}

scrapBassins();
//area shape="circle"