'use strict';


function delmuda(){
 const scriptProp = PropertiesService.getScriptProperties();
 let consumer_key =  scriptProp.getProperty("CONSUMER_KEY")
 let consumer_sercret = scriptProp.getProperty("CONSUMER_SECRET");
  let webhook = scriptProp.getProperty("WEBHOOK_URL");
 scriptProp.deleteAllProperties(); 
  scriptProp.setProperty("CONSUMER_KEY", consumer_key);
  scriptProp.setProperty("CONSUMER_SECRET", consumer_sercret);
  scriptProp.setProperty("WEBHOOK_URL", webhook);  
}



function test_Tweet() {
  // pickUpTweetInOrderは用意しました
  const message = "test";
  twitterInstances['test'].postTweet('test');
  twitterInstances['honban'].postTweet('honban');
}

function test_Retweet() {
  // pickUpTweetInOrderは用意しました
  const id = "1336092820621418496";
  //twitterInstances['test'].postTweet('test');
  twitterInstances['honban'].postRetweet(id);
}





var accounts = ['test', 'honban'];
// 認証用インスタンス（複数入れられるように）
var twitterInstances = {};
for (var i in accounts) {
  let account = accounts[i];
  var instance = TwitterClient.getInstance(
    PropertiesService.getScriptProperties().getProperty("CONSUMER_KEY"),
    PropertiesService.getScriptProperties().getProperty("CONSUMER_SECRET"),
    account
  );
  
  // 作ったserviceインスタンスを保存しておく
  twitterInstances[account] = instance;
}

function getCallbackUrl() {
  for (let key in twitterInstances) {
    let instance = twitterInstances[key];
    console.log(instance.getCallbackUrl());
  }
}

function authorize () {
  for (let key in twitterInstances) {
    instance = twitterInstances[key];
    console.log(`${key}:`);
    instance.authorize();
  }
}

function getLastURL() {
  return twitterInstances['honban'].getLastTweetURL();
}

/**
* 認証を削除したい時はこれを実行する
*/
function reset () {
  let clientList = TwitterClient.getClientList();
  for (let key in clientList) {
    let instance = clientList[key];
    instance.reset();
  }
}


/**
｀* authorizeでTwitterでの認証後に実行される処理
* ※手動で実行はしません
*/
function authCallback (request) {
  let clientList = TwitterClient.getClientList();
  instance = clientList[request.parameter.serviceName];
  return instance.authCallback(request)
}


// ツイートを投稿
function postUpdateStatus(message) {
  if (message == "") {
    return;
  }
  var service  = twitter.getService();
  var response = service.fetch('https://api.twitter.com/1.1/statuses/update.json', {
    method: 'post',
    payload: { status: message }
  });
}

// 画像URL1~4を取得し、アップロード
function getMediaIdStrings(obj, testFlg = false) {
  let instance = twitterInstances['honban'];
  if(testFlg){
    instance = twitterInstances['test'];
  }
  
  let media_id_strings = [];
  if (obj["image_url1"].length) {
    media_id_strings.push(instance.uploadTwitterForDropBoxMedia(obj["image_url1"]));
  }
  if (obj["image_url2"].length) {
    media_id_strings.push(instance.uploadTwitterForDropBoxMedia(obj["image_url2"]));
  }
  if (obj["image_url3"].length) {
    media_id_strings.push(instance.uploadTwitterForDropBoxMedia(obj["image_url3"]));
  }
  if (obj["image_url4"].length) {
    media_id_strings.push(instance.uploadTwitterForDropBoxMedia(obj["image_url4"]));
  }
  return media_id_strings;
}
