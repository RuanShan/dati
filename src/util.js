
const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
function scrollToBottom(driver) {

  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; $("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  driver.executeScript(script)
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
    return video.getAttribute('duration').then(function(duration) {
      return duration != NaN
    });
  }, 10000);

  duration = await video.getAttribute('duration');

  console.log('duration----:', duration);
  // setTimeout
  await canvas.click()

  return new Promise((resolve, reject)=>{
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
