const ArrayUtil = require("../src/ArrayUtil");

describe("ArrayUtil", () => {
  describe("Func: arrayToObject", () => {
    test("check Array", () => {
      srcArray = ["aaa", "bbb", "ccc"];
      rowArray = ["row1", "row2", "row3"];

      expect(ArrayUtil.arrayToObject(srcArray, rowArray)).toStrictEqual({
        row1: "aaa",
        row2: "bbb",
        row3: "ccc",
      });
    });
  });

  describe("Func: arrayToObject", () => {
    test("check object order", () => {
      srcArray = ["aaa", "bbb", "ccc"];
      rowArray = ["row3", "row1", "row2"];
      hashArray = ArrayUtil.arrayToObject(srcArray, rowArray);
      expect(ArrayUtil.objectToArray(hashArray)).toStrictEqual(srcArray);
    });
  });
});
