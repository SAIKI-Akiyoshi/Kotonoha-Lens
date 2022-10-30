#!/usr/bin/env ruby
# -*- coding:utf-8 -*-

require 'optparse'
require 'time'
require 'json'

exit unless ARGV.options {|opt|
  opt.on( '-v', '--verbose' ) { |v| $OPT_a = v  }
  opt.parse!
}

begin
  @data = JSON.load( open( "his.json" ).gets(nil) )
rescue
  puts "can't open 'his.json'"
  @data = []
end
puts "data from 'his.json':  record size = #{@data.size}"

@commits = {}
%x[ git log ].scan( /^commit ([\h]+).*?^Date:\s*(.*?)$/m ).each{ |commit, date|
  @commits[ commit] = Time.parse( date )
}
puts "data from 'git log':   record size = #{@commits.size}"
puts @commits  if $OPT_v

new_commits = @commits.keys - @data.map{ |h| h['commit'] }

new_commits.each{ |c|
  dt = @commits[c]  
  txt = %x[ git show #{c}:kotonoha.txt | ruby sort.rb -f ]

  @data << { 'date'  => dt.strftime( "%Y/%m/%d_%H:%M"),
             'words' => txt.split(/\n/).size,
             'commit'=> c
  }.tap{ |t| p t}
}

if new_commits.size > 0
  puts "adding #{new_commits.size} records, updating 'his.json'"
  open( "his.json", "w" ){ |f|  f.puts JSON.pretty_generate( @data ) }
end

require 'gnuplot'

Gnuplot.open do |gp|
  Gnuplot::Plot.new(gp) do |plot|
    # plot.xrange "[-3:3]"
    # f = "x ** 4 + 2 * 5 ** 3 - 10 * x ** 2 + 5 * x  + 4"
    # plot.data << Gnuplot::DataSet.new(f)
    plot.xlabel  "Date"
    plot.ylabel  "Words"

    plot.grid
    
    plot.timefmt "'%Y/%m/%d_%H:%M'"
    plot.xdata "time"
    plot.format  "x '%Y/%m/%d'"

    plot.style "data lines"

    x = @data.sort_by{ |h| h['date'] }.map{ |h| h['date'] }
    y = @data.sort_by{ |h| h['date'] }.map{ |h| h['words'] }
    plot.data << Gnuplot::DataSet.new( [x,y] ) do |ds|
      ds.title     = 
      ds.with      = "linespoints"
      ds.using     = "1:2"
      ds.linewidth = "2"
    end
  end

end
