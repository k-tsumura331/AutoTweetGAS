// 自動投稿用トリガー
function autoTweet(){
  if(timeFilter){
    tweetFromSpreadSheet();
  }
}

// 起動時間の制御
function timeFilter(){
  const FROM_TIME = PropertiesService.getScriptProperties().getProperty('TWEET_TIME_FROM');
  const TO_TIME = PropertiesService.getScriptProperties().getProperty('TWEET_TIME_TO');
  const now_hour = new Date().getHours();
  console.log(`from : ${FROM_TIME}`);
  console.log(`to: ${TO_TIME}`);
  console.log(`now: ${now_hour}`);
  console.log(`check: ${now_hour >= FROM_TIME && now_hour < TO_TIME}`);
  return now_hour >= FROM_TIME && now_hour < TO_TIME;
}

function tweetFromSpreadSheet(){
  const TWEET_SHEET_NAME = 'auto_tweet'
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet       = spreadsheet.getSheetByName(TWEET_SHEET_NAME);  
  const row  = getTweetRow(sheet);
  
  const id   = row[0];
  const msg  = row[2];
  const time = row[10];
  const now  = new Date();
  const imageUrls = get_imageUrls(row);
  
  // 前回投稿時から間隔が短ければ投稿処理を見送る
  if(now <= time){
    console.log(`投稿優先度の一番高い行(投稿ID:${id})の次回投稿予定時刻に満たないため、投稿処理を見送りました。`); 
    sheetUpdate(sheet, id, message='次回投稿予定時刻に満たないため投稿処理を見送りました。', retry=true);
    return 0;
  } 
  // ツイートアカウントの設定
  const scriptProps = PropertiesService.getScriptProperties();
  scriptProps.setProperty('TWITTER_ACCESS_TOKEN', scriptProps.getProperty('TEST_ACCESS_TOKEN'));
  scriptProps.setProperty('TWITTER_ACCESS_SECRET', scriptProps.getProperty('TEST_ACCESS_SECRET'));
  const twit = new OAuthMI(scriptProps);
  
  try{
    // ツイート
    if (imageUrls.length){  // 画像がある場合
      var imageBlobs = twit.grabImages(imageUrls);
      Logger.log("imageBlobs: %s", imageBlobs);
      var uploadImgs = twit.uploadMedias(twit, imageBlobs);
      Logger.log("uploadImgs: %s", uploadImgs);
      const media_id_strings = uploadImgs.map(blob => blob.media_id_string).join(',')
      Logger.log("media_id_strings: %s", media_id_strings);
      var response = twit.sendTweet(msg, {media_ids: media_id_strings});
    }else{                  // 画像がない場合
      var response = twit.sendTweet(msg);
    }
  }catch(e){
    console.log(`エラー発生:${e}`);
    sheetUpdate(sheet, id, message=e, retry=false, error=true);
    toSlack(Utilities.formatString("自動投稿に失敗しました。\n投稿ID：%s\nエラー内容：%s", id, e));
    return 1;
  }
  
  // 前回投稿時刻の更新
  sheetUpdate(sheet, id, message='自動投稿が正常終了しました。');
  toSlack(Utilities.formatString("自動投稿が正常終了しました。\n投稿ID：%s\n%s", id, getLastTweetURL()));  
}

// シートから投稿優先度の高い行を取得する
function getTweetRow(sheet) {
  // シートの全セルデータを取得
  const values = sheet.getDataRange().getValues();
  // 先頭の見出し3行を削除
  values.shift();
  values.shift();
  values.shift();
  // console.log(`見出しを除いた全行取得: ${values}`);
  
  // 投稿優先度順にソート
  const values2 = values.sort(function(a, b) {
    // M列昇順,K列昇順,A列昇順
    if (a[12] < b[12]) return -1;
    if (a[12] > b[12]) return 1;
    if (a[10] < b[10]) return -1;
    if (a[10] > b[10]) return 1;
    if (a[0] < b[0])return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });
  
  // console.log(`ソート後の全行: ${values2}`);
  console.log(`投稿優先度が一番高い行: ${values2[0]}`); 
  
  // 一番優先度の高い行を返す
  return values2[0];
}

// シートに対して更新を行う
function sheetUpdate(sheet, id, message="", retry=false, error=false){
  const now = new Date();
  
  // L列に自動処理結果を反映
  sheet.getRange(id + 3, 12).setValue(message);
  
  // エラーなら文字色を赤に変更
  if(error){
    sheet.getRange(id + 3, 12).setFontColor("red");
  }else{
    sheet.getRange(id + 3, 12).setFontColor("");
  }
  
  // J列に前回投稿日に現在時刻を反映
  if(!retry){
    sheet.getRange(id + 3, 10).setValue(now);
    console.log(`投稿ID: ${id}の前回投稿日を更新しました。`); 
  }
}

// 画像URL1~4取得
function get_imageUrls(values){
  var imageUrls = [];
  for (var i=0; i<4; i++){
    const imageUrl = values[4 + i];
    if(imageUrl.length){
      imageUrls.push(imageUrl);
    }
  }
  return imageUrls;
}