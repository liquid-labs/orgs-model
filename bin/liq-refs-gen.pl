#!/usr/bin/env perl

# Called from the generated main.makefile to create a map from an absolute gucci/godoc
# '.devices.standards.SOME_STANDARD' style reference to a relative URL reference.

# TODO: revpam process. The current implementation does not handle files in the working project (such as when processing a policy module as part of development testing) nor does it recognize built files. Rather than process each policy found under 'node_modules', we should instead built a combined file map that *starts* with the existing files (to handle both dev cycle and to include built files, such as Company Roles Reference), and then merges that map with the policy directories. Then we have a single map of everything and we process that map for each relative mapping.

use strict; use warnings;
use experimental 'smartmatch';

my $out = shift;
my %proj_map = do $ARGV[0]; shift;
my $my_package = shift;
my $base_rel_path = shift;
my @paths = @ARGV;

my $refs = { "dirs" => {}, "files" => [] };

# $base_rel_path   @target_path_bits
# 'foo/bar'        ['bar','baz'] /* bar/baz */ -> ['..', '..']
# 'foo/bar'        ['foo','baz'] /* foo/baz */ -> ['..']
sub rel_path_to {
  my $base_rel_path = shift;
  my @target_path_bits = @{$_[0]};

  my @adjustment;
  my $index = 0;
  my @rel_bits = split(/\//, $base_rel_path);

  for (@target_path_bits) {
    if ($index > $#rel_bits) {
      # This happens when the target path is longer than the base path, but they otherwise match. So, the relative path
      # from base to target is the unmatched part (remainder) of the target path.
      @adjustment = @target_path_bits[$index...$#target_path_bits];
      last;
    }
    elsif ($_ ne $rel_bits[$index]) {
      # This happens when we hit a non-matching path element. We back up the remaining number of unmatched elements in
      # the base path and then append the remaining unmatched elements in the target path.
      @adjustment = ("..") x (scalar(@rel_bits) - $index);
      push(@adjustment, @target_path_bits[$index...$#target_path_bits]);
      last;
    }
    else {
      # This happens when the path element in the base and target path match. No adjustment is necessary, so we just
      # bump the index and check the next element.
      $index += 1;
    }
  }
  if (!@adjustment) {
    # This can happen when the target path is shorter than the base path, but they otherwise match. In that case, we
    # just need to back up to the target path.
    my $backup = scalar(@rel_bits) - $index;
    if ($backup == 0) {
      @adjustment = ('.');
    }
    else {
      @adjustment = ('..') x $backup;
    }
  }

  return @adjustment;
}

foreach my $path (@paths) {
  my $is_my_package = $path =~ m|/$my_package/|;
  my @bits = split /\//, $path;
  my $tracker = $refs;
  my $path_pivot = 0;
  for (@bits) {
    if (/^@/) {
      $bits[$path_pivot] =~ s/^@//;
      last;
    }
    $path_pivot += 1;
  }
  my $package = join('/', @bits[$path_pivot...$path_pivot + 1]);
  $path_pivot += 3;

  foreach my $bit (@bits[$path_pivot...$#bits]) {
    exists $tracker->{"dirs"}->{$bit} or $tracker->{"dirs"}->{$bit} = { "dirs" => {}, "files" => [] };
    $tracker = $tracker->{"dirs"}->{$bit};
  }

  my @target_bits = @bits[$path_pivot...$#bits];
  my @adjustment = rel_path_to($base_rel_path, \@target_bits);

  my $find_str;
  if ($is_my_package) {
    my $find_path = join('/', @adjustment);
    # if (!$find_path) { $find_path = '.'; }
    # There may be a merged folder combination which the source directories only partially reflect (and honce, the
    # directory existence test).
    $find_str = `test -d 'node_modules/\@${package}/policy/${base_rel_path}' && cd 'node_modules/\@${package}/policy/${base_rel_path}' && find '$find_path' -maxdepth 1 -name '*.md'`;
  }
  else {
    my $exo_path = join('/', @bits[$path_pivot...$#bits]);
    $find_str = `test -d "node_modules/\@${package}/policy/${exo_path}" && cd "node_modules/\@${package}/policy/${exo_path}" && find . -maxdepth 1 -name "*.md"`;
  }
  my @files = split /\n/, $find_str;

  if (!$is_my_package) { # TODO: why is this guarded on this? Don't we want to resolve our own files?
    @files = map {
        s|^\./||;
        join('/', @adjustment)."/$_";
      } @files;
  }

  # Different packages may have the same structure, so files may build up.
  push @{$tracker->{"files"}}, @files;
}

# $refs looks something like:
#   {
#     'dirs' => {
#       'staff' => {
#         'dirs' => {
#           'policies' => {
#             'files' => [
#               '../policies/Staff Management Policy.md'
#             ],
#             'dirs' => {}
#           }
#         }
#       }
#     }
#   }

# add support for implicit / generated files. See 'TODO: revamp process' at top.
if (! (exists $refs->{'dirs'}->{'staff'})) {
  $refs->{'dirs'}->{'staff'} = { "dirs" => {}, "files" => [] }
}
foreach my $file (('Company Jobs and Roles Reference.md', 'company-org-chart.png')) {
  if (!(grep /${file}$/, @{$refs->{'dirs'}->{'staff'}->{'files'}})) {
    push(@{$refs->{'dirs'}->{'staff'}->{'files'}}, join('/', rel_path_to($base_rel_path, ['staff']))."/${file}")
  }
}

# use Data::Dumper; print STDERR Dumper($refs);
open my $fd, ">", "$out" or die "Could not open ouput: $out";

sub print_refs {
  my $refs = shift;
  my $path = shift;
  my $depth = scalar @$path;

  foreach my $file (@{$refs->{"files"}}) {
    my $var_name = uc $file;
    $var_name =~ s/\.MD$//; # strip the extension
    $var_name =~ s|.*/([^/]+)$|$1|; # get the file 'basename'
    # converts each contiguous set of non-alpha numeric characters to a single '_'
    $var_name =~ s/[^A-Z0-9]+/_/g;

    print $fd " " x ($depth * 2);
    # print $fd "${var_name}: ".join("/", @$path)."/${file}\n";
    $file =~ s/ /%20/g;
    print $fd "${var_name}: ${file}\n";
  }

  foreach my $dir (keys %{$refs->{"dirs"}}) {
    print $fd " " x ($depth * 2);
    print $fd "${dir}:\n";

    my @new_path = (@$path, ($dir));
    print_refs($refs->{"dirs"}->{$dir}, \@new_path);
  }
} # foreach path

print_refs($refs, []);
close $fd;
