var counters;

(function(root){

	/* ============ */
	/* Colours v0.3 */
	// Define colour routines
	function Colour(c,n){
		if(!c) return {};

		function d2h(d) { return ((d < 16) ? "0" : "")+d.toString(16);}
		function h2d(h) {return parseInt(h,16);}
		/**
		 * Converts an RGB color value to HSV. Conversion formula
		 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
		 * Assumes r, g, and b are contained in the set [0, 255] and
		 * returns h, s, and v in the set [0, 1].
		 *
		 * @param	Number  r		 The red color value
		 * @param	Number  g		 The green color value
		 * @param	Number  b		 The blue color value
		 * @return  Array			  The HSV representation
		 */
		function rgb2hsv(r, g, b){
			r = r/255;
			g = g/255;
			b = b/255;
			var max = Math.max(r, g, b), min = Math.min(r, g, b);
			var h, s, v = max;
			var d = max - min;
			s = max == 0 ? 0 : d / max;
			if(max == min) h = 0; // achromatic
			else{
				switch(max){
					case r: h = (g - b) / d + (g < b ? 6 : 0); break;
					case g: h = (b - r) / d + 2; break;
					case b: h = (r - g) / d + 4; break;
				}
				h /= 6;
			}
			return [h, s, v];
		}

		this.alpha = 1;

		// Let's deal with a variety of input
		if(c.indexOf('#')==0){
			this.hex = c;
			this.rgb = [h2d(c.substring(1,3)),h2d(c.substring(3,5)),h2d(c.substring(5,7))];
		}else if(c.indexOf('rgb')==0){
			var bits = c.match(/[0-9\.]+/g);
			if(bits.length == 4) this.alpha = parseFloat(bits[3]);
			this.rgb = [parseInt(bits[0]),parseInt(bits[1]),parseInt(bits[2])];
			this.hex = "#"+d2h(this.rgb[0])+d2h(this.rgb[1])+d2h(this.rgb[2]);
		}else return {};
		this.hsv = rgb2hsv(this.rgb[0],this.rgb[1],this.rgb[2]);
		this.name = (n || "Name");
		var r,sat;
		for(r = 0, sat = 0; r < this.rgb.length ; r++){
			if(this.rgb[r] > 200) sat++;
		}
		this.toString = function(){
			return 'rgb'+(this.alpha < 1 ? 'a':'')+'('+this.rgb[0]+','+this.rgb[1]+','+this.rgb[2]+(this.alpha < 1 ? ','+this.alpha:'')+')'
		}
		this.text = (this.rgb[0] + this.rgb[1] + this.rgb[2] > 500 || sat > 1) ? "black" : "white";
		return this;
	}
	function Colours(){
		var scales = {
			'Viridis': 'rgb(68,1,84) 0%, rgb(72,35,116) 10%, rgb(64,67,135) 20%, rgb(52,94,141) 30%, rgb(41,120,142) 40%, rgb(32,143,140) 50%, rgb(34,167,132) 60%, rgb(66,190,113) 70%, rgb(121,209,81) 80%, rgb(186,222,39) 90%, rgb(253,231,36) 100%',
			'ODI': 'rgb(114,46,165) 0%, rgb(230,0,124) 50%, rgb(249,188,38) 100%',
			'Heat': 'rgb(0,0,0) 0%, rgb(128,0,0) 25%, rgb(255,128,0) 50%, rgb(255,255,128) 75%, rgb(255,255,255) 100%',
			'Planck': 'rgb(0,0,255) 0, rgb(0,112,255) 16.666%, rgb(0,221,255) 33.3333%, rgb(255,237,217) 50%, rgb(255,180,0) 66.666%, rgb(255,75,0) 100%',
			'EPC': '#ef1c3a 1%, #ef1c3a 20.5%, #f78221 20.5%, #f78221 38.5%, #f9ac64 38.5%, #f9ac64 54.5%, #ffcc00 54.5%, #ffcc00 68.5%, #8cc63f 68.5%, #8cc63f 80.5%, #1bb35b 80.5%, #1bb35b 91.5%, #00855a 91.5%, #00855a 120%',
			'Plasma': 'rgb(12,7,134) 0%, rgb(64,3,156) 10%, rgb(106,0,167) 20%, rgb(143,13,163) 30%, rgb(176,42,143) 40%, rgb(202,70,120) 50%, rgb(224,100,97) 60%, rgb(241,130,76) 70%, rgb(252,166,53) 80%, rgb(252,204,37) 90%, rgb(239,248,33) 100%',
			'Referendum': '#4BACC6 0, #B6DDE8 50%, #FFF380 50%, #FFFF00 100%',
			'Leodis': '#2254F4 0%, #F9BC26 50%, #ffffff 100%',
			'Longside': '#801638 0%, #addde6 100%'
		};
		function col(a){
			if(typeof a==="string") return new Colour(a);
			else return a;
		}
		this.getColourPercent = function(pc,a,b){
			pc /= 100;
			a = col(a);
			b = col(b);
			return 'rgb'+(a.alpha<1 || b.alpha<1 ? 'a':'')+'('+parseInt(a.rgb[0] + (b.rgb[0]-a.rgb[0])*pc)+','+parseInt(a.rgb[1] + (b.rgb[1]-a.rgb[1])*pc)+','+parseInt(a.rgb[2] + (b.rgb[2]-a.rgb[2])*pc)+(a.alpha<1 || b.alpha<1 ? ','+((b.alpha-a.alpha)*pc):'')+')';
		};
		this.makeGradient = function(a,b){
			a = col(a);
			b = col(b);
			return 'background: '+a.hex+'; background: -moz-linear-gradient(left, '+a.toString()+' 0%, '+b.toString()+' 100%);background: -webkit-linear-gradient(left, '+a.hex+' 0%,'+b.hex+' 100%);background: linear-gradient(to right, '+a.hex+' 0%,'+b.hex+' 100%);';
		};
		this.addScale = function(id,str){
			scales[id] = str;
			processScale(id,str);
		}
		function processScale(id,str){
			if(scales[id] && scales[id].str){
				console.warn('Colour scale '+id+' already exists. Bailing out.');
				return this;
			}
			scales[id] = {'str':str};
			scales[id].stops = extractColours(str);
			return this;
		}
		function extractColours(str){
			var stops,cs,i,c;
			stops = str.replace(/^\s+/g,"").replace(/\s+$/g,"").replace(/\s\s/g," ").split(', ');
			cs = [];
			for(i = 0; i < stops.length; i++){
				var bits = stops[i].split(/ /);
				if(bits.length==2) cs.push({'v':bits[1],'c':new Colour(bits[0])});
				else if(bits.length==1) cs.push({'c':new Colour(bits[0])});
			}
			
			for(c=0; c < cs.length;c++){
				if(cs[c].v){
					// If a colour-stop has a percentage value provided, 
					if(cs[c].v.indexOf('%')>=0) cs[c].aspercent = true;
					cs[c].v = parseFloat(cs[c].v);
				}
			}
			return cs;
		}

		// Process existing scales
		for(var id in scales){
			if(scales[id]) processScale(id,scales[id]);
		}
		
		// Return a Colour object for a string
		this.getColour = function(str){
			return new Colour(str);
		};
		// Return the colour scale string
		this.getColourScale = function(id){
			return scales[id].str;
		};
		// Return the colour string for this scale, value and min/max
		this.getColourFromScale = function(s,v,min,max){
			var cs,v2,pc,c;
			var colour = "";
			if(!scales[s]){
				console.warn('No colour scale '+s+' exists');
				return '';
			}
			if(typeof min!=="number") min = 0;
			if(typeof max!=="number") max = 1;
			cs = scales[s].stops;
			v2 = 100*(v-min)/(max-min);
			
			var match = -1;
			if(v==max){
				colour = 'rgba('+cs[cs.length-1].c.rgb[0]+', '+cs[cs.length-1].c.rgb[1]+', '+cs[cs.length-1].c.rgb[2]+', ' + cs[cs.length-1].c.alpha + ")";
			}else{
				if(cs.length == 1) colour = 'rgba('+cs[0].c.rgb[0]+', '+cs[0].c.rgb[1]+', '+cs[0].c.rgb[2]+', ' + (v2/100).toFixed(3) + ")";
				else{
					for(c = 0; c < cs.length-1; c++){
						if(v2 >= cs[c].v && v2 <= cs[c+1].v){
							// On this colour stop
							pc = 100*(v2 - cs[c].v)/(cs[c+1].v-cs[c].v);
							if(v2 >= max) pc = 100;	// Don't go above colour range
							colour = this.getColourPercent(pc,cs[c].c,cs[c+1].c);
							continue;
						}
					}
				}
			}
	
			return colour;	
		};
		
		return this;
	}

	root.Colour = new Colours();


})(window || this);

(function(root){

	var colours = ['c1-bg','c2-bg','c3-bg','c4-bg','c5-bg','c6-bg','c7-bg','c8-bg','c9-bg','c10-bg','c11-bg','c12-bg','c13-bg','c14-bg'];

	function TrafficGrowth(){
		el = S('#traffic');
		this.selected = [];
		this.counters = {};

		// Do we update the address bar?
		this.pushstate = !!(window.history && history.pushState);
		
		// Add "back" button functionality
		if(this.pushstate){
			var _obj = this;
			window[(this.pushstate) ? 'onpopstate' : 'onhashchange'] = function(e){
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

			if(this.pushstate) history.pushState({selected:this.selected},"Traffic Growth",'?'+str);
		}
		
		this.addCounterToMap = function(sensor,lane){
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

			var c,code,n,idx,a,iso,ds,de,dailydone,min,max,pos,data,dow,month;

			// Create data arrays
			data = {'hourly':[],'dow':[],'monthly':[],'yearly':[],'daily':new Array(this.selected.length)};
			dow = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
			month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

			min = "3000-12-01";
			max = "0001-01-01";

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

			ds = new Date(min);
			de = new Date(max);
			
			if(min == "3000-12-01") console.warn('Counter data seems to be lacking dates',this.counters,min,max,this.selected);

			html = '<div id="calendar-view"></div><h2>Counts by hour of day ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-hourly"></div><h2>Counts by day of week ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-dow"></div><h2>Counts by month ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-monthly"></div><h2>Counts by year ('+ds.toISOString().substr(0,10)+' &rarr; '+de.toISOString().substr(0,10)+')</h2><div id="barchart-yearly"></div>';
			if(el.find('.charts').length==0) el.find('.output').append('<div class="charts">'+html+'</div>');
			else el.find('.charts').html(html);

			for(h = 0; h < 24; h++) data.hourly.push([(h<10 ? "0":"")+h+":00",new Array(this.selected.length)]);
			for(d = 0; d < 7; d++) data.dow.push([dow[d],new Array(this.selected.length)]);
			for(m = 0; m < 12; m++) data.monthly.push([month[m],new Array(this.selected.length)]);
			for(y = ds.getUTCFullYear(); y <= de.getUTCFullYear(); y++) data.yearly.push([y+"",new Array(this.selected.length)]);

			// To avoid including the same day twicee
			
			for(c = 0; c < this.selected.length; c++){
				dailydone = {};
				idx = [this.selected[c].sensor,this.selected[c].lane];
				for(h = 0; h < 24; h++) data.hourly[h][1][c] = 0;
				for(d = 0; d < 7; d++) data.dow[d][1][c] = 0;
				for(m = 0; m < 12; m++) data.monthly[m][1][c] = 0;
				for(y = 0; y < data.yearly.length; y++) data.yearly[y][1][c] = 0;
				data.daily[c] = {'label':this.getSensorLabel(this.selected[c].sensor,this.selected[c].lane),'days':{}};
				if(this.counters[idx[0]].lanes[idx[1]].data){
					for(var i = 0; i < this.counters[idx[0]].lanes[idx[1]].data.rows.length; i++){
						d = new Date(this.counters[idx[0]].lanes[idx[1]].data.rows[i][0]);
						iso = d.toISOString().substr(0,10);
						if(!data.daily[c].days[iso]) data.daily[c].days[iso] = 0;
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
						if(!dailydone[iso]){
							data.daily[c].days[iso] += t;
							dailydone[iso] = true;
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

			var calendar = new CalendarMap(data.daily,{'start':ds,'end':de});

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
	root.TrafficGrowth = TrafficGrowth;

	// Create a "Calendar Heat Map" view
	function CalendarMap(data,opts){

		this.setOptions = function(opts){
			if(!opts) opts = {};
			if(!opts.start) opts.start = new Date();
			if(!opts.end) opts.end = new Date();
			if(!opts.id) opts.id = 'calendar-view';
			this.opts = opts;
			return this;
		}
		this.setData = function(data){
			var i,iso,s,e;

			this.data = data;

			s = this.opts.start;
			e = this.opts.end;
			
			s.setDate(1);
			s.setMonth(0);
			s.setHours(12);
			e.setDate(1);
			e.setMonth(11);
			e.setDate(31);
			e.setHours(12);

			this.calendar = [];

			for(i = 0; i < data.length; i++){
				this.calendar[i] = {'days':{}};
				for(iso in data[i].days){
					if(data[i].days[iso]){
						this.calendar[i].days[iso] = {'date':new Date(iso),'total':data[i].days[iso]};
					}
				}
			}

			this.start = s;
			this.end = e;

			return this;
		}
		
		function getCSSPropertyFromClass(cls,prop){
			var el = document.createElement('div');
			el.className = cls;
			el.innerHTML = "Test";
			document.body.appendChild(el);
			rtn = window.getComputedStyle(el,null).getPropertyValue(prop);
			el.parentNode.removeChild(el);
			return rtn;
		}	
		this.draw = function(){

			if(!this.calendar) return this;

			var cal,i,html,curryear,changeday,mx,weeklabels,d,sday,oldy,scale,a,b,c;
			html = '';
			weeklabels = '	<div class="week"><div class="day"><span>M</span></div><div class="day"><span>T</span></div><div class="day"><span>W</span></div><div class="day"><span>T</span></div><div class="day"><span>F</span></div><div class="day"><span>S</span></div><div class="day"><span>S</span></div></div>';
			//Colour.addScale('Heat2','#222222 0%, rgb(128,0,0) 25%, rgb(255,128,0) 50%, rgb(255,255,128) 75%, rgb(255,255,255) 100%');
			scale = 'Viridis';

			// Loop over calendars

			for(cal = 0 ; cal < this.calendar.length; cal++){

				// Calculate the range
				mx = 0;
				for(d in this.calendar[cal].days){
					if(this.calendar[cal].days[d].total > mx) mx = this.calendar[cal].days[d].total;
				}
				// Set the colour scale
				a = Colour.getColourFromScale(scale,0,0,mx);
				b = Colour.getColourFromScale(scale,mx,0,mx);

				curryear = {'body':'','title':this.start.getFullYear()};
				changeday = 1;
				html += '<section class="calendar padded-bottom" style="border:8px solid '+getCSSPropertyFromClass(colours[cal],'background-color')+';border-top:0;"><div class="'+colours[cal]+' padded"><h2>'+this.data[cal].label+'</h2></div><div class="padded"><div class="scalebar"><div class="lower">0</div><div class="upper">'+formatNumber(mx)+'</div></div>';
				curryear.body += weeklabels;
				curryear.body += '	<div class="week">';
				sday = this.start.getDay()-1;
				if(sday < 0) sday += 7;
				for(d = 0; d < sday; d++) curryear.body += '		<div class="day"></div>';


				oldy = -1;
				
				var years = new Array();
				
				d = new Date(this.start);
				
				while(d.getTime() <= this.end.getTime()){
					v = 0;
					iso = d.toISOString().substr(0,10);
					if(d.getDay()==changeday) curryear.body += '</div><div class="week">'
					if(oldy > 0 && d.getYear()!=oldy){
						years.push(curryear);
						curryear = {'body':'','title':d.getFullYear()};
						curryear.body += weeklabels;
						curryear.body += '<div class="week">';
						var sday = d.getDay()-1;
						if(sday < 0) sday += 7;
						for(var da = 0; da < sday; da++) curryear.body += '		<div class="day"></div>';
					}

					if(this.calendar[cal].days[iso]) v = this.calendar[cal].days[iso].total;
					
					curryear.body += '		<div class="day" style="background-color:'+(this.calendar[cal].days[iso] ? Colour.getColourFromScale(scale,v,0,mx) : 'transparent')+'"'+(this.calendar[cal].days[iso] ? ' title="'+iso+': '+formatNumber(v,"")+'"':'')+' data-iso="'+iso+'">'+(this.calendar[iso] ? '' : '')+'</div>';
					oldy = d.getYear();
					d.setDate(d.getDate()+1);
				}
				years.push(curryear);
				
				for(var y = years.length-1; y >= 0; y--){
					if(y < years.length-1) html += '</div>';
					html += '	<h4>'+years[y].title+'</h4>';
					html += '<div class="year">'+years[y].body+'</div>';
				}
				html += '</div></div></section>';
				
			}

			// Add the generated calendar to the page
			S('#'+this.opts.id).html(html);
			grad = 	Colour.getColourScale(scale);
			S('.scalebar').attr('style','height: 1em;width:100%;background:-moz-linear-gradient(left, '+grad+');background: -webkit-linear-gradient(left,'+grad+');background: linear-gradient(to right,'+grad+')');

			// Add events to every day
			S('.day').on('mouseover',function(e){
				S('.indicator').remove();
				var el = S(e.currentTarget);
				var iso = el[0].getAttribute('data-iso');
				var cls = (iso && parseInt(iso.substr(5,2)) > 6) ? ' indicator-right':'';
				if(el.attr('title')) el.append('<div class="indicator'+cls+'"><div class="handle"></div><div class="values">'+el.attr('title')+' counts</div></div>');
			});

			return this;
		}

		this.setOptions(opts);
		this.setData(data);
		this.draw();

		return this;
	}
	root.CalendarMap = CalendarMap;

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
		if(v > 1e6) return (v/1e6).toFixed(1).replace('.0','')+"M";
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
	
	S(document).ready(function(){
		counters = new TrafficGrowth();
	});

})(window || this);