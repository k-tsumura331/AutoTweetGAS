var columnObject = {}; // カラム名から列番号を引くための連想配列

// 自動投稿用トリガー
function autoTweet() {
  if (timeFilter()) {
    tweetFromSpreadSheet();
  }
}

// 起動時間の制御
function timeFilter() {
  const TIME_SHEET_NAME = "time_schedule";
  const now = new Date();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TIME_SHEET_NAME);
  const values = sheet.getRange(2, 1, 96, 2).getDisplayValues();

  // 0分15分30分４５分以外は処理終了
  if (now.getMinutes() % 15 != 0) {
    return false;
  }

  // 配列の内容をキーに添字をvaluesに配置
  let timeObject = {};
  for (let item of values) {
    timeObject[item[0]] = item[1];
  }
  const hantei = now.getHours() + ':' + ('00' + now.getMinutes()).slice(-2);
  console.log(`timeFilter: ${timeObject[hantei]}`)
  return (timeObject[hantei] == 'TRUE');
}


// メニュー追加
function onOpen() {
  const ui = SpreadsheetApp.getUi()
  //メニュー名を決定
  const menu = ui.createMenu("GASメニュー");
  //メニューに実行ボタン名と関数を割り当て: その1
  menu.addItem("テスト投稿", "testTweet");
  //スプレッドシートに反映
  menu.addToUi();
}

function testTweet() {
  const TWEET_SHEET_NAME = "auto_tweet";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TWEET_SHEET_NAME);


  const activeRow = sheet.getActiveCell().getRow();
  const getId = sheet.getRange(activeRow, 1).getValue();
  console.log(`行 : ${activeRow}, ID: ${getId}`);

  // ポップアップ出力しIDを取得
  const rowId = parseInt(getId, 10);
  if (isNaN(rowId)) {
    Browser.msgBox("テスト投稿を行いたい行を選択してください。");
    return 1;
  }
  const result = Browser.msgBox(`管理ID:${rowId}をテスト投稿します。`, Browser.Buttons.OK_CANCEL);
  if (result == 'cancel') {
    return 0;
  }




  // シートの全セルデータを取得
  const values = sheet.getDataRange().getValues();
  const headArray = values[2];
  // 指定IDのみ切り出す
  const obj = getTweetRow(values.slice(2 + rowId, 3 + rowId), headArray);
  const id = obj["id"];
  const tweet_text = obj['tweet_text'] + ' ' + obj['retweet_url'];
  const media_id_strings = getMediaIdStrings(obj, true);

  try {
    // テストアカウントでツイート
    const selfRetweetWord = '/rt';
    if (obj["tweet_text"] == selfRetweetWord) {
      const url = obj['retweet_url'];
      const id = url.match(/([0-9]+)\/*$/)[1];
      console.log(`url: ${url}, id: ${id}`)
      twitterInstances['test'].postRetweet(id);
    } else {
      toTweet(tweet_text, media_id_strings, true);
    }
  } catch (e) {
    console.log(`エラー発生:${e}`);
    toSlack(`テストツイートに失敗しました。\n投稿ID：${id}\nエラー内容：${e}`);
    return 1;
  }
  toSlack(`テストアカウントで以下ツイートを実施。\n投稿ID：${id}\n内容：${tweet_text}`);
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
  const tweet_text = obj['tweet_text'] + ' ' + obj['retweet_url'];
  const next_tweet_time = obj["next_tweet_time"];
  const now = new Date();
  const media_id_strings = getMediaIdStrings(obj);

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

  // セルフリツイート分岐
  const selfRetweetWord = '/rt';
  if (obj["tweet_text"] == selfRetweetWord) {
    const url = obj['retweet_url'];
    const id = url.match(/([0-9]+)\/*$/)[1];
    console.log(`url: ${url}, id: ${id}`)
    twitterInstances['honban'].postRetweet(id);
  } else {
    try {
      // 全文一致するツイートを削除
      deleteSameTweet(tweet_text);
      // 本番アカウントでツイート
      toTweet(tweet_text, media_id_strings, false);
    } catch (e) {
      console.log(`エラー発生:${e}`);
      sheetUpdate(sheet, id, (message = e), (retry = false), (error = true));
      toSlack(`自動投稿に失敗しました。\n投稿ID：${id}\nエラー内容：${e}`);
      return 1;
    }
  }
  // toSlack(`以下ツイートを実施。\n投稿ID：${id}\n内容：${tweet_text}`);

  // 前回投稿時刻の更新
  sheetUpdate(sheet, id, (message = "自動投稿が正常終了しました。"));

  // テスト用に履歴を保存
  record(id);
}



// ツイート実行
function toTweet(tweet_text, media_id_strings = [], test_flg = false) {
  let instance = twitterInstances['honban'];
  if (test_flg) {
    instance = twitterInstances['test'];
  }
  // ツイート
  if (media_id_strings.length) {
    // 画像がある場合
    console.log("media_id_strings: %s", media_id_strings);

    return instance.postTweetWithMedia(tweet_text, media_id_strings);
  } else {
    // 画像がない場合
    return instance.postTweet(tweet_text);
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

// 自動投稿結果を履歴シートに記録
function record(id) {
  const TWEET_SHEET_NAME = "auto_tweet";
  const RECORD_SHEET_NAME = "自動投稿履歴";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TWEET_SHEET_NAME);
  const sheet2 = spreadsheet.getSheetByName(RECORD_SHEET_NAME);

  // シートの全セルデータを取得
  const values = sheet.getDataRange().getValues();
  const headArray = values[2];
  // 指定IDのみ切り出す
  const obj = getTweetRow(values.slice(2 + id, 3 + id), headArray);

  // 履歴書き出し
  const array = [[obj["last_tweet_time"], obj["next_tweet_time"], id, obj["interval"], obj["tweet_text"] == '/rt']];
  sheet2.getRange(sheet2.getLastRow() + 1, 1, 1, 5).setValues(array);
}

