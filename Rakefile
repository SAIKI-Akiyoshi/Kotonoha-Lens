require 'time'

DIC = 'kotonoha.txt'
HTML= 'kotonoha.html'

task :default => %w( kotonoha.html kotonoha.txt ) do |t|

  File.open( DIC ){ |f| @dic = f.gets(nil) }
  if @dic !~ /var\s+db_text/
    puts "add 'var db_text=`' to #{DIC} "
    File.open( DIC, 'w+' ){ |f|
      f.puts 'var db_text=`'
      f.puts @dic
      f.puts '`'
    }    
  end
    
  File.open( HTML ){ |f| @html = f.gets(nil) }
  dic_date = Time.parse( @html.match( /\d{4}\/\d+\/\d+/ ).to_a[0] )
  # p [dic_date,File.stat( HTML ).mtime ]
  if dic_date  < File.stat( HTML ).mtime - 3600 * 24 
    puts "update date in #{HTML}"
    File.open( HTML, 'w+' ){ |f|
      f.puts @html.sub( /\d{4}\/\d+\/\d+/,
                        File.stat( HTML ).mtime.strftime( "%Y/%m/%d" ) )
    }
  end

end

