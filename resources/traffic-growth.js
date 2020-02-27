var counters;
S(document).ready(function(){
	function TrafficGrowth(){
		el = S('#traffic');
		this.selected = [];

		var colours = ['c1-bg','c2-bg','c3-bg','c4-bg','c5-bg','c6-bg','c7-bg','c8-bg','c9-bg','c10-bg','c11-bg','c12-bg','c13-bg','c14-bg'];

		// Do we update the address bar?
		this.pushstate = !!(window.history && history.pushState);
		
		// Add "back" button functionality
		if(this.pushstate){
			var _obj = this;
			window[(this.pushstate) ? 'onpopstate' : 'onhashchange'] = function(e){
				if(e && e.state){
					_obj.selected = e.state.selected;
					_obj.display();
				}else{
					_obj.selected = [];
					_obj.processQueryString();
				}
			};
		}

		// Get the sensor index
		S().ajax('data/index.json',{
			'dataType': 'json',
			'this': this,
			'cache': false,
			'success': function(d){
				this.counters = d;
				this.processQueryString();
			},
			'error': function(e,attr){
				console.error('Unable to load file '+attr.url);
			}
		});
		
		this.processQueryString = function(){
			el.find('.searchresults').remove();
			var codes = location.search.substr(1).split(/\;/);
			this.toload = 0;
			for(var i = 0; i < codes.length; i++){
				var bits = codes[i].split(/:/);
				if(bits.length==2 && this.counters[bits[0]]){
					if(this.counters[bits[0]].lanes[bits[1]]){
						this.toload++;
					}
				}
			}
			this.loaded = 0;
			for(var i = 0; i < codes.length; i++){
				var bits = codes[i].split(/:/);
				if(bits.length==2 && this.counters[bits[0]]){
					if(this.counters[bits[0]].lanes[bits[1]]){
						this.selectCounter(bits,function(idx){
							this.loaded++;
							// Only update the display if we've added everything
							if(this.loaded==this.toload){
								this.display();
							}
						});
					}
				}else{
					console.error('No counter '+bits[0]);
				}
			}
			this.buildMap();
			return this;
		}
		
		this.getUnusedColour = function(){
			var c,i,found,code,a,l;
			for(c = 0; c < colours.length; c++){
				found = false;
				for(a in this.counters){
					for(l in this.counters[a].lanes){
						if(typeof this.counters[a].lanes[l].colour==="number" && this.counters[a].lanes[l].colour==c) found = true;
					}
				}
				if(!found) return c;
			}
			return 0;
		}
		
		this.selectCounter = function(idx,callback){

			//idx = parseInt(idx);
			(bits) = idx[0].split(/-/);

			// Add the code to the list of selected airports
			this.selected.push({'sensor':idx[0],'lane':idx[1]});
			
			if(!idx){
				console.warn('Unable to find counter', this.counters,idx);
				return this;
			}
			
			if(typeof this.counters[idx[0]].lanes[idx[1]].colour!=="number") this.counters[idx[0]].lanes[idx[1]].colour = this.getUnusedColour();
			if(typeof this.counters[idx[0]].lanes[idx[1]].file!=="string") this.counters[idx[0]].lanes[idx[1]].file = bits[0]+'/'+bits[1]+'-'+bits[2]+'-'+idx[1]+'.csv';

			// Select this counter/lane
			this.counters[idx[0]].lanes[idx[1]].selected = true;
			
			console.log(this.counters[idx[0]].lanes[idx[1]]);

			S().ajax('data/'+this.counters[idx[0]].lanes[idx[1]].file,{
				'dataType': 'text',
				'this': this,
				'cache': false,
				'idx':idx,
				'callback':callback,
				'success': function(d,attr){
					this.counters[attr.idx[0]].lanes[attr.idx[1]].data = CSV2JSON(d);
					if(typeof callback==="function") callback.call(this,attr.idx);
				},
				'error': function(e,attr){
					console.error('Unable to load '+attr.url);
				}
			});
			return this;
		}
		
		this.updateHistory = function(){
			// Update the history
			str = "";
			for(var i = 0; i < this.selected.length; i++) str += (str ? ';':'')+this.selected[i].sensor+":"+this.selected[i].lane;
			
			if(this.pushstate) history.pushState({selected:this.selected,'airports':this.airports},"Airports",(this.airportlist != str ? '?'+str : '?'));
			this.airportlist = str;
		}
		
		this.addCounter = function(sensor,lane){
			console.log('addCounter',sensor,lane);
			history.pushState({page: 1}, "title 1", location.search+';'+sensor+':'+lane);
			this.selectCounter([sensor,lane],function(idx){
				this.display();
			});
			return this;
		}
		
		this.removeCounter = function(sensor,lane){
			var idx = [sensor,lane];
			el.find('.select-'+idx[0]+'-'+idx[1]).remove();
			console.log('Remove',idx);
			if(this.counters[idx[0]]){
				delete this.counters[idx[0]].lanes[idx[1]].colour;
				var match = -1;
				for(c = 0; c < this.selected.length; c++){
					if(this.selected[c].sensor==idx[0] && this.selected[c].lane==idx[1]) match = c;
				}
		
				if(match >= 0) this.selected.splice(match,1);
				this.counters[idx[0]].lanes[idx[1]].selected = false;
				this.display();
			}else{
				console.warning('No index '+idx)
			}
			this.updateHistory();
			return this;
		}

		this.display = function(){

			console.log('here')
			var c,code,n,idx,a;
			
			// Reset
			el.find('.output').html('');

			html = '<ul class="tags">';
			for(c = 0; c < this.selected.length; c++){
				idx = [this.selected[c].sensor,this.selected[c].lane];
				n = this.counters[idx[0]].lanes[idx[1]].colour;
				html += '<li class="select-'+idx[0]+'-'+idx[1]+'"><div class="tag '+colours[n]+'" title="'+this.counters[idx[0]].name+'">'+(this.counters[idx[0]].name||'')+' (lane '+idx[1]+')'+'<a href="#" class="close" title="Remove '+this.counters[idx[0]].name+'" data-sensor="'+idx[0]+'" data-lane="'+idx[1]+'">&times;</a></div></li>';
			}
			html += '</ul>';
			if(el.find('.tags').length==0) el.find('.output').append(html);
			else el.find('.tags').html(html);

			// Add events 
			el.find('.tags .tag .close').on('click',{me:this},function(e){
				e.preventDefault();
				e.stopPropagation();
				e.data.me.removeCounter(e.currentTarget.getAttribute('data-sensor'),e.currentTarget.getAttribute('data-lane'));
			});

			if(this.selected.length==0) return this;
			
			html = '<h2>Counts by hour of day</h2><div id="barchart-hourly"></div><h2>Counts by day of week</h2><div id="barchart-dow"></div><h2>Counts by month</h2><div id="barchart-monthly"></div><h2>Counts by year</h2><div id="barchart-yearly"></div>';
			if(el.find('.charts').length==0) el.find('.output').append('<div class="charts">'+html+'</div>');
			else el.find('.charts').html(html);

			var min = "3000-12-01";
			var max = "0001-01-01";

			for(a in this.counters){
				for(l in this.counters[a].lanes){
					if(this.counters[a].lanes[l].selected && this.counters[a].lanes[l].data){
						for(var i = 0; i < this.counters[a].lanes[l].data.rows.length; i++){
							d = this.counters[a].lanes[l].data.rows[i][0];
							if(d < min) min = d;
							if(d > max) max = d;
						}
					}
				}
			}

			var ds = new Date(min);
			var de = new Date(max);

			// Create data arrays
			var data = {'hourly':[],'dow':[],'monthly':[],'yearly':[]};
			var dow = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
			var month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


			for(h = 0; h < 24; h++) data.hourly.push([(h<10 ? "0":"")+h+":00",new Array(this.selected.length)]);
			for(d = 0; d < 7; d++) data.dow.push([dow[d],new Array(this.selected.length)]);
			for(m = 0; m < 12; m++) data.monthly.push([month[m],new Array(this.selected.length)]);
			for(y = ds.getUTCFullYear(); y <= de.getUTCFullYear(); y++) data.yearly.push([y+"",new Array(this.selected.length)]);
			

			for(c = 0; c < this.selected.length; c++){
				idx = [this.selected[c].sensor,this.selected[c].lane];
				for(h = 0; h < 24; h++) data.hourly[h][1][c] = 0;
				for(d = 0; d < 7; d++) data.dow[d][1][c] = 0;
				for(m = 0; m < 12; m++) data.monthly[m][1][c] = 0;
				for(y = 0; y < data.yearly.length; y++) data.yearly[y][1][c] = 0;
				for(var i = 0; i < this.counters[idx[0]].lanes[idx[1]].data.rows.length; i++){
					d = new Date(this.counters[idx[0]].lanes[idx[1]].data.rows[i][0]);
					t = 0;
					for(h = 0; h < 24; h++){
						n = this.counters[idx[0]].lanes[idx[1]].data.rows[i][h+1];
						if(n){
							n = parseInt(n);
							if(!isNaN(n)){
								data.hourly[h][1][c] += n;
								t += n;
							}
						}
					}
					data.dow[(d.getDay()+6) % 7][1][c] += t;	// Shift day-of-week from Sunday start to Monday start
					data.monthly[d.getMonth()][1][c] += t;
					data.yearly[(d.getUTCFullYear()-ds.getUTCFullYear())+""][1][c] += t;
				}
			}

			var _obj = this;
			var formatBar = function(key,value,series){
				var d,c,code,cls;
				d = new Date(key);
				d = d.getUTCDay();
				cls = "";
				if(typeof series==="number"){
					idx = _obj.selected[series];
					c = _obj.counters[idx.sensor].lanes[idx.lane].colour;
					return (colours[c])+cls;
				}else return cls;
			}

			var chart = {};

			// Build the barchart object attached to <div id="barchart">
			chart.hourly = new S.barchart('#barchart-hourly',{
				'formatX': function(v){ return (parseInt(v.substr(0,2)) % 4 == 0 ? v : ""); },
				'formatY': function(v){ return formatNumber(v) },
				'formatBar': formatBar
			});
			chart.hourly.on('barover',function(e){
				// Remove any existing information balloon
				S('.balloon').remove();
				var key,table,i,c;
				// Get the key for this bin
				i = parseInt(e.bin);
				key = this.bins[e.bin].key;
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' '+this.bins[i].key+'-'+(i+1 < 24 ? this.bins[(i+1)].key : "00:00")+ '</div>');
			});
			// Set the data, bins and draw
			chart.hourly.setData(data.hourly).setBins({'mintick':5}).draw();
			
			// Build the barchart object attached to <div id="barchart">
			chart.dow = new S.barchart('#barchart-dow',{
				'formatX': function(v){ return v; },
				'formatY': function(v){ return formatNumber(v) },
				'formatBar': formatBar
			});
			chart.dow.on('barover',function(e){
				// Remove any existing information balloon
				S('.balloon').remove();
				var key,table,i,c;
				// Get the key for this bin
				i = parseInt(e.bin);
				key = this.bins[e.bin].key;
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' on '+this.bins[i].key+ '</div>');
			});
			// Set the data, bins and draw
			chart.dow.setData(data.dow).setBins({}).draw();
		
			// Build the barchart object attached to <div id="barchart">
			chart.monthly = new S.barchart('#barchart-monthly',{
				'formatX': function(v){ return v; },
				'formatY': function(v){ return formatNumber(v) },
				'formatBar': formatBar
			});
			chart.monthly.on('barover',function(e){
				// Remove any existing information balloon
				S('.balloon').remove();
				var key,table,i,c;
				// Get the key for this bin
				i = parseInt(e.bin);
				key = this.bins[e.bin].key;
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' in '+this.bins[i].key+ '</div>');
			});
			// Set the data, bins and draw
			chart.monthly.setData(data.monthly).setBins({}).draw();

			// Build the barchart object attached to <div id="barchart">
			chart.yearly = new S.barchart('#barchart-yearly',{
				'formatX': function(v){ return v; },
				'formatY': function(v){ return formatNumber(v) },
				'formatBar': formatBar
			});
			chart.yearly.on('barover',function(e){
				// Remove any existing information balloon
				S('.balloon').remove();
				var key,table,i,c;
				// Get the key for this bin
				i = parseInt(e.bin);
				key = this.bins[e.bin].key;
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' in '+this.bins[i].key+ '</div>');
			});
			// Set the data, bins and draw
			chart.yearly.setData(data.yearly).setBins({}).draw();

			return this;
		}
		
		this.buildMap = function(){
			if(!this.map){
				lat = 53.79659;
				lon = -1.53385;
				d = 0.10;
			
				this.baseMaps = {
					'Default':  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
						attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
						subdomains: 'abcd',
						maxZoom: 19
					})
				};
			
				this.map = L.map('map',{'layers':[this.baseMaps.Default],'scrollWheelZoom':true,'zoomControl':true,'editable': true}).fitBounds([
					[lat-d, lon-d],
					[lat+d, lon+d]
				]);
				
				function makeMarker(colour){
					return L.divIcon({
						'className': '',
						'html':	'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'.replace(/%COLOUR%/,colour||"#000000"),
						iconSize:	 [25, 41], // size of the icon
						shadowSize:	 [41, 41], // size of the shadow
						iconAnchor:	 [12.5, 41], // point of the icon which will correspond to marker's location
						shadowAnchor: [12.5, 41],	// the same for the shadow
						popupAnchor:	[0, -41] // point from which the popup should open relative to the iconAnchor
					});
				}
				//S('body').append('<div class="seasonal-accent" id="_temp"></div>');
				//var bg = window.getComputedStyle(S('#_temp')[0]).backgroundColor;
				//S('#_temp').remove();
				var customicon = makeMarker();
				var markers = [];
				for(var c in this.counters){
					if(this.counters[c].c){
						markers.push(L.marker(this.counters[c].c,{icon: customicon,id:c,counter:this.counters[c]}).bindPopup('Test',{'minWidth':288}).addTo(this.map));
						//changing the content on mouseover
						markers[markers.length-1].on('mouseover', function(m){
							str = '<h3>'+this.options.counter.name+'</h3><p>'+this.options.counter.desc+'</p><ul>';
							for(var l in this.options.counter.lanes){
								str += '<li><a href="#" class="button seasonal-accent" data-id="'+l+'">&plus; Lane '+l+'</a></li>';
							}
							this._popup.setContent('<div id="popup-'+this.options.id+'">'+str+'</ul></div>');
						});
					}
					console.log(c,this.counters[c]);
				}
				var _obj = this;
				// Add events to buttons 
				this.map.on('popupopen', function(e) {
					var marker = e.popup._source;
					console.log('popupopen',marker.options.id,marker.options);
					S('#popup-'+marker.options.id+' a.button').on('click',{options:marker.options},function(e){
						e.preventDefault();
						e.stopPropagation();
						_obj.addCounter(e.data.options.id,e.currentTarget.getAttribute('data-id'));
						e.currentTarget.blur();
					});
				});

			}
			
			return this;
		}

		return this;
	}
	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];  // array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}

	// Function to parse a CSV file and return a JSON structure
	// Guesses the format of each column based on the data in it.
	function CSV2JSON(data,start,end){

		// If we haven't sent a start row value we assume there is a header row
		if(typeof start!=="number") start = 1;
		// Split by the end of line characters
		if(typeof data==="string") data = CSVToArray(data);
		// The last row to parse
		if(typeof end!=="number") end = data.length;

		if(end > data.length){
			// Cut down to the maximum length
			end = data.length;
		}


		var line,datum,header,types;
		var newdata = new Array();
		var formats = new Array();
		var req = new Array();

		for(var i = 0, rows = 0 ; i < end; i++){

			// If there is no content on this line we skip it
			if(data[i] == "") continue;

			line = data[i];

			datum = new Array(line.length);
			types = new Array(line.length);

			// Loop over each column in the line
			for(var j=0; j < line.length; j++){

				// Remove any quotes around the column value
				datum[j] = (line[j][0]=='"' && line[j][line[j].length-1]=='"') ? line[j].substring(1,line[j].length-1) : line[j];

				// If the value parses as a float
				if(typeof parseFloat(datum[j])==="number" && parseFloat(datum[j]) == datum[j]){
					types[j] = "float";
					// Check if it is actually an integer
					if(typeof parseInt(datum[j])==="number" && parseInt(datum[j])+"" == datum[j]){
						types[j] = "integer";
						// If it is an integer and in the range 1700-2100 we'll guess it is a year
						if(datum[j] >= 1700 && datum[j] < 2100) types[j] = "year";
					}
				}else if(datum[j].search(/^(true|false)$/i) >= 0){
					// The format is boolean
					types[j] = "boolean";
				}else if(datum[j].search(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/) >= 0){
					// The value looks like a URL
					types[j] = "URL";
				}else if(!isNaN(Date.parse(datum[j]))){
					// The value parses as a date
					types[j] = "datetime";
				}else{
					// Default to a string
					types[j] = "string";
					// If the string value looks like a time we set it as that
					if(datum[j].search(/^[0-2]?[0-9]\:[0-5][0-9]$/) >= 0) types[j] = "time";
				}
			}

			if(i == 0 && start > 0) header = datum;
			if(i >= start){
				newdata[rows] = datum;
				formats[rows] = types;
				rows++;
			}
		}
		
		// Now, for each column, we sum the different formats we've found
		var format = new Array(header.length);
		for(var j = 0; j < header.length; j++){
			var count = {};
			var empty = 0;
			for(var i = 0; i < newdata.length; i++){
				if(!newdata[i][j]) empty++;
			}
			for(var i = 0 ; i < formats.length; i++){
				if(!count[formats[i][j]]) count[formats[i][j]] = 0;
				count[formats[i][j]]++;
			}
			var mx = 0;
			var best = "";
			for(var k in count){
				if(count[k] > mx){
					mx = count[k];
					best = k;
				}
			}
			// Default
			format[j] = "string";

			// If more than 80% (arbitrary) of the values are a specific format we assume that
			if(mx > 0.8*newdata.length) format[j] = best;

			// If we have a few floats in with our integers, we change the format to float
			if(format[j] == "integer" && count['float'] > 0.1*newdata.length) format[j] = "float";

			req.push(header[j] ? true : false);

		}
		

		// Return the structured data
		return { 'fields': {'name':header,'title':clone(header),'format':format,'required':req }, 'rows': newdata };
	}
	function formatNumber(v){
		if(typeof v !== "number") return v;
		if(v > 1e7) return Math.round(v/1e6)+"M";
		if(v > 1e6) return (v/1e6).toFixed(1)+"M";
		if(v >= 1e3) return v.toLocaleString();
		return v;
	}
	// Sort the data
	function sortBy(arr,i){
		yaxis = i;
		return arr.sort(function (a, b) {
			return a[i] < b[i] ? 1 : -1;
		});
	}
	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}
	counters = new TrafficGrowth();
});
