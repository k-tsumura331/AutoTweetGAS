module.exports = class ArrayUtil {
  // 配列を連想配列に変換
  static arrayToObject(itemArray, rowArray) {
    let obj = {};
    for (let i = 0; i < itemArray.length; i++) {
      obj[rowArray[i]] = itemArray[i];
    }
    return obj;
  }

  // 連想配列を配列に変換
  static objectToArray(object) {
    return Object.keys(object).map((key) => object[key]);
  }
};
