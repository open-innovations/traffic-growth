#!/usr/bin/perl

use warnings;
use Geo::Coordinates::OSGB qw(ll_to_grid grid_to_ll);
use JSON::XS;
use Data::Dumper;
use utf8;
use Encode;
binmode STDOUT, 'utf8';
binmode STDERR, 'utf8';


my %colours = (
	'black'=>"\033[0;30m",
	'red'=>"\033[0;31m",
	'green'=>"\033[0;32m",
	'yellow'=>"\033[0;33m",
	'blue'=>"\033[0;34m",
	'magenta'=>"\033[0;35m",
	'cyan'=>"\033[0;36m",
	'white'=>"\033[0;37m",
	'none'=>"\033[0m"
);

%sensors = ();
%sitedata = ();
%sensorjson = ();
%sensorlane = ();

msg("<green>Open Innovations cycle traffic data processor<none>\n");


# Get all the data files

# Get the Leeds cycle growth package from Data Mill North
push(@rtn,getPackage("https://datamillnorth.org/api/action/package_show?id=leeds-annual-cycle-growth-",{'dir'=>'leeds','prefix'=>'cycle','sites'=>{'id'=>'Site ID','description'=>'Description','title'=>'Site Name','latitude'=>'Latitude','longitude'=>'Longitude'},'rename'=>{'City Connect : Sites→Site ID'=>'Site ID'},'yearly'=>{'id'=>'Cosit','date'=>'Sdate','lane'=>'LaneNumber','count'=>'Volume','period'=>'Period'}}));


# Get cycle counter data from York Open Data
push(@rtn,getPackage("https://data.yorkopendata.org/api/3/action/package_show?id=automatic-cycle-counters",{'dir'=>'york','prefix'=>'cycle','sites'=>{'id'=>'SiteNumber','lane'=>'CountID','description'=>'Road','lanedesc'=>'ChannelDirection','title'=>'RoadName','latitude'=>'Northing','longitude'=>'Easting'},'yearly'=>{'id'=>'SiteRefNumber','lane'=>'CounterID','date'=>'Date','time'=>'TimePeriod','count'=>'PedalCycles'}}));



# Process all the data files
msg("Processing data files\n");
for($f = 0; $f < @rtn ; $f++){
	$dir = $rtn[$f]{'dir'};
	$tmp = $rtn[$f]{'tmp'};
	$prefix = $rtn[$f]{'prefix'};
	msg("\t$rtn[$f]{'prefix'} - <blue>$rtn[$f]{'file'}<none>\n");
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
					warning("Line $i of $file ($cols[$h{$rtn[$f]{'yearly'}{'id'}}])\n");
				}
				$sensor = "default";
				if($rtn[$f]{'yearly'}{'lane'} && $h{$rtn[$f]{'yearly'}{'lane'}}>=0){
					$sensor = $dir."-".$prefix."-".$id."-".$cols[$h{$rtn[$f]{'yearly'}{'lane'}}];
				}else{
					msg("$sensor = $dir = $prefix = $id = $rtn[$f]{'yearly'}{'lane'} = $h{$rtn[$f]{'yearly'}{'lane'}}\n");
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
					$sensors{$sensor} = {'file'=>"$tmp$sensor.dat"};
					if(-e $sensors{$sensor}{'file'}){
						`rm $sensors{$sensor}{'file'}`;
					}
					`touch $sensors{$sensor}{'file'}`;
					# Open the file handle
					open($sensors{$sensor}{'fh'},">>",$sensors{$sensor}{'file'});
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
					msg("$sensor - $h{$rtn[$f]{'yearly'}{'date'}} - $date - $h1 - $h2\n");
				}
				if($period > 0 && $period ne "-"){
					for($hh = $h1; $hh < $h2; $hh++){
						$datestamp = $date."T".sprintf("%02d",int($hh)).":".sprintf("%02d",int(($hh - int($hh))*60))."Z";
						$p = $period;
						if($rtn[$f]{'yearly'}{'count'} && $h{$rtn[$f]{'yearly'}{'count'}} ne ""){
							$c = $cols[$h{$rtn[$f]{'yearly'}{'count'}}];
							# Replace "-" with "0"
							if($c eq "-"){
								$c = 0;
							}
							if($period/60 > 1){
								$c = sprintf("%.1f",$c/($period/60));
								# Update period
								$p = 60;
							}
						}
						$fh = $sensors{$sensor}{'fh'};
						print $fh "$datestamp\t$c\t$p\n";
					}
				}else{
					warning("\tPeriod is not a numeric value: \"$period\" in row $i of $rtn[$f]{'file'}\n");
				}
			}
		}
		$i++;
	}
	close(CSV);

}

# Close the filehandles
msg("Closing files\n");
foreach $sensor (sort(keys(%sensors))){
	close($sensors{$sensor}{'fh'});
}


# Save each sensor
msg("Saving each sensor\n");
foreach $sensor (sort(keys(%sensors))){
	($dir,$prefix,$id,$lane) = split(/\-/,$sensor);

	msg("\tReading $sensor from $sensors{$sensor}{'file'}\n");
	open(FILE,$sensors{$sensor}{'file'});
	@lines = <FILE>;
	close(FILE);

	%values = ();
	@datetimes = ();
	%dts = ();
	@dates = "";
	for($i = 0; $i < @lines ; $i++){
		($d,$v,$p) = split(/\t/,$lines[$i]);
		$values{$d} = {'value'=>$v,'period'=>$p};
		push(@datetimes,$d);
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
					print FILE ",".($values{$d}{'value'} && $values{$d}{'value'} gt 0 && $values{$d}{'period'} == 60 ? $values{$d}{'value'} : "");
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

	# Remove the temporary file
	`rm $sensors{$sensor}{'file'}`;

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
	local ($url,$tmp,$raw,$dir,$prefix,$str,$json,@resources,$n,$file,$y,@lines,@header,%h,@cols,$c,$i,$l,$sensor,$date,$id,$config,$key,$period,$lat,$lon,$times,$t1,$t2,$h1,$h2,@letters,%years,%datafiles);
	$url = shift;
	$config = shift;

	$dir = $config->{'dir'};
	$raw = $dir."/raw/";
	$tmp = $dir."/tmp/";
	$prefix = $config->{'prefix'};

	# Make the directory if it doesn't exist
	if(!-d $dir){ `mkdir $dir`; }
	if(!-d $raw){ `mkdir $raw`; }
	if(!-d $tmp){ `mkdir $tmp`; }


	$str = "";
	$file = $dir."/raw/$prefix-data.json";
	msg("Getting <cyan>$url<none> to <blue>$file<none>\n");
	`wget -q --no-check-certificate -O $file "$url"`;

	open(FILE,$file);
	@lines = <FILE>;
	close(FILE);
	$str = join("\n",@lines);
	# Remove the metadata file
	`rm $file`;

	$json = JSON::XS->new->utf8->decode($str);
	@resources = @{$json->{'resources'}};

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
				msg("\tGetting <blue>$dir<none> > $prefix > $y".($resources[$i]{'size'} ? " (".$resources[$i]{'size'}." bytes)":"(unknown size)")."\n");
				`wget -q --no-check-certificate -O $file "$resources[$i]{'url'}"`;
			}
		}elsif($resources[$i]{'name'} =~ /Locations|Site Reference/i){
			$file = $dir."/raw/$prefix".($prefix ? "-" : "")."locations.csv";
			if(!-e $file){
				msg("\tGetting <blue>$dir<none> > $prefix > $resources[$i]{'name'}\n");
				`wget -q --no-check-certificate -O $file "$resources[$i]{'url'}"`;
			}
			
			@features = getCSV($file,{'rename'=>$config->{'rename'}});
			
			for($l = 0; $l < @features; $l++){

				$features[$l]{$config->{'sites'}{'title'}} =~ s/^LEEDS_//g;
				$features[$l]{$config->{'sites'}{'id'}} =~ s/^0+//g;

				$key = $dir."-".$prefix."-".($features[$l]{$config->{'sites'}{'id'}}||"?");
				
				# If we haven't created this site we create it now
				if(!$sitedata{$key}){
					$sitedata{$key} = {'name'=>'','title'=>'','orientation'=>'','latitude'=>'null','longitude'=>'null','lanes'=>{}};
				}

				#if($config->{'sites'}{'lane'}){
				#	#$sitedata{'lanes'}{$cols[$h{$config->{'sites'}{'lane'}}]} = {'description'=>'TEST'};
				#}

				
				if($config->{'sites'}{'title'} && $features[$l]{$config->{'sites'}{'title'}} ne ""){
					$sitedata{$key}{'name'} = $features[$l]{$config->{'sites'}{'title'}};
				}
				if($config->{'sites'}{'description'} && $features[$l]{$config->{'sites'}{'description'}} ne ""){
					$features[$l]{$config->{'sites'}{'description'}} =~ s/(^"|"$)//g;
					$sitedata{$key}{'description'} = $features[$l]{$config->{'sites'}{'description'}};
					$sitedata{$key}{'description'} =~ s/[\t\s]*$//g;
					# If we have a lane column we set its description
					
				}
				if($config->{'sites'}{'lane'}){
					$lane = $features[$l]{$config->{'sites'}{'lane'}};
					if(!$sitedata{$key}{'lanes'}{$lane}){
						$sitedata{$key}{'lanes'}{$lane} = {};
					}
					if($config->{'sites'}{'lanedesc'} && $features[$l]{$config->{'sites'}{'lanedesc'}} ne ""){
						$features[$l]{$config->{'sites'}{'lanedesc'}} =~ s/(^"|"$)//g;
						$features[$l]{$config->{'sites'}{'lanedesc'}} =~ s/[\t\s]*$//g;
						$sitedata{$key}{'lanes'}{$lane}{'description'} = $features[$l]{$config->{'sites'}{'lanedesc'}};
					}
				}
				if($config->{'sites'}{'orientation'} && $features[$l]{$config->{'sites'}{'orientation'}} ne ""){
					$sitedata{$key}{'orientation'} = $features[$l]{$config->{'sites'}{'orientation'}};
				}
				if($config->{'sites'}{'latitude'} && $features[$l]{$config->{'sites'}{'latitude'}} ne ""){
					$sitedata{$key}{'lat'} = $features[$l]{$config->{'sites'}{'latitude'}};
				}
				if($config->{'sites'}{'longitude'} && $features[$l]{$config->{'sites'}{'longitude'}} ne ""){
					$sitedata{$key}{'lon'} = $features[$l]{$config->{'sites'}{'longitude'}};
				}
				if($config->{'sites'}{'latitude'} eq "Northing" && $config->{'sites'}{'longitude'} eq "Easting"){
					($lat,$lon) = grid_to_ll($sitedata{$key}{'lon'},$sitedata{$key}{'lat'});
					#print "Convert Easting and Northing for $key $sitedata{$key}{'lat'},$sitedata{$key}{'lon'} => $lat,$lon\n";
					$sitedata{$key}{'lat'} = sprintf("%0.5f",$lat);
					$sitedata{$key}{'lon'} = sprintf("%0.5f",$lon);
				}

				msg("\tSITE: ".$key." - $sitedata{$key}{'name'}  $sitedata{$key}{'lat'},$sitedata{$key}{'lon'}\n");

			}
		}
	}

	my @output = ();
	foreach $key (sort(keys(%datafiles))){
		msg("\tFILE $prefix - $key - <blue>$datafiles{$key}<none> - $dir - $config->{'yearly'}{'lane'}\n");
		push(@output,{'file'=>$datafiles{$key},'prefix'=>$prefix,'dir'=>$dir,'raw'=>$raw,'tmp'=>$tmp,'yearly'=>$config->{'yearly'}});
	}
	return @output;

}

sub getCSV {
	my $file = shift;
	my $opt = shift;
	my (@lines,$str,@rows,$r,@cols,@header,$c,$key,$data,$needed,$f,@features,@required);
	
	open(FILE,"<:utf8",$file);
	@lines = <FILE>;
	close(FILE);
	$str = join("",@lines);
	@rows = split(/\r\n/,$str);
	if(!$opt->{'startrow'}){
		# Try to work out the starting row
		for($r = 0; $r < @rows; $r++){
			if($rows[$r] =~ /^\,+/){
				$opt->{'startrow'} = $r+2;
				msg("\tData starts on row $opt->{'startrow'}\n");
				last;
			}
		}
	}
	if(!defined $opt->{'startrow'}){
		$opt->{'startrow'} = 2;
	}

	for($r = 0; $r < @rows; $r++){
		$rows[$r] =~ s/[\n\r]//g;
		@cols = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$rows[$r]);
		if($r < $opt->{'startrow'}-1){
			# Header
			if(!@header){
				@header = @cols;
			}else{
				for($c = 0; $c < @cols; $c++){
					if($cols[$c]){
						$header[$c] .= ($header[$c] ? "→" : "").$cols[$c];
					}
				}
			}
		}else{
			if($r == $opt->{'startrow'}-1){
				# Process header line - rename columns based on the defined keys
				for($c = 0; $c < @cols; $c++){
					$key = $header[$c];
					foreach $k (keys(%{$opt->{'rename'}})){
						if($k eq $key){
							$header[$c] = $opt->{'rename'}{$k};
							last;
						}
					}
				}
				if($opt->{'required'}){
					@required = @{$opt->{'required'}};
				}else{
					
				}
			}
			$data = {'_source'=>$file};
			for($c = 0; $c < @cols; $c++){
				$cols[$c] =~ s/(^\"|\"$)//g;
				$needed = 1;
				if($opt->{'required'}){
					$needed = 0;
					for($f = 0; $f < @{$opt->{'required'}}; $f++){
						if($header[$c] eq $opt->{'required'}[$f]){ $needed = 1; }
					}
				}
				if($needed){ $data->{$header[$c]} = $cols[$c]; }
			}
			push(@features,$data);
		}
	}
	return @features;
}


sub msg {
	my $str = $_[0];
	my $dest = $_[1]||STDOUT;
	foreach my $c (keys(%colours)){ $str =~ s/\< ?$c ?\>/$colours{$c}/g; }
	print $dest $str;
}

sub error {
	my $str = $_[0];
	$str =~ s/(^[\t\s]*)/$1<red>ERROR:<none> /;
	foreach my $c (keys(%colours)){ $str =~ s/\< ?$c ?\>/$colours{$c}/g; }
	msg($str,STDERR);
}

sub warning {
	my $str = $_[0];
	$str =~ s/(^[\t\s]*)/$1$colours{'yellow'}WARNING:$colours{'none'} /;
	foreach my $c (keys(%colours)){ $str =~ s/\< ?$c ?\>/$colours{$c}/g; }
	print STDERR $str;
}
