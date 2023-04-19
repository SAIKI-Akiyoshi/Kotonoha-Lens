#!/usr/bin/env ruby
#
# Android側の辞書をPC側に get あるいは PC側の辞書をAndroid側へput する
# adb put/get をラップしているだけ
# adb を事前に接続しておく必要あり
#

require 'optparse'

exit unless ARGV.options {|opt|
  opt.on( '-v', '--virbose' )   { |v| $OPT_v = v }
  opt.on( '-n', 'suppress' )    { |v| $OPT_n = v }
  opt.on( '-i', '--interactive' )  { |v| $OPT_i = v }
  opt.on( '--get' )  { |v| $OPT_get = v }
  opt.on( '--put' )  { |v| $OPT_put = v }
  opt.on( '--cat' )  { |v| $OPT_cat = v }
  opt.parse!(ARGV)
}

def do_cmd( cmd )
  IO.popen( cmd, "r+" ) {|io|
    while !io.eof
      puts io.gets.gsub( /\r/, '' )
      yield line  if block_given?
    end
  }
  unless $?.success?
    puts "cmd: '#{cmd}'"
    raise "do_cmd() Error"
  end
end

DIC = 'kotonoha.txt'
DIR = "/sdcard/Documents/Kotonoha"

if $OPT_get
  do_cmd( "adb pull #{DIR}/#{DIC} ." )
elsif $OPT_cat
  do_cmd( "adb shell cat #{DIR}/#{DIC}" )
elsif $OPT_put
  do_cmd( "adb push #{DIC} #{DIR}/#{DIC}" )
else
  do_cmd( "adb shell ls -la #{DIR}/#{DIC}" )
end


  
