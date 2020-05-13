var counters;
S(document).ready(function(){
	function TrafficGrowth(){
		el = S('#traffic');
		this.selected = [];
		this.counters = {};

		var colours = ['c1-bg','c2-bg','c3-bg','c4-bg','c5-bg','c6-bg','c7-bg','c8-bg','c9-bg','c10-bg','c11-bg','c12-bg','c13-bg','c14-bg'];

		// Do we update the address bar?
		this.pushstate = !!(window.history && history.pushState);
		
		// Add "back" button functionality
		if(this.pushstate){
			var _obj = this;
			window[(this.pushstate) ? 'onpopstate' : 'onhashchange'] = function(e){
				//console.log('popstate',e.state);
				if(e && e.state){
					_obj.selected = e.state.selected;
					
					var missing = false;	
					for(c = 0; c < _obj.selected.length; c++){
						if(!this.counters[_obj.selected[c].sensor] || !this.counters[_obj.selected[c].sensor].lanes[_obj.selected[c].lane].data){
							missing = true;
						}
					}
					if(missing){
						_obj.selected = [];
						_obj.processQueryString();						
					}else{
						_obj.display();
					}
				}else{
					_obj.selected = [];
					_obj.processQueryString();
				}
			};
		}
		
		this.addCounters = function(data,type){
			for(var id in data){
				if(data[id]){
					this.counters[id] = data[id];
					this.counters[id].type = type;
				}
			}
			return this;
		}

		this.getCounterLocations = function(){

			this.indextoload = 2;
			this.indexloaded = 0;
			this.counters = {};

			// Get the cycle sensor index
			S().ajax('data/index-cycle.json',{
				'dataType': 'json',
				'this': this,
				'cache': false,
				'success': function(d){
					this.indexloaded++;
					this.addCounters(d,'cycle');
					if(this.indextoload==this.indexloaded) this.processQueryString();
				},
				'error': function(e,attr){
					this.indexloaded++;
					console.error('Unable to load file '+attr.url);
					if(this.indextoload==this.indexloaded) this.processQueryString();
				}
			});
			
			// Get the footfall sensor index
			S().ajax('data/index-footfall.json',{
				'dataType': 'json',
				'this': this,
				'cache': false,
				'success': function(d){
					this.indexloaded++;
					this.addCounters(d,'footfall');
					if(this.indextoload==this.indexloaded) this.processQueryString();
				},
				'error': function(e,attr){
					console.error('Unable to load file '+attr.url);
				}
			});
			
		}

		this.getCounterLocations();
		
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
				for(a = 0; a < this.selected.length; a++){
					if(typeof this.selected[a].colour==="number" && this.selected[a].colour==c) found = true;
				}
				if(!found) return c;
			}
			return 0;
		}
		
		this.selectCounter = function(idx,callback){

			//idx = parseInt(idx);
			(bits) = idx[0].split(/-/);

			var match = false;
			for(c = 0; c < this.selected.length; c++){
				if(this.selected[c].sensor == idx[0] && this.selected[c].lane == idx[1]) match = true;
			}
			
			if(match){
				console.warn('We already have '+idx[0]+' lane '+idx[1]);
				if(typeof callback==="function") callback.call(this,idx);
			}else{


				// Add the code to the list of selected airports
				this.selected.push({'sensor':idx[0],'lane':idx[1],'colour':this.getUnusedColour()});
				
				if(!idx){
					console.warn('Unable to find counter', this.counters,idx);
					return this;
				}
				if(typeof this.counters[idx[0]].lanes[idx[1]].file!=="string") this.counters[idx[0]].lanes[idx[1]].file = bits[0]+'/'+bits[1]+'-'+bits[2]+'-'+idx[1]+'.csv';

				// Select this counter/lane
				this.counters[idx[0]].lanes[idx[1]].selected = true;
				
				//console.log(this.counters[idx[0]].lanes[idx[1]]);

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
						if(typeof callback==="function") callback.call(this,attr.idx);
					}
				});				
			}
			return this;
		}
		
		this.updateHistory = function(){
			// Update the history
			str = "";
			for(var i = 0; i < this.selected.length; i++) str += (str ? ';':'')+this.selected[i].sensor+":"+this.selected[i].lane;
			
			//console.log('pushState');
			if(this.pushstate) history.pushState({selected:this.selected},"Traffic Growth",'?'+str);
		}
		
		this.addCounterToMap = function(sensor,lane){
			//console.log('addCounter',sensor,lane);
			this.selectCounter([sensor,lane],function(idx){
				this.display();
				this.updateHistory();
			});
			return this;
		}
		
		this.removeCounter = function(sensor,lane){
			var idx = [sensor,lane];
			el.find('.select-'+idx[0]+'-'+idx[1]).remove();
			if(this.counters[idx[0]]){
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

			this.setMarker(sensor);
			this.updateHistory();
			return this;
		}

		// Update the marker
		this.setMarker = function(sensor){
		
			S('body').append('<div class="seasonal-accent" id="_temp"></div>');
			var bg = window.getComputedStyle(S('#_temp')[0]).backgroundColor;
			S('#_temp').remove();
			var haslane = false;
			for(l in this.counters[sensor].lanes){
				if(this.counters[sensor].lanes[l].selected) haslane = true;
			}
			S('#marker-'+sensor).find('path.bg').css({'fill':(haslane ? bg : '#000000')});
			return this;
		}

		this.getSensorLabel = function(sensor,lane){
			return (this.counters[sensor].name||'')+(Object.keys(this.counters[sensor].lanes).length > 1 ? ' ('+(this.counters[sensor].lanes[lane].title || 'lane '+lane)+')':'');
		}

		// Function to update the DOM with the charts
		this.display = function(){

			var c,code,n,idx,a;
			
			// Reset
			el.find('.output').html('');


			// Update tag list
			html = '<ul class="tags">';
			for(c = 0; c < this.selected.length; c++){
				idx = [this.selected[c].sensor,this.selected[c].lane];
				n = this.selected[c].colour;
				html += '<li class="select-'+idx[0]+'-'+idx[1]+'"><div class="tag '+colours[n]+'" title="'+this.counters[idx[0]].name+'">'+this.getSensorLabel(idx[0],idx[1])+'<a href="#" class="close" title="Remove '+this.counters[idx[0]].name+'" data-sensor="'+idx[0]+'" data-lane="'+idx[1]+'">&times;</a></div></li>';
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


			var min = "3000-12-01";
			var max = "0001-01-01";

			for(a in this.counters){
				haslane = false;
				for(l in this.counters[a].lanes){
					if(this.counters[a].lanes[l].data){
						for(s = 0; s < this.selected.length; s++){
							if(this.selected[s].sensor == a && this.selected[s].lane == l){
								for(var i = 0; i < this.counters[a].lanes[l].data.rows.length; i++){
									d = this.counters[a].lanes[l].data.rows[i][0];
									if(d < min) min = d;
									if(d > max) max = d;
								}
							}
						}
					}
				}
				this.setMarker(a);
			}

			var ds = new Date(min);
			var de = new Date(max);
			
			if(min == "3000-12-01") console.warn('Counter data seems to be lacking dates',this.counters,min,max,this.selected);

			html = '<h2>Counts by hour of day ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-hourly"></div><h2>Counts by day of week ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-dow"></div><h2>Counts by month ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-monthly"></div><h2>Counts by year ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-yearly"></div>';
			if(el.find('.charts').length==0) el.find('.output').append('<div class="charts">'+html+'</div>');
			else el.find('.charts').html(html);



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
				if(this.counters[idx[0]].lanes[idx[1]].data){
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
				}else{
					console.warn('No data loaded for '+idx[0]+' lane '+idx[1]);
				}
			}

			var _obj = this;
			var formatBar = function(key,value,series){
				var d,c,code,cls;
				d = new Date(key);
				d = d.getUTCDay();
				cls = "";
				for(var i = 0; i < this.data.length; i++){
					if(this.data[i][0]==key){
						if(i > this.data.length/2) cls = " bar-right";
					}
				}				
				if(typeof series==="number"){
					idx = _obj.selected[series];
					c = _obj.selected[series].colour;
					return (colours[c])+cls;
				}else return cls;
			}

			var chart = {};
			function buildArray(bins){
				var table = '';
				for(var i = 0; i < _obj.selected.length; i++) table += '<tr class="'+colours[_obj.selected[i].colour]+'"><td>'+_obj.getSensorLabel(_obj.selected[i].sensor,_obj.selected[i].lane)+'</td><td>'+bins.values[i].toLocaleString()+'</td></tr>';
				return '<table>'+table+'</table>';
			}

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
				table = buildArray(this.bins[e.bin]);
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' '+this.bins[i].key+'-'+(i+1 < 24 ? this.bins[(i+1)].key : "00:00")+ table+'</div>');
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
				table = buildArray(this.bins[e.bin]);
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' on '+this.bins[i].key+table+'</div>');
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
				table = buildArray(this.bins[e.bin]);
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' in '+this.bins[i].key+table+'</div>');
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
				table = buildArray(this.bins[e.bin]);
				// Add a new information balloon - if the bin size is >1 we show the bin range in the label
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">' + this.bins[i].value.toLocaleString()+' count'+(this.bins[i].value == 1 ? '':'s')+' in '+this.bins[i].key+table+'</div>');
			});
			// Set the data, bins and draw
			chart.yearly.setData(data.yearly).setBins({}).draw();

			return this;
		}
		
		this.buildMap = function(){
			if(!this.map){
				lat = 53.85;
				lon = -1.45;
				d = 0.20;
			
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

				var svgs = {
					'cycle':'<g transform="translate(12.5,41)"><path class="bg" style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke-width:0" d="M 0,0 l -10,-20 q -2.2 -5, -2 -9 a 12,12 1 0,1 24,1 q 0.2 4, -2 9 Z"></path><g transform="translate(0,-28)"><path style="fill:white;stroke-width:0;" d="M -4.5,4 m -3,0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0 M -4.5,4 m -2,0 a 2,2 1 0,1 4,0 a 2,2 1 0,1 -4,0 M 4.5,4 m -3,0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0 M 4.5,4 m -2,0 a 2,2 1 0,1 4,0 a 2,2 1 0,1 -4,0 "></path><path style="fill:white;stroke-width:0;" d="M 0.75,5 l -1.5,0 0,-3.2 c -3 -2, -3 -2,-2.5 -3 c 4 -4, 4 -4, 6 -2 q 1 1, 3 1 l 0,1.5 q -3,0 ,-4.5 -1.8 l -2,2 1.6,1.2 Z M 3.2,-6 m -1.5,0 a 1.5,1.5 0 1,0 3,0 a 1.5,1.5 0 1,0 -3,0"></path></g></g>',
					'footfall':'<g transform="translate(12.5,41)"><path class="bg" style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke-width:0" d="M 0,0 l -10,-20 q -2.2 -5, -2 -9 a 12,12 1 0,1 24,1 q 0.2 4, -2 9 Z"></path><g transform="translate(0,-28)"><path style="fill:white;stroke-width:0;" d="M 3.5,8 q -2 2, -4 0 q -2 -5, -3 -7 q 0 -3, 2.5 -4 q 2 -1, 3,-1 c 1 4, -1 3, -1 6 c 0 1.5, 1 1.5,1 3Z"></path><path style="fill:white;stroke-width:0;" d="M -5,-4 a 0.5,0.5 1 0,1 1,1 a 0.5,0.5 1 0,1 -1,1 M -3.5,-5.2 a 0.6,0.6 1 0,1 1.2,1 a 0.6,0.6 1 0,1 -1.2,1 M -2,-6 a 0.7,0.7 1 0,1 1.4,1 a 0.7,0.7 1 0,1 -1.4,1 M 0,-6.8 a 0.8,0.8 1 0,1 1.6,1 a 0.8,0.8 1 0,1 -1.6,1 M 2,-7.4 a 1,1 1 0,1 2,1 a 1,1 1 0,1 -2,1 Z"></path></g></g>',
					'marker':'<g id="layer1" transform="translate(1195.4,216.71)"><path class="bg" style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g>'
				}
				
				function makeMarker(type,name,id){
					colour = "black";
					if(type != "cycle" && type != "footfall") type = "marker";
					return L.divIcon({
						'className': '',
						'html':	('<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="25px" height="41px" viewBox="0 0 25 41" id="marker-'+id+'" version="1.1" style="overflow:visible">'+(name ? '<text x="12.5" y="-2" text-anchor="middle" style="font: inherit;opacity:0.5;">'+name+'</text>':'')+svgs[type]+'</svg>').replace(/%COLOUR%/,colour||"#000000"),
						iconSize:	 [25, 41], // size of the icon
						iconAnchor:	 [12.5, 41], // point of the icon which will correspond to marker's location
						popupAnchor:	[0, -41] // point from which the popup should open relative to the iconAnchor
					});
				}
				//S('body').append('<div class="seasonal-accent" id="_temp"></div>');
				//var bg = window.getComputedStyle(S('#_temp')[0]).backgroundColor;
				//S('#_temp').remove();
				this.markers = [];
				
				for(var c in this.counters){
					if(this.counters[c].c){
						this.markers.push(L.marker(this.counters[c].c,{icon: makeMarker(this.counters[c].type,null,c),id:c,counter:this.counters[c]}).bindPopup('Test',{'minWidth':288}).addTo(this.map));
						//changing the content on mouseover
						this.markers[this.markers.length-1].on('click', function(m){
							str = '<h3>'+this.options.counter.name+'</h3><p>'+this.options.counter.desc+'</p><ul>';
							for(var l in this.options.counter.lanes){
								str += '<li><a href="#" class="button seasonal-accent" data-id="'+l+'">&plus; '+(this.options.counter.lanes[l].title ? this.options.counter.lanes[l].title : 'Lane '+l)+'</a></li>';
							}
							this._popup.setContent('<div id="popup-'+this.options.id+'">'+str+'</ul></div>');
							// Add events to buttons 
							S(this._popup._container).find('a.button').on('click',{options:this.options},function(e){
								e.preventDefault();
								e.stopPropagation();
								_obj.addCounterToMap(e.data.options.id,e.currentTarget.getAttribute('data-id'));
								e.currentTarget.blur();
							});
						});
					}
				}
				var _obj = this;
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
		if(v >= 1e3) return (v/1e3).toFixed(1).replace('.0','')+'k';
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
