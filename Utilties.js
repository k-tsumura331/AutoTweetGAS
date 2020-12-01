// 二次元配列を連想配列に変換
function convertRowToObject(values) {
  // get keys
  var keys = values.splice(0, 1)[0];
  
  // convert row to object
  return values.map(function(row) {
    var object = {};
    row.map(function(column, index) {
      object[keys[index]] = column;
    });
    return object;
  });
}

//2バイト文字は2として文字数をカウント
function lenb(str) {
  var len = 0;
  str = escape(str);
  for (var i = 0; i < str.length; i++, len++) {
    if (str.charAt(i) == "%") {
      if (str.charAt(++i) == "u") {
        i += 3;
        len++;
      }
      i++;
    }
  }
  if(len == 0){
    return "";
  }else{
    return len;
  }
}

// 一次元配列を二次元配列に変換
function splitArray(array, part) {
    var tmp = [];
    for(var i = 0; i < array.length; i += part) {
        tmp.push(array.slice(i, i + part));
    }
    return tmp;
}

// slackに通知
// 設定は以下で行う　https://sugorokuya.slack.com/services/B01FGS38SS1
function toSlack(msg) {
  const webHook = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  
  var params =
      {
        method : 'post',
        contentType : 'application/json',
        payload : JSON.stringify({
          text : msg
        })
      };
  
  UrlFetchApp.fetch(webHook, params);
}