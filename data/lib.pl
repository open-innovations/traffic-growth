#!/usr/bin/perl

use utf8;
use warnings;
use strict;
use JSON::XS;

################
# Subroutines

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

sub msg {
	my $str = $_[0];
	my $dest = $_[1]||"STDOUT";
	foreach my $c (keys(%colours)){ $str =~ s/\< ?$c ?\>/$colours{$c}/g; }
	if($dest eq "STDERR"){
		print STDERR $str;
	}else{
		print STDOUT $str;
	}
}

sub error {
	my $str = $_[0];
	$str =~ s/(^[\t\s]*)/$1<red>ERROR:<none> /;
	msg($str,"STDERR");
}

sub warning {
	my $str = $_[0];
	$str =~ s/(^[\t\s]*)/$1$colours{'yellow'}WARNING:$colours{'none'} /;
	msg($str,"STDERR");
}

sub GetDataFromURL {
	my $url = shift;
	my $attr = shift||{};
	my ($args,$h,$str);
	$args = "";
	if($attr->{'headers'}){
		foreach $h (keys(%{$attr->{'headers'}})){
			$args .= ($args ? " " : "")."-H \"$h: $attr->{'headers'}{$h}\"";
		}
	}
	if($attr->{'method'}){
		$args .= " -X $attr->{'method'}"
	}
	if($attr->{'form'}){
		$args .= " --data-raw \'$attr->{'form'}\'";
	}
	$str = `curl -s --insecure -L $args --compressed "$url"`;
	return $str;
}

sub GetFileFromURL {
	my $url = shift;
	my $file = shift;
	my $attr = shift||{};
	my ($age,$now,$epoch_timestamp,$args,$h);

	msg("\tGet URL: <green>$url<none>\n");

	$age = 100000;
	if(-e $file){
		$epoch_timestamp = (stat($file))[9];
		$now = time;
		$age = ($now-$epoch_timestamp);
	}

	if($age >= 86400 || -s $file == 0){
		$args = "";
		if($attr->{'headers'}){
			foreach $h (keys(%{$attr->{'headers'}})){
				$args .= ($args ? " " : "")."-H \"$h: $attr->{'headers'}{$h}\"";
			}
		}
		if($attr->{'method'}){
			$args .= " -X $attr->{'method'}"
		}
		if($attr->{'form'}){
			$args .= " --data-raw \'$attr->{'form'}\'";
		}
		`curl -s --insecure -L $args --compressed -o $file "$url"`;
		msg("\tSaved to <cyan>$file<none>\n");
	}
	return $file;
}

sub LoadCSV {
	# version 1.3
	my $file = shift;
	my $config = shift;

	my (@lines,$str,@rows,@cols,@header,$r,$c,@features,$data,$key,$k,$f,$n,$n2,$n3,$compact,$sline,$col,$break,$added);
	$compact = $config->{'compact'};
	$sline = $config->{'startrow'}||0;
	$col = $config->{'key'};

	msg("Processing CSV from <cyan>$file<none>\n");
	open(FILE,"<:utf8",$file);
	@lines = <FILE>;
	close(FILE);
	$str = join("",@lines);

	$n = () = $str =~ /\r\n/g;
	$n2 = () = $str =~ /\n/g;
	$n3 = () = $str =~ /\r/g;

	if($n < $n2 * 0.25 || $n < $n3 * 0.25){ 
		# Replace CR LF with escaped newline
		$str =~ s/\r\n/\\n/g;
	}
	$break = "[\n]";
	if($n3 > 2*$n2){
		$break = "[\r]";
	}
	@rows = split(/$break/,$str);

	$n = @rows;
	
	for($r = $sline; $r < @rows; $r++){
		$rows[$r] =~ s/[\n\r]//g;
		@cols = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$rows[$r]);

		if($r < $sline+1){
			# Header
			if(!@header){
				for($c = 0; $c < @cols; $c++){
					$cols[$c] =~ s/(^\"|\"$)//g;
				}
				@header = @cols;
			}else{
				for($c = 0; $c < @cols; $c++){
					$header[$c] .= "\n".$cols[$c];
				}
			}
		}else{
			$data = {};
			$added = 0;
			for($c = 0; $c < @cols; $c++){
				$cols[$c] =~ s/(^\"|\"$)//g;
				if($header[$c]){
					if(defined($cols[$c])){
						$data->{$header[$c]} = $cols[$c];
						$added++;
					}
				}
			}
			if($added > 0){
				push(@features,$data);
			}
		}
	}
	if($col){
		$data = {};
		for($r = 0; $r < @features; $r++){
			$f = $features[$r]->{$col};
			if($compact){ $f =~ s/ //g; }
			$data->{$f} = $features[$r];
		}
		return $data;
	}else{
		return @features;
	}
}

sub LoadJSON {
	my (@files,$str,@lines);
	my $file = $_[0];
	open(FILE,"<:utf8",$file);
	@lines = <FILE>;
	close(FILE);
	$str = (join("",@lines));
	return ParseJSON($str);
}

sub ParseJSON {
	my $str = shift;
	# Error check for JS variable e.g. South Tyneside https://maps.southtyneside.gov.uk/warm_spaces/assets/data/wsst_council_spaces.geojson.js
	$str =~ s/[^\{]*var [^\{]+ = //g;
	if(!$str){ $str = "{}"; }
	return JSON::XS->new->decode($str);
}

sub round {
	my $v = shift;
	return int($v+0.5);
}



sub makeDir {
	my $str = $_[0];
	my @bits = split(/\//,$str);
	my $tdir = "";
	my $i;
	for($i = 0; $i < @bits; $i++){
		$tdir .= $bits[$i]."/";
		if(!-d $tdir){
			`mkdir $tdir`;
		}
	}
}

sub tidyJSON {
	my $json = shift;
	my $depth = shift||0;
	my $oneline = shift;
	my $d = $depth+1;

	my $txt = JSON::XS->new->canonical(1)->pretty->space_before(0)->encode($json);
	$txt =~ s/   /\t/g;
	$txt =~ s/([\{\,\"])\n\t{$d,}([\"\}])/$1 $2/g;
	$txt =~ s/"\n\t{$depth,}\}/\" \}/g;
	$txt =~ s/null\n\t{$depth,}\}/null \}/g;

	$txt =~ s/\n\t{$d,}//g;
	if($oneline){
		$txt =~ s/\n[\t\s]*//g;
	}

	return $txt;
}
1;