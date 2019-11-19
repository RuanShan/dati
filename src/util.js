const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const domain = 'ouchn.cn'
async function scrollToBottom(driver) {

  let getScrollHeightScript = "return document.body.scrollHeight;"
  let scrollHight = await driver.executeScript(getScrollHeightScript)
  console.log("scrollHight=", scrollHight)
  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  // 需要检查路径是否在 http://anhui.ouchn.cn/ 下，animate可能不存在
  let url = await driver.getCurrentUrl()
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; $("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  if( url.indexOf( domain )<0){
    script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; window.scrollTo(0,document.body.scrollHeight);'
  }
  driver.executeScript(script)
  let delay = Math.ceil(parseInt(scrollHight) / 500) * 1000

  return new Promise((resolve, reject) => {
    setTimeout(resolve, delay);
  })
}

function scrollToCenter(driver) {
  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; $("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  driver.executeScript(script)
}


// (webElement) video
async function playVideo(driver, canvas) {

  console.log('this is a video');

  let video = await driver.wait(until.elementLocated(By.tagName('video')), 10000);

  let duration = await driver.wait(function() {
    return video.getAttribute('duration').then(function(aaaa) {
      console.log('aaaa----:', aaaa);
      if(!(isNaN(aaaa))){
        return aaaa
      }
      return  !(isNaN(aaaa))
    });
  }, 10000);
  console.log('duration----:', duration);
  // setTimeout
  await canvas.click()
  // 等待视频播放完毕
  return new Promise((resolve, reject) => {
    setTimeout(resolve, duration * 1000, video);
  })

}


function playVideoTimeout(video) {
  console.log("video is over")
  return true
}


module.exports = {
  scrollToBottom,
  scrollToCenter,
  playVideo
}
