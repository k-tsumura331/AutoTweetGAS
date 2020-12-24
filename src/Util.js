// 配列を連想配列に変換
function arrayToObject(itemArray, rowArray) {
  let obj = {};
  for (let i = 0; i < itemArray.length; i++) {
    obj[rowArray[i]] = itemArray[i];
  }
  return obj;
}

// 配列の内容をキーに添字をvaluesに配置
function arrayToSearchObject(headArray) {
  let obj = new Object();
  for (let i in headArray) {
    obj[headArray[i]] = Number(i) + 1;
  }
  return obj;
}

// 連想配列を配列に変換
function objectToArray(object) {
  return Object.keys(object).map((key) => object[key]);
}

// 二次元配列を連想配列に変換
function convertRowToObject(values) {
  // get keys
  var keys = values.splice(0, 1)[0];

  // convert row to object
  return values.map(function (row) {
    var object = {};
    row.map(function (column, index) {
      object[keys[index]] = column;
    });
    return object;
  });
}

//2バイト文字は2として文字数をカウント
function lenb(str) {
  var len = 0;
  str = escape(str);
  for (var i = 0; i < str.length; i++ , len++) {
    if (str.charAt(i) == "%") {
      if (str.charAt(++i) == "u") {
        i += 3;
        len++;
      }
      i++;
    }
    if (len == 0) {
      return "";
    } else {
      return len;
    }
  }
}

// 一次元配列を二次元配列に変換
function splitArray(array, part) {
  var tmp = [];
  for (var i = 0; i < array.length; i += part) {
    tmp.push(array.slice(i, i + part));
  }
  return tmp;
}

// slackに通知
// 設定は以下で行う　https://sugorokuya.slack.com/services/B01FGS38SS1
function toSlack(msg) {
  console.log(`toSlack:${msg}`);
  const webHook = PropertiesService.getScriptProperties().getProperty(
    "WEBHOOK_URL"
  );

  var params = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      text: msg,
    }),
  };

  UrlFetchApp.fetch(webHook, params);
}

// プロパティから数値を取得（定義されていなければ0）
function getpropertyToNumber(key) {
  const str = PropertiesService.getScriptProperties().getProperty(key);
  return str != null ? parseInt(str) : 0;
}

// プロパティから文字列を取得（定義されていなければ0）
function getpropertyToString(key) {
  const str = PropertiesService.getScriptProperties().getProperty(key);
  return str != null ? str : "";
}

// URLからblob型に変換
function Url2ImageBlob(url) {
  fetch_url = url
    .replace("www.dropbox.com", "dl.dropboxusercontent.com")
    .replace("?dl=0", "");
  console.log(`fetch_url:${fetch_url}`);
  try {
    if (fetch_url.match(/.png/)) {
      return UrlFetchApp.fetch(fetch_url, { muteHttpException: true }).getAs(
        "image/png"
      );
    }
    if (fetch_url.match(/.jpeg/) || fetch_url.match(/.jpg/)) {
      return UrlFetchApp.fetch(fetch_url, { muteHttpExceptions: true }).getAs(
        "image/jpeg"
      );
    }
  } catch (ex) {
    console.log(`Exception in Url2ImageBlob\nMessage: ${ex.message}\r\nFile: ${ex.fileName}\r\nLine: ${ex.lineNumber}\r\n`);
  }
}

// 日付チェック
function isDate(d) {
    if (Object.prototype.toString.call(d) === "[object Date]") {
        if (isNaN(d.getTime())) {
            return false;
        } else {
            return true;
        }
    } else {
        return false;
    }
}