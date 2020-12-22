// トリガー数２０制限のため使用しない
// 起動時間の制御
function timeSchedule() {
  const TIME_SHEET_NAME = "time_schedule";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TIME_SHEET_NAME);
  const values = sheet.getRange(2, 1, 96, 2).getDisplayValues();

  // 現在設定されているトリガーを削除
  delTrigger('tweetFromSpreadSheet');

  // 投稿対象列がTRUEの時刻にトリガーを設定
  let timeObject = {};
  for (let time of values) {
    if (time[1] == 'TRUE') {
      setTrigger(time[0], 'tweetFromSpreadSheet')
    }
  }
}

function deldel() {
  delTrigger('autoTweet');
}


// 
function setTrigger(time_str, funcName) {
  const timer = new Date();
  const now = new Date();

  time = time_str.match(/(\d+):(\d+)/);
  console.log(time);

  timer.setHours(time[1]);
  timer.setMinutes(time[2]);
  if (now > timer) {
    timer.setDate(timer.getDate() + 1);
  }
  ScriptApp.newTrigger(funcName).timeBased().at(timer).create();
}

function delTrigger(funcName) {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() == funcName) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}