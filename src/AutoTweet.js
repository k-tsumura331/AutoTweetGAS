var columnObject = {}; // カラム名から列番号を引くための連想配列

// 自動投稿用トリガー
function autoTweet() {
  if (timeFilter) {
    tweetFromSpreadSheet();
  }
}

// メニュー追加
function onOpen() {
  const ui = SpreadsheetApp.getUi()
  //メニュー名を決定
  const menu = ui.createMenu("GASメニュー");  
  //メニューに実行ボタン名と関数を割り当て: その1
  menu.addItem("テストツイート","testTweet");
  //スプレッドシートに反映
  menu.addToUi();
}


// 起動時間の制御
function timeFilter() {
  const TIME_SHEET_NAME = "time_schedule";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TIME_SHEET_NAME);
  const values = sheet.getRange(2, 1, 96, 2).getDisplayValues();
  
  // 配列の内容をキーに添字をvaluesに配置
  let timeObject = {};
  for(let item of values){
    timeObject[item[0]] = item[1];
  }  
  const now = new Date();
  const hantei = now.getHours() + ':' + Math.trunc(now.getMinutes() / 15) * 15;
  return (timeObject[hantei] == 'TRUE');
}


function testTweet() {
  const TWEET_SHEET_NAME = "auto_tweet";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TWEET_SHEET_NAME);

  // ポップアップ出力しIDを取得
//  const result = Browser.inputBox("テストツイート対象のIDを入力してください。", "ID:", Browser.Buttons.OK);
//  const rowId = parseInt(result,10);
  const rowId = 1;
  if (rowId === NaN){
    Browser.msgBox("数値で入力してください。");
    return 1;
  }

  // シートの全セルデータを取得
  const values = sheet.getDataRange().getValues();
  const headArray = values[2];
  // 先頭の見出し3行を削除
  const obj = getTweetRow(values[3 + rowId], headArray);
  const id = obj["id"];
  const tweet_text = obj["tweet_text"] + obj['retweet_url'];
  const imageUrls = get_imageUrls(obj);
  
  try {
    // テストアカウントでツイート
    toTweet(tweet_text, imageUrls, true);
  } catch (e) {
    console.log(`エラー発生:${e}`);
    toSlack(`テストツイートに失敗しました。\n投稿ID：${id}\nエラー内容：${e}`);
    return 1;
  }
}


function tweetFromSpreadSheet() {
  const TWEET_SHEET_NAME = "auto_tweet";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TWEET_SHEET_NAME);
  
  // シートの全セルデータを取得
  const values = sheet.getDataRange().getValues();
  const headArray = values[2];
  // 先頭の見出し3行を削除
  const obj = getTweetRow(values.slice(3), headArray);
  const id = obj["id"];
  const tweet_text = obj["tweet_text"] + obj['retweet_url'];
  const next_tweet_time = obj["next_tweet_time"];
  const now = new Date();
  const imageUrls = get_imageUrls(obj);
  
  // 前回投稿時から間隔が短ければ投稿処理を見送る
  console.log(`now: ${now} next: ${next_tweet_time}`)
  if (now <= next_tweet_time) {
    console.log(`投稿優先度の一番高い行(投稿ID:${id})の次回投稿予定時刻に満たないため、投稿処理を見送りました。`);
    sheetUpdate(
      sheet,
      id,
      (message = "次回投稿予定時刻に満たないため投稿処理を見送りました。"),
      (retry = true)
    );
    return 0;
  }

  try {
    // 全文一致するツイートを削除
    deleteSameTweet(tweet_text);
    // 本番アカウントでツイート
    toTweet(tweet_text, imageUrls, false);
  } catch (e) {
    console.log(`エラー発生:${e}`);
    sheetUpdate(sheet, id, (message = e), (retry = false), (error = true));
    toSlack(`自動投稿に失敗しました。\n投稿ID：${id}\nエラー内容：${e}`);
    return 1;
  }
  
  // 前回投稿時刻の更新
  sheetUpdate(sheet, id, (message = "自動投稿が正常終了しました。"));
}



// ツイート実行
function toTweet(tweet_text, imageUrls, test_flg=false){
  const scriptProps = PropertiesService.getScriptProperties();
  if(test_flg){
    // テストアカウントでツイート
    scriptProps.setProperty(
      "TWITTER_ACCESS_TOKEN",
      scriptProps.getProperty("ACCESS_TOKEN_TEST")
    );
    scriptProps.setProperty(
      "TWITTER_ACCESS_SECRET",
      scriptProps.getProperty("ACCESS_SECRET_TEST")
    );
  }else{
    // 本番アカウントでツイート
    scriptProps.setProperty(
      "TWITTER_ACCESS_TOKEN",
      scriptProps.getProperty("ACCESS_TOKEN_HONBAN")
    );
    scriptProps.setProperty(
      "TWITTER_ACCESS_SECRET",
      scriptProps.getProperty("ACCESS_SECRET_HONBAN")
    );
  }
  console.log(scriptProps);
  return 0;
  const twit = new OAuthMI(scriptProps);
    
  // ツイート
  if (imageUrls.length) {
    // 画像がある場合
    var imageBlobs = twit.grabImages(imageUrls);
    Logger.log("imageBlobs: %s", imageBlobs);
    var uploadImgs = twit.uploadMedias(twit, imageBlobs);
    Logger.log("uploadImgs: %s", uploadImgs);
    const media_id_strings = uploadImgs
    .map((blob) => blob.media_id_string)
    .join(",");
    Logger.log("media_id_strings: %s", media_id_strings);
    var response = twit.sendTweet(tweet_text, {
      media_ids: media_id_strings,
    });
  } else {
    // 画像がない場合
    var response = twit.sendTweet(tweet_text);
  }
}


// シートから投稿優先度の高い行を取得する
function getTweetRow(values, headArray) {
  const objects = values.map((value) => arrayToObject(value, headArray));
  columnObject = arrayToSearchObject(headArray);
  // 投稿優先度順にソート
  const sortedObjects = objects.sort(function (a, b) {
    // Q列昇順,O列昇順,A列昇順
    if (a["exec_check"] < b["exec_check"]) return -1;
    if (a["exec_check"] > b["exec_check"]) return 1;
    if (a["next_tweet_time"] < b["next_tweet_time"]) return -1;
    if (a["next_tweet_time"] > b["next_tweet_time"]) return 1;
    if (a["id"] < b["id"]) return -1;
    if (a["id"] > b["id"]) return 1;
    return 0;
  });
  //  console.log(`投稿優先度が1番高い行: ${objectToArray(sortedObjects[0])}`);
  
  // 一番優先度の高い行を返す
  return sortedObjects[0];
}

// シートに対して更新を行う
function sheetUpdate(sheet, id, message = "", retry = false, error = false) {
  const now = new Date();
  const last_tweet_time = columnObject["last_tweet_time"];
  const result = columnObject["result"];
  
  // L列に自動処理結果を反映
  sheet.getRange(id + 3, result).setValue(message);
  
  // エラーなら文字色を赤に変更
  if (error) {
    sheet.getRange(id + 3, result).setFontColor("red");
  } else {
    sheet.getRange(id + 3, result).setFontColor("");
  }
  
  // J列に前回投稿日に現在時刻を反映
  if (!retry) {
    sheet.getRange(id + 3, last_tweet_time).setValue(now);
    console.log(`投稿ID: ${id}の前回投稿日を更新しました。`);
  }
}

// 画像URL1~4取得
function get_imageUrls(obj) {
  var imageUrls = [];
  // if (obj["imageUrl1"].length) {
  //   imageUrls.push(obj["imageUrl1"]);
  // }
  // if (obj["imageUrl2"].length) {
  //   imageUrls.push(obj["imageUrl2"]);
  // }
  // if (obj["imageUrl3"].length) {
  //   imageUrls.push(obj["imageUrl3"]);
  // }
  // if (obj["imageUrl4"].length) {
  //   imageUrls.push(obj["imageUrl4"]);
  // }
  return imageUrls;
}
