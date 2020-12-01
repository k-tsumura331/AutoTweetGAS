// Twitterの投稿用API

var OAuthMI = function (properties) {
  // OAuthMIコンストラクタを定義
  Twitterlib.OAuth.call(this, properties); // 親クラスTwitterlib.OAuthのコンストラクタの呼び出し→OAuthのコンストラクタが、OAuthMIのコンストラクタになる
};

OAuthMI.prototype = new Twitterlib.OAuth(); // OAuthMIのプロトタイプに Twitterlib.OAuthのインスタンスを代入

// OAuthMIのプロトタイプとして、メソッドgrabImagesを定義
OAuthMI.prototype.grabImages = function (image_urls) {
  return image_urls.map((url) => Url2ImageBlob(url));
};

// OAuthMIのプロトタイプとして、メソッドuploadMediasを定義
// Twitterlib.OAuth.uploadMediaの引数のalt_textはオプションなので、ここでは省く
OAuthMI.prototype.uploadMedias = function (twit, imageBlobs) {
  return imageBlobs.map((blob) => twit.uploadMedia(blob));
};

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
    console.log(
      `Message: ${ex.message}\r\nFile: ${ex.fileName}\r\nLine: ${ex.lineNumber}\r\n`
    );
  }
}
