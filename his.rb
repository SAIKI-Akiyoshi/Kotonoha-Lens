#!/usr/bin/env ruby
# -*- coding:utf-8 -*-

require 'optparse'
require 'time'
require 'json'
require 'gnuplot'


exit unless ARGV.options {|opt|
  opt.on( '-v', '--verbose' ) { |v| $OPT_a = v  }
  opt.parse!
}

#############################################################

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
             'words' => txt.split(/\n/).uniq.select{ |s| s.strip != "" }.size,
             'commit'=> c
  }.tap{ |t| p t}
}

if new_commits.size > 0
  @data.sort_by!{ |h| h['date'] }
  puts "adding #{new_commits.size} records, updating 'his.json'"
  open( "his.json", "w" ){ |f|  f.puts JSON.pretty_generate( @data ) }
end


Gnuplot.open do |gp|
  Gnuplot::Plot.new(gp) do |plot|
    # plot.xrange "[-3:3]"
    # f = "x ** 4 + 2 * 5 ** 3 - 10 * x ** 2 + 5 * x  + 4"
    # plot.data << Gnuplot::DataSet.new(f)
    plot.set 'terminal qt font "Helvetica" '
    plot.set 'yrange [0:]'
    plot.xlabel  "Date"
    plot.ylabel  "Words"

    plot.grid
    
    plot.timefmt "'%Y/%m/%d_%H:%M'"
    plot.xdata "time"
    plot.format  "x '%Y/%m/%d'"

    plot.style "data lines"

    data = @data.map{ |h| [h['date'], h['words']] }.uniq.sort.transpose
    # [ [date,words], [date,words], [date,words], [date,words],,,,
    # => [ [ date, date, ,,,, ], [words, words , words],,, ]
    plot.data << Gnuplot::DataSet.new( data ) do |ds|
      ds.title     = 'Words'
      ds.with      = 'linespoints pointtype 6'
      ds.linecolor = 3
      ds.linewidth = 1
      ds.using     = "1:2"
      ds.linewidth = "2"
    end
  end

end
