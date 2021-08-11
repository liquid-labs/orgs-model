#!/usr/bin/env bash

# bash strict settings
set -o errexit # exit on errors
set -o nounset # exit on use of uninitialized variable
set -o pipefail

SHOW_DROPPED=0 # default; Perl false

if [[ $(uname) == 'Darwin' ]]; then
  GNU_GETOPT="$(brew --prefix gnu-getopt)/bin/getopt"
else
  GNU_GETOPT="$(which getopt)"
fi

TMP=$(${GNU_GETOPT} -o "s:D" -l "settings: show-dropped" -- "$@")
eval set -- "$TMP"
while [[ $1 != '--' ]]; do
  case "$1" in
    -s|--settings)
      if ! [[ -f "$2" ]]; then
        echo "Could not find settings file: $2" >&2
        exit 1
      fi
      VARS="${VARS:-} $(cat $2 | sed -Ee "s/^([^']*)#.*/\\1/" -e "s/('[^']') *#.*/\\1/" | tr '\n' ' ')"
      shift;;
    -D|--show-dropped)
      SHOW_DROPPED=1;;
  esac
  shift
done
shift
VARS="${VARS:1}"

INPUT="${1}"
OUTPUT="${2}"
mkdir -p "$(dirname "${OUTPUT}")"

env -i -S "$VARS" perl -e '
use strict; use warnings;

my $input_file = shift;
my $output_file = shift;

my %constants = (
  "SEC_TRIVIAL" => 1,
  "SEC_MODERATE" => 2,
  "SEC_HARDENED" => 3,
  "ALWAYS" => 1,
  "NEVER" => 0,
  "IS_SUBMIT_AUDIT" => 0,
  "IS_PR_AUDIT" => 0,
);

open my $out, ">", "$output_file" or die "Could not open \"$output_file\" ($!)";

sub process_line {
  my $line = shift;
  my $lineno = shift;

  my ($uuid, $subSection, $statement, $absCondition, $indCondition, $auditCondition, $refs) =
    split(/\t/, "$line") or die "Could not split record at line ${lineno}.";

  if (!$uuid) { die "No UUID found for record at line ${lineno}."; }
  if (!$absCondition) { die "No absolute condition found for record $uuid at line ${lineno}."; }
  my @conditions = split(/\s*,\s*/, $absCondition);
  my $include = 1;

  while (@conditions && $include) {

    my $condition = shift @conditions;
    while (my ($k, $v) = each %ENV) {
      $condition =~ s/(^|[^A-Z_])$k([^A-Z_]|$)/$1$v$2/g;
    }
    while (my ($k, $v) = each %constants) {
      $condition =~ s/(^|[^A-Z_])$k([^A-Z_]|$)/$1$v$2/g;
    }

    $condition =~ /^[0-9<>=|&! ]+$/ or die "Invalid condition at line ${lineno}: $condition\nref: $uuid\nfile: $input_file";

    eval "$condition" or $include = 0;
  }

  if ($include) {
    print $out "$line\n";
  }
  elsif ('$SHOW_DROPPED') {
    print STDERR "DROPPED: $uuid\n";
  }
}

sub process_file {
  my $file_name = shift;

  open my $in, "<", "$file_name" or die "Could not open \"$file_name\" ($!)";

  while (<$in>) {
    my $line="$_";
    my $lineno = $.;

    if ($lineno == 1) { next; } # eat the header

    chomp $line;

    if ($line =~ /^#\s*include\s+([^\r]+)/) {
      my $include_file = "${1}.tsv";

      # TODO: we are doing this work twice; here and in liq-gen-make
			my @res = `find -L ./node_modules/\@liquid-labs/ -path "*/policy-*/*" -path "*/$include_file" -not -path "*@*@*"`;
			if (scalar(@res) > 1) { die "Ambiguous include $1 in $file_name for standards filter."; }
			if (scalar(@res) == 0) { die "Did not find include $1 in $file_name for standards filter."; }
			chomp($res[0]);
			$include_file = $res[0];
      # print "Processing include: ${include_file}\n";
      process_file($include_file) or die "Failed while processing include at $lineno.\n";
    }
    elsif ($line !~ /^(#.*|\s*)$/) { # else skip blanks and comments
      process_line $line, $lineno;
    }
  }

  close $in;
}

process_file $input_file;
close $out;
' "${INPUT}" "${OUTPUT}"
