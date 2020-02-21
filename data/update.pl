#!/usr/bin/perl

use warnings;
use JSON::XS;
use utf8;



%sensors = ();
%sensordata = ();
%sensorjson = ();
%sensorlane = ();



# Get the Leeds cycle growth package from Data Mill North
getDataMillNorthPackage("https://datamillnorth.org/api/action/package_show?id=leeds-annual-cycle-growth-","leeds","cycle");
# Get traffic 
#getDataMillNorthPackage("https://datamillnorth.org/api/action/package_show?id=leeds-annual-traffic-growth","leeds","traffic");

foreach $sensor (sort(keys(%sensors))){
	($dir,$prefix,$cosit,$lane) = split(/\-/,$sensor);
	
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
	$file = $dir."/".$prefix."-".$cosit."-".$lane.".csv";
	open(FILE,">:utf8",$file);
	print FILE "Date";
	@units = "";
	if($sensors{$sensor}{'period'} eq 60){
		for($i = 0; $i < 24; $i++){ push(@units,sprintf("%02d:00",$i)); }
	}

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
					print FILE ",".($sensors{$sensor}{'values'}{$d} && $sensors{$sensor}{'values'}{$d} gt 0 ? $sensors{$sensor}{'values'}{$d} : "");
				}
			}
			print FILE "\n";
		}
	}
	close(FILE);

	$s = $dir."-".$prefix."-".$cosit;
	if(!$sensorlane{$s}){ $sensorlane{$s} = ""; }
	if(!$sensorjson{$s}){
		$index = "";
		$index .= "\t\"$s\": {";
		$index .= "\"start\":\"$datetimes[0]\"";
		$index .= ",\"c\":[".($sensordata{$s}{'lat'}||"null").",".($sensordata{$s}{'lon'}||"null")."]";
		$index .= ",\"name\":\"".($sensordata{$s}{'name'}||"")."\"";
		$index .= ",\"desc\":\"".($sensordata{$s}{'description'}||"")."\"";
		$index .= ",\"orientation\":\"".($sensordata{$s}{'orientation'}||"")."\"";
		$sensorjson{$s} = $index;
	}
	if($sensorlane{$s}){ $sensorlane{$s} .= ","; }
	$sensorlane{$s} .= "\"$lane\":{\"start\":\"$datetimes[0]\",\"period\":$sensors{$sensor}{'period'},\"b\":".(-s $file)."}";

}

open(FILE,">:utf8","index.json");
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

sub getDataMillNorthPackage {
	local ($url,$dir,$prefix,$str,$json,@resources,$n,$file,$y,@years,@lines,@header,%h,@cols,$c,$i,$l,$sensor,$date,$cosit);
	$url = $_[0];
	$dir = $_[1];
	$prefix = $_[2];
	$str = join("\n",`wget -q --no-check-certificate -O- "$url"`);
	$json = JSON::XS->new->utf8->decode($str);
	@resources = @{$json->{'result'}->{'resources'}};
	$n = @resources;
	@years = ();

	# Make the directory if it doesn't exist
	if(!-d $dir){ `mkdir $dir`; }
	if(!-d $dir."/raw/"){ `mkdir $dir/raw/`; }

	for($i = 0; $i < $n; $i++){
		$resources[$i]{'name'} =~ s/\s+$//g;
		if($resources[$i]{'name'} =~ /^[0-9]+$/){
			push(@years,$resources[$i]{'name'});
			$file = $dir."/raw/$prefix".($prefix ? "-" : "").$resources[$i]{'name'}.".csv";
			if(!-e $file){
				print "Getting $dir > $prefix > $resources[$i]{'name'}\n";
				`wget -q --no-check-certificate -O $file "$resources[$i]{'url'}"`;
			}
		}elsif($resources[$i]{'name'} =~ /Locations/i){
			$file = $dir."/raw/$prefix".($prefix ? "-" : "")."locations.csv";
			if(!-e $file){
				print "Getting $dir > $prefix > $resources[$i]{'name'}\n";
				`wget -q --no-check-certificate -O $file "$resources[$i]{'url'}"`;
			}
			open(FILE,$file);
			@lines = <FILE>;
			close(FILE);
			%h = ();
			$lines[0] =~ s/[\n\r]//g;
			(@header) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[0]); #Site ID,Site Name,Description,Orientation,Grid,Latitude,Longitude
			for($c = 0; $c < @header; $c++){ $h{$header[$c]} = $c; }
			for($l = 1; $l < @lines; $l++){
				$lines[$l] =~ s/[\n\r]//g;
				(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[$l]);
				$cols[$h{'Site Name'}] =~ s/^LEEDS_//g;
				$cols[$h{'Site ID'}] =~ s/^0+//g;
				$cols[$h{'Description'}] =~ s/(^"|"$)//g;
				$sensordata{$dir."-".$prefix."-".$cols[$h{'Site ID'}]} = {'name'=>($cols[$h{'Site Name'}]||""),'description'=>($cols[$h{'Description'}]||""),'orientation'=>($cols[$h{'Orientation'}]||""),'lat'=>($h{'Latitude'} ? $cols[$h{'Latitude'}]:"null"),'lon'=>($h{'Longitude'} ? $cols[$h{'Longitude'}]:"null")};
			}
		}
	}
	@years = sort(@years);

	for($y = 0; $y < @years; $y++){
		print "$prefix - $years[$y]\n";
		$file = $dir."/raw/$prefix".($prefix ? "-" : "")."$years[$y].csv";
		open(CSV,$file);
		@lines = <CSV>;
		close(CSV);
		%h = ();
		(@header) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[0]);
		for($c = 0; $c < @header; $c++){ $h{$header[$c]} = $c; }
		for($i = 1; $i < @lines; $i++){
			(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[$i]);
			$date = $cols[$h{'Sdate'}];
			$date =~ s/([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9]{2}):([0-9]{2})/$3-$2-$1T$4:$5Z/g;
			$cosit = $cols[$h{'Cosit'}];
			$cosit =~ s/^0+//g;
			$sensor = $dir."-".$prefix."-".$cosit."-".$cols[$h{'LaneNumber'}];
			if(!$sensors{$sensor}){ $sensors{$sensor} = {'values'=>{},'period'=>$cols[$h{'Period'}]}; }
			$sensors{$sensor}{'values'}{$date} = $cols[$h{'Volume'}];
			if($cols[$h{'Period'}] ne $sensors{$sensor}{'period'}){
				print "The period has changed for $sensor\n";
			}
		}
	}

	return;
}

