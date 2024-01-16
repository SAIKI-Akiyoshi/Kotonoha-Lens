
var start_t    = new Date().getTime();
var log_indent = 0;
function log( msg ) {
  if ( msg == '' ) {
    start_t = new Date().getTime();
  }
  else {
    if ( msg[0] == '<' )  log_indent -= 2;
    let diff  = new Date().getTime() - start_t;
    let space = "                 ".slice( 0, log_indent );
    console.log( "%s: %s%s", ("  " + diff).slice(-3), space, msg );
    if ( msg[0] == '>' )  log_indent += 2;
  }
}

// カタカナ -> ひらがな
function kataToHira( str ) {
  return  str.replace(/[\u30A1-\u30FA]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// ひらがな -> カタカナ
function hiraToKata(str) {
  return str.replace(/[\u3041-\u3096]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

// 配列の重複を取り除く
// [ 'あ', 'あ', 'い', 'う', 'え', 'え', 'あ'] -> ['あ','い','う','え']
function uniq( a ) {
  let set = new Set( a );
  return  Array.from( set ).sort();
}

function uniq_str( str ) {
  return uniq( str.split( '' ) ).join( '' );
}

// 連想配列をソートして Array を返す
function dic_sort( dic ) {
  log( "> dic_sort()" );

  let keys = Object.keys( dic );
  log( "size = " + keys.length );

  let array = keys.map((k)=>({ key: k, value: dic[k] }));
  array.sort( (a, b) => b.value - a.value );  // reverse

  log( "<" );
  return array;
}

const sleep = (msec) => {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, msec);
  });
};

/*
 * (setq js-indent-level 2)
 */
var cur_chars = {
  hit_1  : "", hit_2  : "", hit_3  : "", hit_4  : "",  hit_5  : "",
  blow_1 : "", blow_2 : "", blow_3 : "", blow_4 : "",  blow_5 : "",
  none : "dummy"  // 初期状態で「入力変化」ありにするため
};

//全 ひらがな
var  KANA_LIST =
    `あいうえお  かきくけこ
     さしすせそ  たちつてと
     なにぬねの  はひふへほ
     まみむめも  やゆよ
     らりるれろ  わ
     がぎぐげご  ざじずぜぞ
     だぢづでど  ばびぶべぼ
     ぱぴぷぺぽ  ぁぃぅぇぉ
     っゃゅょ    んー`.replace( /\s+/g, '' ).split('');

var KANA_REGE = new RegExp( "[" +
                            KANA_LIST.join('') +
                            kataToHira( KANA_LIST.join('') ) +
                            "]" );

var NON_KANA_REGE = new RegExp( "[^" +
                                KANA_LIST.join('') +
                                kataToHira( KANA_LIST.join('') ) +
                                "]" );
var DB = [];
var HIRA_DB  = [];
var HIRA_DBa = [];

var in_analyze = false;

function start() {
log( '' )
log( "> start");
  let lead = '';
  //
  // kotonoha.txt を内容から DB[] を作る
  //
  db_text.split( /\n/).forEach( line => {
    // 空白 , / で分割
    let words = line.split( /[,、\/／　 ]+/ ).filter( (s) => s != '' );

    if ( words.length == 1 && words[0].length == 5 ) { // 5文字
      // かわりもの
      DB.push( words[0] );
    }
    else if ( words.length > 0 ) {
      //かん　きゃく　きゅう　きょう
      //　　　ぎょう
      if ( line.search( /^[　 ]/ ) == -1 ) { // 行頭が空白ではない
        lead = words.shift();
      }
      words.forEach( wd => {
        DB.push( lead + wd );
      });
    }
  });

  for ( let i = 0; i < DB.length; i++ ) {
    let wd = kataToHira( DB[i] );
    HIRA_DB.push( wd );
    HIRA_DBa.push( uniq( wd.split( '' ) ) );
  }

  Object.keys(cur_chars).forEach( id => {
    let btn = document.getElementById( id )
    btn.addEventListener( "input", check_input );
  });

  log( "< start");
  check_input();
};

function check_input() {
  if ( in_analyze ) {
    console.log( "IN ANALYZE" );
    setTimeout( check_input, 300 ); // 少し待って再トライ
  }
  else {
    log( '' );
    log( "> check_input()" );

    // input欄の内容を読み込んで analyze() を呼ぶ
    let changed = false;
    Object.keys(cur_chars).forEach( id => {
      let c = document.getElementById( id ).value;
      if ( c != cur_chars[ id ] ) {
        // かな以外の文字が含まれている場合は analyze() を呼ばない
        if ( c.search( NON_KANA_REGE ) == -1 )  {
          changed = true;
          cur_chars[ id ] = c;
        }
      }
    });
    if ( changed ) {
      analyze();
    }

    log( "< check_input()" );
  }
}

function update_doc( id, html ) {
  log( "> update_doc " + id  );
  document.getElementById( id ).innerHTML = html;
  log( "<" )
}


//
//
//
var candidate_words = [];
var must_RE         = null;
var must_KANA_dic   = {};

async function grep( pattern, blow_c, ng_chars ) {
  log( "> grep( "+ pattern + ")" );

  candidate_words.length = 0;

  try {
    let match_re = new RegExp( kataToHira( pattern ) )
    let ng_re    = new RegExp( "[" + kataToHira( ng_chars ) + "]" );

    let blow_a   = blow_c.split('')
    let lines    = [];
    let step     = Math.floor( DB.length / 10 );

    for ( let i = 0; i < DB.length; ++i ) {
      // 8000回ループの間、時々 event loopに制御を渡す
      if ( i % step == 0 ) { await sleep(1); }

      let wd = HIRA_DB[i];

      if (
        // おしい文字全てが含まれている
        ( blow_a.length == 0 || blow_a.every( (c) => wd.indexOf(c) >= 0 ) ) &&
          // どの NG 文字にも一致しない
        ( ng_chars.length == 0 || wd.search( ng_re ) == -1 ) &&
          // 検索パターンに一致
        ( wd.search( match_re ) >= 0 ) ) {

        // 候補単語に追加
        candidate_words.push( DB[i] );
        // ５単語 単位で改行
        if ( ( candidate_words.length - 1 ) % 5 == 0 ) {      // 行頭
          lines.push( DB[i] );
        }
        else {
          lines[ lines.length - 1 ] += "　" + DB[i];  // 空白に続けて追加
        }
      }
    }

    let html = [
      ( blow_c.length > 0   )? ( "「" + blow_c + "」を含み、<br>" )     : '',
      ( ng_chars.length > 0 )? ( "「" + ng_chars + "」を含まず、<br>" ) : '',
      "'",
      pattern.replace(/\./g,'・').replace( /\[(.)\]/g, "$1" ),
      "' に一致する候補：",
      candidate_words.length + "件<br>"
    ].join('');

    update_doc( 'grep_condition',  html );

    // 候補単語に色を付ける処理が重たいので
    // 分割処理して、時々 event loop に制御を渡す
    let candidate_doc = '';
    let sub_len       = Math.max( 20, lines.length / 10 );
    for ( let i = 0; i < lines.length; i += sub_len ) {
      candidate_doc += lines.slice( i, i + sub_len ).join( "<br>" ).
        replace( must_RE, '<span class="B">$&</span>' ) + "<br>"
      await sleep(1);
    }
    update_doc( 'candidate_words', candidate_doc );

  } catch (e) {
    // 正規表現の文法エラーを無視する
    console.log(e)
  }
  log( "< grep()" );
}

//
// 候補単語の含まれる文字のヒストグラム
//
async function show_used_chars( hist ) {
  log( "> show_used_chars()" );

  let chars = hist.filter( (h) => h.value > 0 );
  let text = ""
  let col  = 6;
  for ( let i = 0; i < chars.length; i += col ) {
    text += chars.slice( i, i + col ).
      map( (h) => ( '    ' + h.value ).slice( -4 ) + ':' + h.key ).
      join( '　' ).
      replace( must_RE, '<span class="B">$&</span>' ) + "<br>";
  }

  // must_chars を赤で表示
  update_doc( 'hist_chars',
              text
            );

  log( "< show_used_chars()" );
  // 検索結果をさらに絞り込むために効果的な単語をリストする
}


//
// 絞り込みのための候補単語の表示
//
async function refine( rate ) {
  log( "> refine()" );

  log( "> DB.forEach" );
  // DB[] の単語に rate で重みを付ける
  let score = {}

  for ( let i = 0; i < DB.length; i++ ) {
    let s   = 0;
    HIRA_DBa[i].forEach( ( c ) => {
      s += must_KANA_dic[ c ] == 0 ? rate[ c ] : 0;
    });
    if ( s > 0 ) score[ DB[i] ] = s;
  }
  log( "< DB.forEach" );
  // => { けものみち:9, わさびもち:10, ちょっけつ: 8,,, }

  // 重みでソート、重みゼロをフィルタリング
  // 行単位でスライス
  let score_hist = dic_sort( score );
  let lines = [];
  log( "> make lines" );
  for ( let i = 0; i < score_hist.length; i += 3 ) {
    lines.push( score_hist.slice( i, i + 3 ).
                map( (sc) => {
                  return ('    ' + sc.value  ).slice( -5 ) +  ':' + sc.key;
                }).join( '　' )
              );
  }
  log( "<" );
  // => " 10:わさびもち　9:おともだち　9: けものみち"
  //    "  8:ちょっけつ
  //

  // 検索結果の中の candidate_words に含まれない文字をorange表示
  // するための RegExp => rege2
  let candidate_chars   = uniq_str( kataToHira( candidate_words.join('') ) );
  let used_chars        = candidate_chars.replace( must_RE, '' );
  let used_re = new RegExp( '['+ used_chars + hiraToKata(used_chars) +']+', 'g' );

  // 候補単語に色を付ける処理が重たいので
  // 分割処理して、時々 event loop に制御を渡す
  let refine_doc = "";
  let sub_len = Math.floor( DB.length / 20 );
  for ( let i = 0; i < lines.length; i += sub_len ) {
    log( "make refine_doc: " + ( "    " + i ).slice(-4) + "/" + lines.length );
    refine_doc += lines.slice( i, i + sub_len ).join( "<br>" ).
      replace( must_RE, '<span class="R">$&</span>' ).
      replace( used_re, '<span class="O">$&</span>' ) +
      "<br>"
    await sleep(1);
  }
  update_doc( 'refine_words', refine_doc );
  log( "< refine()" );
}

//
// キー入力で呼ばれる
// <input>の内容を取り出して grep(), show_used_chars() を呼ぶ
//
async function analyze() {

  in_analyze = true;
  log( "> analyze()" );


  let hit_c   = [1,2,3,4,5].map( i => cur_chars[ "hit_"  + i ] ).join('');
  let blow_c  = [1,2,3,4,5].map( i => cur_chars[ "blow_" + i ] ).join('');
  let pattern = [1,2,3,4,5].map( i => {
    let hc = cur_chars[ "hit_"  + i ];   // 当たりの文字
    let bc = cur_chars[ "blow_" + i ];   // おしい文字

    return ( hc.length > 0 )? ( '['  + hc + ']' ) : // そこに含まれる
           ( bc.length > 0 )? ( '[^' + bc + ']' ) : // そこには含まれない
           '.';                                     // なんでもOK
  }).join('');
  let ng_chars = cur_chars[ "none" ];

  // 必ず含まれる文字の RegEx
  let must_chars = uniq_str( kataToHira( blow_c + hit_c ) );
  KANA_LIST.forEach( (kana) => {
    must_KANA_dic[ kana ]   = must_chars.indexOf( kana ) >= 0 ? 1: 0;
  });
  //console.log( must_KANA_dic );
  //console.log( unused_KANA_dic );
  must_RE = new RegExp( '[' + must_chars + hiraToKata(must_chars) + ']', 'g' );

  // blow_chars を含み、cur_chars[ "none" ]を含まず
  // pattern にマッチする 単語 を調べる
  // => candidate_words
  await grep( pattern, blow_c, ng_chars );

  // words[] の中の文字の出現頻度を調べる
  //  rate : { k1:v1, k2:v2, ,,, ]    key と その出現回数
  //  hist : [{km:vm}, {kn:vn} ....]     <= rate を配列にして sort
  //  total : v1 + v2 + ...
  //
  log( "> calc_hist()" );
  let rate  = {};
  let total = 0;
  KANA_LIST.forEach( kana => rate[ kana ] = 0 );

  candidate_words.forEach( word => {
    wd = kataToHira( word );
    for ( let j = 0; j < wd.length; j++ ) {
      rate[ wd[j] ] ++;
      total ++;
    }
  });

  let hist = dic_sort( rate );
  log( "< calc_hist()" );


  // 検索結果の単語に含まれる文字を頻度順に表示
  await show_used_chars( hist );

  // 絞り込みのための候補単語を表示
  await refine( rate );

  log( "< analyze()" );
  in_analyze = false;
}

start();
