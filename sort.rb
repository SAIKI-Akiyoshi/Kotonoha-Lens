#!/usr/bin/env ruby
# -*- coding:utf-8 -*-

require 'optparse'

exit unless ARGV.options {|opt|
  opt.on( '-v', '--verbose' )           { |v| $OPT_v = v  }
  opt.on( '-f', '--flatten' )           { |v| $OPT_f = v  }
  opt.parse!
}

@db = gets(nil).
        gsub( /\n[　 ]+/, '／'  ).
        gsub( /／／/, '／'  ).
        split( /\n/ ).
        select{ |w| w =~ /[あ-んア-ン]/ }.
        sort_by{ |w|w.tr( 'ぁ-ん', 'ァ-ン' ) }.
        uniq

CONS = {}
%w(  あいうえお
     かきくけこ
     さしすせそ
     たちつてと
     なにぬねの
     はひふへほ
     まみむめも
     やゆよ
     らりるれろ
     わ
     がぎぐげご
     ざじずぜぞ
     だぢづでど
     ばびぶべぼ
     ぱぴぷぺぽ
).each{ |g|  g.each_char {|s|  CONS.merge!( s => g[0] ) } }


def same_consonant( a, b )
  CONS[ a[0] ] == CONS[ b[0] ]
end

@output = []
@db.each_with_index{ |w,i|

  if w.size > 5
    words = w.split( /[　 ／]+/ )
    head = words.shift
    
    words.sort_by!{ |w| w.tr( 'ぁ-ん', 'ァ-ン' ) }.uniq!
    p [head, words] if $OPT_v 

    max_n = ( 24 - head.size ) / ( 6 - head.size )
    total_n = words.size
    while words && words.size > 0
      if $OPT_f
        @output << ( head + words.shift )
      else
        words.select{ |w|
          total_n <= max_n || same_consonant( w, words[0] )
        }.each_slice(max_n) { |wds|
          if head =~ /^　/
            @output[-1] += "\n" +  head + '　' + wds.join( '　' ) 
          else
            @output << head + '　' + wds.join( '　' )
          end
          wds.each{ |s| words.delete( s ) }
          head = '　' * head.size
        }
      end
    end
  else
    @output << w
  end
}

@output.sort_by{ |w|
  w.tr( 'ぁ-ん', 'ァ-ン' )
}.tap{ |words|
  words_kata = words.map{ |w| w.tr( 'ぁ-ん', 'ァ-ン' ) }
  words.each_with_index{ |w,i|
    puts ""  unless  words_kata[ i - 1][0]  == words_kata[i][0]
    puts w
  }
}

