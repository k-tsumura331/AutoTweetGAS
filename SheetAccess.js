// 配列データをシートに書き込む
function insertArray(sheet, array, startRow, startColumn){
  //データの入っている配列データはシートに一気に書き込む
  var lastColumn = array[0].length; //カラムの数を取得する
  var lastRow = array.length;   //行の数を取得する
  sheet.getRange(startRow,startColumn,lastRow,lastColumn).setValues(array);
}

// 指定位置からした方向にチェックボックスを挿入
function insertCheckBox(sheet, count, startRow, startColumn, check=false){
  const range = sheet.getRange(startRow,startColumn,count,1);
  range.insertCheckboxes();
  if(check){
    range.check();
  }
}

// スプレッドシートの指定行以降をクリア
function rowClear(sheet, startRow){
  sheet.getRange(startRow,1,sheet.getLastRow(),sheet.getLastColumn()).clearContent().removeCheckboxes();
}
