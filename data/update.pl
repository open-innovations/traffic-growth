#!/usr/bin/perl

use warnings;
use Geo::Coordinates::OSGB qw(ll_to_grid grid_to_ll);
use JSON::XS;
use utf8;

%sensors = ();
%sitedata = ();
%sensorjson = ();
%sensorlane = ();


# Get all the data files
# Get the Leeds cycle growth package from Data Mill North
push(@rtn,getPackage("https://datamillnorth.org/api/action/package_show?id=leeds-annual-cycle-growth-",{'dir'=>'leeds','prefix'=>'cycle','sites'=>{'id'=>'Site ID','description'=>'Description','title'=>'Site Name','latitude'=>'Latitude','longitude'=>'Longitude'},'yearly'=>{'id'=>'Cosit','date'=>'Sdate','lane'=>'LaneNumber','count'=>'Volume','period'=>'Period'}}));
# Get cycle counter data from York Open Data
push(@rtn,getPackage("https://data.yorkopendata.org/api/3/action/package_show?id=automatic-cycle-counters",{'dir'=>'york','prefix'=>'cycle','sites'=>{'id'=>'SiteNumber','lane'=>'CountID','description'=>'Road','lanedesc'=>'ChannelDirection','title'=>'RoadName','latitude'=>'Northing','longitude'=>'Easting'},'yearly'=>{'id'=>'SiteRefNumber','lane'=>'CounterID','date'=>'Date','time'=>'TimePeriod','count'=>'PedalCycles'}}));



# Process all the data files
print "Processing data files\n";
for($f = 0; $f < @rtn ; $f++){
	$dir = $rtn[$f]{'dir'};
	$prefix = $rtn[$f]{'prefix'};
	print "$rtn[$f]{'prefix'} - $rtn[$f]{'file'}\n";
	open(CSV,$rtn[$f]{'file'});
	%h = ();
	$i = 0;
	while(<CSV>){
		$line = $_;
		$line =~ s/[\n\r]//g;
		if($line ne ""){
			@cols = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$line);
			if($i == 0){

				for($c = 0; $c < @cols; $c++){ $h{$cols[$c]} = $c; }

			}else{

				$id = "";
				if($rtn[$f]{'yearly'}{'id'} && $h{$rtn[$f]{'yearly'}{'id'}} ne ""){
					$id = $cols[$h{$rtn[$f]{'yearly'}{'id'}}];
					if($id){
						$id =~ s/^0{4,}//;
					}
				}
				
				if($id eq ""){
					print "WARNING on line $i of $file ($cols[$h{$rtn[$f]{'yearly'}{'id'}}])\n";
				}
				$sensor = "default";
				if($rtn[$f]{'yearly'}{'lane'} && $h{$rtn[$f]{'yearly'}{'lane'}}>=0){
					$sensor = $dir."-".$prefix."-".$id."-".$cols[$h{$rtn[$f]{'yearly'}{'lane'}}];
				}else{
					print "$sensor = $dir = $prefix = $id = $rtn[$f]{'yearly'}{'lane'} = $h{$rtn[$f]{'yearly'}{'lane'}}\n";
				}
				$h1 = 0;
				$h2 = 0;
				$date = "";
				
				# Process the date column
				if($rtn[$f]{'yearly'}{'date'} && $h{$rtn[$f]{'yearly'}{'date'}} ne ""){
					$date = $cols[$h{$rtn[$f]{'yearly'}{'date'}}];
					# Tidy if it is a datetime stamp
					if($date =~ /([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9]{2}):([0-9]{2})/){
						$date =~ s/([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9]{2}):([0-9]{2})/$3-$2-$1T$4:$5Z/g;
						$h1 = $4 + ($5/60);
						$h2 = int($h1+1);
						$date =~ s/T[0-9]{2}:[0-9]{2}Z//;
					}
				}

				$period = 0;
				if(!$sensors{$sensor}){
					$sensors{$sensor} = {'values'=>{}};
				}


				# Process time if separate
				if($rtn[$f]{'yearly'}{'time'} && $h{$rtn[$f]{'yearly'}{'time'}} ne ""){
					$times = $cols[$h{$rtn[$f]{'yearly'}{'time'}}];
					if($times =~ /([0-9]{2}):([0-9]{2})\-([0-9]{2}):([0-9]{2})/){
						$t1 = $1.":".$2;
						$t2 = $3.":".$4;
						$h1 = $1 + ($2/60);
						$h2 = $3 + ($4/60);
						if($h1 == 23 && $h2 == 0){ $h2 = 24; }
						$period = ($h2-$h1)*60;
					}
				}else{
					if($rtn[$f]{'yearly'}{'period'} && $h{$rtn[$f]{'yearly'}{'period'}} ne ""){
						$period = $cols[$h{$rtn[$f]{'yearly'}{'period'}}];
					}
				}

				if(($h2 - $h1 > 24) || ($h2 - $h1 < 0)){
					print "$sensor - $h{$rtn[$f]{'yearly'}{'date'}} - $date - $h1 - $h2\n";
				}
				for($hh = $h1; $hh < $h2; $hh++){
					$datestamp = $date."T".sprintf("%02d",int($hh)).":".sprintf("%02d",int(($hh - int($hh))*60))."Z";
					$sensors{$sensor}{'values'}{$datestamp} = {'value'=>0,'period'=>$period};
					if($rtn[$f]{'yearly'}{'count'} && $h{$rtn[$f]{'yearly'}{'count'}} ne ""){
						$c = $cols[$h{$rtn[$f]{'yearly'}{'count'}}];
						if($period/60 > 1){
							$c = sprintf("%.1f",$c/($period/60));
							# Update period
							$sensors{$sensor}{'values'}{$datestamp}{'period'} = 60;
						}
						$sensors{$sensor}{'values'}{$datestamp}{'value'} = $c;
					}
				}
			}
		}
		$i++;
	}
	close(CSV);

}



# Save each sensor
print "Saving each sensor\n";
foreach $sensor (sort(keys(%sensors))){
	($dir,$prefix,$id,$lane) = split(/\-/,$sensor);

	print "$sensor\n";
	@datetimes = sort(keys(%{$sensors{$sensor}{'values'}}));
	%dts = ();
	@dates = "";
	for $d (@datetimes){
		(@cols) = split(/T/,$d);
		$dts{$cols[0]} = 1;
	}
	foreach $d (sort(keys(%dts))){
		push(@dates,$d);
	}
	$file = $dir."/".$prefix."-".$id."-".$lane.".csv";
	open(FILE,">:utf8",$file);
	print FILE "Date";
	@units = "";
	for($i = 0; $i < 24; $i++){ push(@units,sprintf("%02d:00",$i)); }

	for($h = 0; $h < @units; $h++){
		if($units[$h]){
			print FILE ",$units[$h]";
		}
	}
	print FILE "\n";
	for $dt (@dates){
		if($dt){
			print FILE $dt;
			for($h = 0; $h < @units; $h++){
				if($units[$h]){
					$d = $dt."T".$units[$h]."Z";
					print FILE ",".($sensors{$sensor}{'values'}{$d}{'value'} && $sensors{$sensor}{'values'}{$d}{'value'} gt 0 && $sensors{$sensor}{'values'}{$d}{'period'} == 60 ? $sensors{$sensor}{'values'}{$d}{'value'} : "");
				}
			}
			print FILE "\n";
		}
	}
	close(FILE);

	$s = $dir."-".$prefix."-".$id;
	if(!$sensorlane{$s}){ $sensorlane{$s} = ""; }
	if(!$sensorjson{$s}){
#print $s." - $sitedata{$s}{'lat'}\n";
		$index = "";
		$index .= "\t\"$s\": {";
		$index .= "\"start\":\"$datetimes[0]\"";
		$index .= ",\"c\":[".($sitedata{$s}{'lat'}||"null").",".($sitedata{$s}{'lon'}||"null")."]";
		$index .= ",\"name\":\"".($sitedata{$s}{'name'}||"")."\"";
		$index .= ",\"desc\":\"".($sitedata{$s}{'description'}||"")."\"";
		$index .= ",\"orientation\":\"".($sitedata{$s}{'orientation'}||"")."\"";
		$sensorjson{$s} = $index;
	}
	if($sensorlane{$s}){ $sensorlane{$s} .= ","; }
	#$sensorlane{$s} .= "\"$lane\":{\"start\":\"$datetimes[0]\",\"period\":$sensors{$sensor}{'period'},\"b\":".(-s $file)."}";

	# Save each lane with its start time and size in bytes
	$sensorlane{$s} .= "\"$lane\":{\"start\":\"$datetimes[0]\",\"b\":".(-s $file).",\"title\":\"".($sitedata{$s}{'lanes'}{$lane}{'description'}||"")."\"}";

}

open(FILE,">:utf8","index-cycle.json");
print FILE "{\n";
$i = 0;
foreach $s (sort(keys(%sensorjson))){
	if($i > 0){ print FILE ",\n"; }
	print FILE "$sensorjson{$s},\"lanes\":{$sensorlane{$s}}}";
	$i++;
}
print FILE "\n}";
close(FILE);










########################

sub getPackage {
	local ($url,$dir,$prefix,$str,$json,@resources,$n,$file,$y,@lines,@header,%h,@cols,$c,$i,$l,$sensor,$date,$id,%config,$key,$period,$lat,$lon,$times,$t1,$t2,$h1,$h2,@letters,%years,%datafiles);
	$url = $_[0];
	%config = %{$_[1]};
	$dir = $config{'dir'};
	$prefix = $config{'prefix'};

	# Make the directory if it doesn't exist
	if(!-d $dir){ `mkdir $dir`; }
	if(!-d $dir."/raw/"){ `mkdir $dir/raw/`; }


	$str = "";
	$file = $dir."/raw/$prefix-data.json";
	print "Getting $url to $file\n";
	`wget -q --no-check-certificate -O $file "$url"`;

	open(FILE,$file);
	@lines = <FILE>;
	close(FILE);
	$str = join("\n",@lines);
	# Remove the metadata file
	`rm $file`;


	$json = JSON::XS->new->utf8->decode($str);
	@resources = @{$json->{'result'}->{'resources'}};
	$n = @resources;
	%years = ();
	%datafiles = ();
	@letters = ('A'..'Z');
	

	# Loop over the resources (oldest to newest)
	for($i = 0; $i < $n; $i++){
		# Remove leading/trailing spaces in name
		$resources[$i]{'name'} =~ s/(^\s+|\s+$)//g;
		if($resources[$i]{'name'} =~ /([0-9]{4})/){
			# Find the year
			$y = $1;
			if(!$years{$y}){ $years{$y} = $letters[0]; }
			else{
				for($l = 1; $l < @letters; $l++){
					if($letters[$l] gt $years{$y}){
						$years{$y} = $letters[$l];
						last;
					}
				}
			}
			# Now build a local file name. There can be more than one file per year so use the internal ID
			$file = $dir."/raw/".$resources[$i]{'id'}.".csv";
			$datafiles{$y."-".$years{$y}} = $file;
			#print "YEAR = $y, FILE = $file ($resources[$i]{'name'}".($resources[$i]{'description'} ? " - ".$resources[$i]{'description'} : "").")\n";
			if(!-e $file){
				print "Getting $dir > $prefix > $y".($resources[$i]{'size'} ? " (".$resources[$i]{'size'}." bytes)":"(unknown size)")."\n";
				`wget -q --no-check-certificate -O $file "$resources[$i]{'url'}"`;
			}
		}elsif($resources[$i]{'name'} =~ /Locations|Site Reference/i){
			$file = $dir."/raw/$prefix".($prefix ? "-" : "")."locations.csv";
			if(!-e $file){
				print "Getting $dir > $prefix > $resources[$i]{'name'}\n";
				`wget -q --no-check-certificate -O $file "$resources[$i]{'url'}"`;
			}
			# PRocess the site locations file
			open(FILE,$file);
			@lines = <FILE>;
			close(FILE);
			%h = ();
			$lines[0] =~ s/[\n\r]//g;
			# Site ID,Site Name,Description,Orientation,Grid,Latitude,Longitude
			# SiteNumber,CountID,CounterType,ChannelDirection,Road,RoadName,Comments,Easting,Northing
			(@header) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[0]);
			for($c = 0; $c < @header; $c++){ $h{$header[$c]} = $c; }
			for($l = 1; $l < @lines; $l++){
				$lines[$l] =~ s/[\n\r]//g;
				(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[$l]);
				$cols[$h{$config{'sites'}{'title'}}] =~ s/^LEEDS_//g;
				$cols[$h{$config{'sites'}{'id'}}] =~ s/^0+//g;

				$key = $dir."-".$prefix."-".$cols[$h{$config{'sites'}{'id'}}];
				
				# If we haven't created this site we create it now
				if(!$sitedata{$key}){
					$sitedata{$key} = {'name'=>'','title'=>'','orientation'=>'','latitude'=>'null','longitude'=>'null','lanes'=>{}};
				}

				#if($config{'sites'}{'lane'}){
				#	#$sitedata{'lanes'}{$cols[$h{$config{'sites'}{'lane'}}]} = {'description'=>'TEST'};
				#}

				
				if($config{'sites'}{'title'} && $h{$config{'sites'}{'title'}} ne ""){
					$sitedata{$key}{'name'} = $cols[$h{$config{'sites'}{'title'}}];
				}
				if($config{'sites'}{'description'} && $h{$config{'sites'}{'description'}} ne ""){
					$cols[$h{$config{'sites'}{'description'}}] =~ s/(^"|"$)//g;
					$sitedata{$key}{'description'} = $cols[$h{$config{'sites'}{'description'}}];
					$sitedata{$key}{'description'} =~ s/[\t\s]*$//g;
					# If we have a lane column we set its description
					
				}
				if($config{'sites'}{'lane'}){
					$lane = $cols[$h{$config{'sites'}{'lane'}}];
					if(!$sitedata{$key}{'lanes'}{$lane}){
						$sitedata{$key}{'lanes'}{$lane} = {};
					}
					if($config{'sites'}{'lanedesc'} && $h{$config{'sites'}{'lanedesc'}} ne ""){
						$cols[$h{$config{'sites'}{'lanedesc'}}] =~ s/(^"|"$)//g;
						$cols[$h{$config{'sites'}{'lanedesc'}}] =~ s/[\t\s]*$//g;
						$sitedata{$key}{'lanes'}{$lane}{'description'} = $cols[$h{$config{'sites'}{'lanedesc'}}];
					}
				}
				if($config{'sites'}{'orientation'} && $h{$config{'sites'}{'orientation'}} ne ""){
					$sitedata{$key}{'orientation'} = $cols[$h{$config{'sites'}{'orientation'}}];
				}
				if($config{'sites'}{'latitude'} && $h{$config{'sites'}{'latitude'}} ne ""){
					$sitedata{$key}{'lat'} = $cols[$h{$config{'sites'}{'latitude'}}];
				}
				if($config{'sites'}{'longitude'} && $h{$config{'sites'}{'longitude'}} ne ""){
					$sitedata{$key}{'lon'} = $cols[$h{$config{'sites'}{'longitude'}}];
				}
				if($config{'sites'}{'latitude'} eq "Northing" && $config{'sites'}{'longitude'} eq "Easting"){
					($lat,$lon) = grid_to_ll($sitedata{$key}{'lon'},$sitedata{$key}{'lat'});
					#print "Convert Easting and Northing for $key $sitedata{$key}{'lat'},$sitedata{$key}{'lon'} => $lat,$lon\n";
					$sitedata{$key}{'lat'} = sprintf("%0.5f",$lat);
					$sitedata{$key}{'lon'} = sprintf("%0.5f",$lon);
				}

				print "SITE: ".$key." - $sitedata{$key}{'name'}  $sitedata{$key}{'lat'},$sitedata{$key}{'lon'}\n";

			}
		}
	}

	my @output = ();
	foreach $key (sort(keys(%datafiles))){
		print "FILE $prefix - $key - $datafiles{$key} - $dir - $config{'yearly'}{'lane'}\n";
		push(@output,{'file'=>$datafiles{$key},'prefix'=>$prefix,'dir'=>$dir,'yearly'=>$config{'yearly'}});
	}
	return @output;

	foreach $key (sort(keys(%datafiles))){
		print "$prefix - $key - $datafiles{$key}\n";
		open(CSV,$datafiles{$key}{'file'});
		@lines = <CSV>;
		close(CSV);
		%h = ();
		for($i = 0; $i < @lines; $i++){
			$lines[$i] =~ s/[\n\r]//g;
		}
		(@header) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[0]);
		for($c = 0; $c < @header; $c++){ $h{$header[$c]} = $c; }
		for($i = 1; $i < @lines; $i++){
			(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[$i]);

			$id = "";
			if($config{'yearly'}{'id'} && $h{$config{'yearly'}{'id'}} ne ""){
				$id = $cols[$h{$config{'yearly'}{'id'}}];
				if($id){
					$id =~ s/^0{4,}//;
				}
			}

			if($id eq ""){
				print "WARNING on line $i of $file ($cols[$h{$config{'yearly'}{'id'}}])\n";
			}
			$sensor = "default";
			if($config{'yearly'}{'lane'}){
				$sensor = $dir."-".$prefix."-".$id."-".$cols[$h{$config{'yearly'}{'lane'}}];
			}
			$h1 = 0;
			$h2 = 0;
			$date = "";
			
			# Process the date column
			if($config{'yearly'}{'date'} && $h{$config{'yearly'}{'date'}} ne ""){
				$date = $cols[$h{$config{'yearly'}{'date'}}];
				# Tidy if it is a datetime stamp
				if($date =~ /([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9]{2}):([0-9]{2})/){
					$date =~ s/([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9]{2}):([0-9]{2})/$3-$2-$1T$4:$5Z/g;
					$h1 = $4 + ($5/60);
					$h2 = int($h1+1);
					$date =~ s/T[0-9]{2}:[0-9]{2}Z//;
				}
			}

			$period = 0;
			if(!$sensors{$sensor}){
				$sensors{$sensor} = {'values'=>{}};
			}


			# Process time if separate
			if($config{'yearly'}{'time'} && $h{$config{'yearly'}{'time'}} ne ""){
				$times = $cols[$h{$config{'yearly'}{'time'}}];
				if($times =~ /([0-9]{2}):([0-9]{2})\-([0-9]{2}):([0-9]{2})/){
					$t1 = $1.":".$2;
					$t2 = $3.":".$4;
					$h1 = $1 + ($2/60);
					$h2 = $3 + ($4/60);
					if($h1 == 23 && $h2 == 0){ $h2 = 24; }
					$period = ($h2-$h1)*60;
				}
			}else{
				if($config{'yearly'}{'period'} && $h{$config{'yearly'}{'period'}} ne ""){
					$period = $cols[$h{$config{'yearly'}{'period'}}];
				}
			}

#print "$sensor - $h{$config{'yearly'}{'date'}} - $date - $h1 - $h2\n";
			for($hh = $h1; $hh < $h2; $hh++){
				$datestamp = $date."T".sprintf("%02d",int($hh)).":".sprintf("%02d",int(($hh - int($hh))*60))."Z";
				$sensors{$sensor}{'values'}{$datestamp} = {'value'=>0,'period'=>$period};
				if($config{'yearly'}{'count'} && $h{$config{'yearly'}{'count'}} ne ""){
					$c = $cols[$h{$config{'yearly'}{'count'}}];
					if($period/60 > 1){
						$c = sprintf("%.1f",$c/($period/60));
						# Update period
						$sensors{$sensor}{'values'}{$datestamp}{'period'} = 60;
					}
					$sensors{$sensor}{'values'}{$datestamp}{'value'} = $c;
				}
			}

		}
	}

	return;
}

