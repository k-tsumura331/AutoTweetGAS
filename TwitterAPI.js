// 投稿以外のAPI利用用の設定

// 認証用URL取得
function getOAuthURL() {
  console.log(getService().authorize());
}

// サービス取得
function getService() {
  return OAuth1.createService('Twitter')
  .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
  .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
  .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
  // 設定した認証情報をセット
  .setConsumerKey(PropertiesService.getScriptProperties().getProperty("TWITTER_CONSUMER_KEY"))
  .setConsumerSecret(PropertiesService.getScriptProperties().getProperty("TWITTER_CONSUMER_SECRET"))
  .setCallbackFunction('authCallback')
  // 認証情報をプロパティストアにセット（これにより認証解除するまで再認証が不要になる）
  .setPropertyStore(PropertiesService.getUserProperties());
}

//  認証成功時に呼び出される処理を定義
function authCallback(request) {
  var service = getService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('success!!');
  } else {
    return HtmlService.createHtmlOutput('failed');
  }
}

// ツイート実行
function toTweet(msg, media={}) {
  var twitterService = getService();
  
  if (twitterService.hasAccess()) {
    var twMethod = { method:"POST" };
    twMethod.payload = Object.assign({ status: msg }, media);
    const response = twitterService.fetch("https://api.twitter.com/1.1/statuses/update.json", twMethod);
  } else {
    console.log(service.getLastError());
  }  
}

// ツイートリストを取得する
function getTweetJsons(maxid=0) {
  var twitterService = getService();  
  if (!twitterService.hasAccess()) {
    console.log(service.getLastError());
  }  
  
  const twMethod = { method:"GET" };
  let apiurl = "https://api.twitter.com/1.1/statuses/user_timeline.json?count=200&trim_user=t&include_rts=1"
  if(maxid != 0) {
    apiurl += "&max_id=" + maxid;
  }
  const response = twitterService.fetch(apiurl, twMethod);
  return JSON.parse(response)
}

// 指定IDのツイートを削除
function deleteById(id) {
  var twitterService = getService();
  
  if (twitterService.hasAccess()) {
    var twMethod = { method:"POST" };
    try{
      // 削除実施
      const response = twitterService.fetch("https://api.twitter.com/1.1/statuses/destroy/"+id+".json", twMethod);
    }catch(e){
      console.log(`エラー発生:${e}`);
      return false;
    }
  } else {
    console.log(`認証エラー発生：${service.getLastError()}`);
  return false;
}  
return true;
}



// 最後に呟いたURLを取得
function getLastTweetURL() {
  var twitterService = getService();
  
  if (!twitterService.hasAccess()) {
    console.log(service.getLastError());
  }
  
  var twMethod = { method:"GET" };
  const response = twitterService.fetch("https://api.twitter.com/1.1/statuses/user_timeline.json?count=1&trim_user=t", twMethod);
  const array = JSON.parse(response)
  const tweet_id = array[0].id_str;
  const url = "https://twitter.com/twitter/status/" + tweet_id;
  console.log("URL:%s", url)
  return url;
}
