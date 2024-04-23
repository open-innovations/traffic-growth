#!/usr/bin/perl

use utf8;
use warnings;
use strict;
use Data::Dumper;
use Encode;
binmode STDOUT, 'utf8';
binmode STDERR, 'utf8';
use Cwd qw(abs_path);
my ($basedir, $path);
BEGIN {
	# Get the real base directory for this script
	($basedir, $path) = abs_path($0) =~ m{(.*/)?([^/]+)$};
}
use lib $basedir;	# Custom functions
require "lib.pl";

my ($package,$datadir,$index,$id,$url,$file,$pid,$data,%months,$desc,@dates,$hh,@hours,$fh,$id2,$i,$ifile,$tfile);

$datadir = $basedir."leeds/";
$pid = "2rlld";
$url = "https://datamillnorth.org/api/dataset/".$pid;
$ifile = $basedir."index-footfall.json";


%months = ('Jan'=>'01','Feb'=>'02','Mar'=>'03','Apr'=>'04','May'=>'05','Jun'=>'06','Jul'=>'07','Aug'=>'08','Sep'=>'09','Oct'=>'10','Nov'=>'11','Dec'=>12);
$data = {};
$index = LoadJSON($ifile);
$tfile = $basedir.$pid.".json";


if(-e $tfile){
	$package = LoadJSON($tfile);
}else{
	$package = ParseJSON(GetDataFromURL($url));
}
$package->{'created'} = substr($package->{'createdAt'},0,10);

for($hh = 0; $hh < 24; $hh++){
	push(@hours,sprintf("%02d:00",$hh));
}


# Need to get all the CSV files
$i = 0;
foreach $id (sort(keys(%{$package->{'resources'}}))){
	if(exists($package->{'resources'}{$id}) && exists($package->{'resources'}{$id}{'format'}) && $package->{'resources'}{$id}{'format'} eq "csv"){
		$file = $datadir."raw/$pid-$id.csv";
		if(!-e $file || -s $file != $package->{'resources'}{$id}{'size'}){
			# Remove any existing file if it isn't the correct size
			if(-s $file > 0){
				`rm $file`;
			}
			GetFileFromURL($package->{'resources'}{$id}{'url'},$file);
		}
		$package->{'resources'}{$id}{'file'} = $file;
		
		addFromCSV($file,$data);
		$i++;
	}else{
		warning("Bad id: $id\n");
	}
}

my ($csv,$date,$v,$vorig,$updated);
foreach $id (sort(keys(%{$index}))){
	
	# Open existing CSV - we are going to update any rows that we have
	
	msg("<yellow>$id<none>: $index->{$id}{'name'} / $index->{$id}{'desc'}\n");
	$desc = $index->{$id}{'desc'};
	if(!exists($data->{$desc})){
		warning("No data for counter <yellow>$index->{$id}{'desc'}<none>\n");
	}else{
		if($id =~ /leeds-(.*)/){
			$id2 = $1;
			$file = $datadir.$id2."-1.csv";
			
			# Open any existing CSV data;
			$csv = LoadCSV($file,{'key'=>'Date'});

			@dates = sort(keys(%{$data->{$desc}{'days'}}));
			for($i = 0; $i < @dates;$i++){
				if(!exists($csv->{$dates[$i]})){
					$csv->{$dates[$i]} = {};
				}
				$updated = 0;
				for($hh = 0; $hh < @hours; $hh++){
					$v = ($data->{$desc}{'days'}{$dates[$i]}{$hours[$hh]}||0)+0;
					$vorig = $csv->{$dates[$i]}{$hours[$hh]}+0;
					if($v != $vorig){
						$updated++;
						$csv->{$dates[$i]}{$hours[$hh]} = $v;
					}
				}
				if($updated > 0){
					msg("\tUpdating <green>$dates[$i]<none>\n");
				}
			}
			
			$index->{$id}{'start'} = $data->{$desc}{'first'};
			$index->{$id}{'lanes'}{'1'}{'start'} = $data->{$desc}{'first'};
			$index->{$id}{'end'} = $data->{$desc}{'last'};
			$index->{$id}{'lanes'}{'1'}{'end'} = $data->{$desc}{'last'};


			msg("Save to <cyan>$file<none>\n");
			open($fh,">",$file);
			print $fh "Date";
			for($hh = 0; $hh < @hours; $hh++){
				print $fh ",".$hours[$hh];
			}
			print $fh "\n";
			
			foreach $date (sort(keys(%{$csv}))){
				print $fh "$date";
				for($hh = 0; $hh < @hours; $hh++){
					print $fh ",".($csv->{$date}{$hours[$hh]}||0);
				}
				print $fh "\n";
			}

			close($fh);

		}
	}
}

open($fh,">",$ifile);
print $fh tidyJSON($index,1);
close($fh);





#########################

sub getDate {
	my $row = shift;
	my $day = "";
	if(defined($row->{'Date'})){ $day = $row->{'Date'}; }
	if($day){
		if($day !~ /[0-9]{4}-[0-9]{2}-[0-9]{2}/){
			if($day =~ /([0-9]{2})[-\/\s]([A-Za-z]{3})[-\/\s]([0-9]{2})/){
				$day = "20".$3."-".$months{$2}."-".$1;
			}elsif($day =~ /([0-9]{2})\/([0-9]{2})\/([0-9]{4})/){
				$day = $3."-".$2."-".$1;
			}
		}
		if($day !~ /[0-9]{4}-[0-9]{2}-[0-9]{2}/){
			print "Bad day: $day\n";
			exit;
		}
	}else{
		print "Bad date:\n";
		print Dumper $row;
		return $day;
	}
	return $day;
}

sub getCount {
	my $row = shift;
	if(defined($row->{'Count'})){ return $row->{'Count'}+0; }
	if(defined($row->{'ReportCount'})){ return $row->{'ReportCount'}+0; }
	if(defined($row->{'InCount'})){ return $row->{'InCount'}+0; }
	
	return "";	
}

sub getName {
	my $row = shift;
	if(defined($row->{'LocationName'})){ return $row->{'LocationName'}; }
	if(defined($row->{'Location'})){ return $row->{'Location'}; }
	return "";
}

sub getHour {
	my $row = shift;
	my $h = $row->{'Hour'};
	if(!defined($h) || $h eq ""){ return undef; }
	if(defined($h) && $h ne "" && $h !~ /:/){
		$h = sprintf("%02d:00",$h);
	}
	return $h;
}

sub addFromCSV {
	my $file = shift;
	my $data = shift;
	my ($r,$name,$day,$hour,$count,$hh);
	my @csvlines = LoadCSV($file);
	for($r = 0; $r < @csvlines; $r++){
		$name = getName($csvlines[$r]);
		if($name){
			if(!$data->{$name}){ $data->{$name} = {'days'=>{},'first'=>'9999-01-01','last'=>'0000-01-01'}; }

			$day = getDate($csvlines[$r]);
			$hour = getHour($csvlines[$r]);
			$count = getCount($csvlines[$r]);

			if(!$day){
				print "Bad date in $file (line $r)\n";
				print Dumper $csvlines[$r];
				exit;
			}
			if(!defined($count)){
				print "Bad count in $file (line $r)\n";
				print Dumper $csvlines[$r];
				exit;			
			}
			if(!defined($name)){
				print "Bad name in $file (line $r)\n";
				print Dumper $csvlines[$r];
				exit;
			}


			if(!$data->{$name}{'days'}{$day}){
				$data->{$name}{'days'}{$day} = {};
			}

			if(defined($hour)){
				$data->{$name}{'days'}{$day}{$hour} = $count;
			}else{
				# We will assume this is a daily figure
				warning("Spread <green>$count<none> across all hours for <green>$day<none>\n");
				$count = round($count/24);
				for($hh = 0; $hh < @hours; $hh++){
					$data->{$name}{'days'}{$day}{$hours[$hh]} = $count;
				}
			}
			if($day lt $data->{$name}{'first'}){ $data->{$name}{'first'} = $day; }
			if($day gt $data->{$name}{'last'}){ $data->{$name}{'last'} = $day; }
		}else{
			warning("No name for row <yellow>$r<none> in <cyan>$file<none>\n");
		}
	}
	return;
}
