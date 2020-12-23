// 検索ボタン
function searchButtonFunc() {
  const DELETE_SHEET_NAME = "search_and_delete";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    DELETE_SHEET_NAME
  );

  const regexp = sheet.getRange("C2").getValue();
  const intervalDay = sheet.getRange("C3").getValue();

  // 必須欄が未入力なら終了
  if (regexp === "" || intervalDay === "") {
    return 0;
  }

  // 結果出力エリアをクリア
  rowClear(sheet, 8);

  // 取得対象時刻を設定
  let targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - intervalDay);

  try {
    // ツイート検索
    const tweets = searchTweets(regexp, targetDate);
    const shapedTweets = shapeTweets(tweets);

    // 対象があれば結果リストをシートに反映
    if (shapedTweets.length) {
      insertArray(sheet, shapedTweets, 8, 1);
      insertCheckBox(sheet, shapedTweets.length, 8, 2, true);
    } else {
      Browser.msgBox(
        "条件を満たすツイートが存在しませんでした。",
        Browser.Buttons.OK
      );
    }
  } catch (e) {
    Browser.msgBox(`例外が発生しました。:${e}`, Browser.Buttons.OK);
  }
}

// クリアボタン
function clearButtonFunc() {
  const DELETE_SHEET_NAME = "search_and_delete";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    DELETE_SHEET_NAME
  );

  rowClear(sheet, 8);
}

// 削除ボタン
function delButtonFunc() {
  const DELETE_SHEET_NAME = "search_and_delete";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    DELETE_SHEET_NAME
  );

  // range取得
  const lastRow = sheet.getLastRow();
  const values = sheet.getRange(8, 1, sheet.getLastRow() - 7, 4).getValues();
  const result = [];

  values.forEach(function (row) {
    if (row[1]) {
      if (twitterInstances['honban'].postDestroy(row[0])) {
        // 削除成功
        result.push("削除処理が完了しました。");
      } else {
        // 削除失敗
        result.push("削除に失敗しました。");
      }
    } else {
      // 削除フラグが未チェック
      result.push("");
    }
  });

  // 処理結果をシートに反映
  insertArray(sheet, splitArray(result, 1), 8, 5);
}

// ツイート検索
function searchTweets(regexp, targetDate) {
  // 取得対象時刻により過去で、最新のツイートID
  const tweetId = getTweetIdByTime(targetDate);

  // 検索対象以前のツイートが存在しなければポップアップ
  if (tweetId === 0) {
    return [];
  }

  // 対象の全ツイートを取得
  const tweets = getAllTweet(tweetId);

  // 正規表現のチェック
  return tweets.filter((tweet) => tweet.text.match(regexp));
}

// 指定ID以前の全ツイートを取得
function getAllTweet(maxid) {
  const tweetJsons = twitterInstances['honban'].getTweetJsons(maxid);

  // 最後までたどっていたら返す
  if (tweetJsons.length == 1) {
    return tweetJsons;
  }
  const lastTweetJson = tweetJsons.slice(-1)[0];
  return tweetJsons.concat(getAllTweet(lastTweetJson.id_str));
}

// 指定時刻以前のツイートIDを取得
function getTweetIdByTime(targetDate, maxid = 0) {
  // ツイートを200件取得
  const tweetJsons = twitterInstances['honban'].getTweetJsons(maxid);

  // 対象が存在しなければ0を返す
  if (tweetJsons.length == 1 || tweetJsons.length == 0) {
    return 0;
  }

  // 指定時刻以前のツイートを検索
  const found = tweetJsons.find(
    (tweetJson) => new Date(Date.parse(tweetJson.created_at)) <= targetDate
  );

  if (found === undefined) {
    // 存在しないなら次の200件を検索する
    const lastTweetJson = tweetJsons.slice(-1)[0];

    console.log(
      "ID:%s DATE:%s",
      lastTweetJson.id_str,
      lastTweetJson.created_at
    );
    return getTweetIdByTime(targetDate, lastTweetJson.id_str);
  } else {
    // 存在するならそのIDを返す
    return found.id_str;
  }
}

// ツイートリストから必要な項目だけを抜き出した配列に変換
function shapeTweets(tweetJsons) {
  const shapedTweets = tweetJsons.map(function (tweetJson) {
    const date = new Date(Date.parse(tweetJson.created_at));
    return [tweetJson.id_str, "", tweetJson.text, Utilities.formatDate(date, "JST", "yyyy/MM/dd HH:mm:ss")];
  });
  return shapedTweets;
}

// 自動削除機能
function autoDelete() {
  const regexp = '^【[^\n]*】';
  const intervalDay = 5;

  // 取得対象時刻を設定
  let targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - intervalDay);

  // ツイート検索
  const tweets = searchTweets(regexp, targetDate);
  const deleteIds = tweets.map(tweet => tweet.id_str);
  deleteIds.forEach(id => twitterInstances['honban'].postDestroy(id));

  // 削除履歴の保存
  tweets.forEach(tweet => recordDeleteLog(tweet.id_str, tweet.text));
}

// 全文一致ツイートの削除(【で始まるツイートの場合のみ実行)
function deleteSameTweet(tweet_txt) {
  if (tweet_txt.match('^【[^\n]*】')) {
    const twjsons = twitterInstances['honban'].getTweetJsons();
    const deleteList = twjsons.filter(tweet => tweet.text == tweet_txt);

    // ツイート削除    
    deleteList.forEach(tweet => twitterInstances['honban'].postDestroy(tweet.id_str));

    // 削除履歴の保存
    deleteList.forEach(tweet => recordDeleteLog(tweet.id_str, tweet.text));
  }
}

// 削除結果を履歴シートに記録
function recordDeleteLog(tweet_id, tweet_txt) {
  const TWEET_SHEET_NAME = "auto_tweet";
  const RECORD_SHEET_NAME = "削除履歴";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TWEET_SHEET_NAME);
  const sheet2 = spreadsheet.getSheetByName(RECORD_SHEET_NAME);
  const now = new Date();
  
  // 履歴書き出し
  const array = [[tweet_id, tweet_txt, now]];
  sheet2.getRange(sheet2.getLastRow() + 1, 1, 1, 3).setValues(array);
}

