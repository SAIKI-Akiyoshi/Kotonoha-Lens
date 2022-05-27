require 'time'

DIC = 'kotonoha.txt'
HTML= 'kotonoha.html'

task :default => %w( kotonoha.html kotonoha.txt ) do |t|

  #File.open( DIC ){ |f| @dic = f.gets(nil) }
  @dic = %x[ ruby sort.rb #{DIC} ]
  # var db_text=`  がなければ付加
  if @dic !~ /var\s+db_text/
    puts "add 'var db_text=`' to #{DIC} "
    File.open( DIC, 'w+' ){ |f|
      f.puts 'var db_text=`'
      f.puts @dic
      f.puts '`'
    }    
  end
    
  #
  # kotonoha.html の中の日付を更新
  #
  File.open( HTML ){ |f| @html = f.gets(nil) }
  dic_date = Time.parse( @html.match( /\d{4}\/\d+\/\d+/ ).to_a[0] + " 23:59:59" )
  p [dic_date,File.stat( DIC ).mtime ]
  if dic_date  < File.stat( DIC ).mtime
    puts "update date in #{HTML}"
    File.open( HTML, 'w+' ){ |f|
      f.puts @html.sub( /\d{4}\/\d+\/\d+/,
                        File.stat( HTML ).mtime.strftime( "%Y/%m/%d" ) )
    }
  end

end

task :format => [ DIC ] do |t|
  %x[ ruby sort.rb #{DIC} > /tmp/koto.txt; mv /tmp/koto.txt #{DIC} ]
end
