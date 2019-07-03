function scrollToBottom( driver ){

  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; $("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  driver.executeScript(script)
}

function scrollToCenter( driver ){
  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; $("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  driver.executeScript(script)
}


// (webElement) video
async function playVideo( video,canvas ){

  let duration = await video.getAttribute('duration')
  console.log('duration----:',duration);
  // setTimeout
  await canvas.click()
  let id = await setTimeout( playVideoTimeout ,1000000*1000, video );

}


function playVideoTimeout( video ){
  console.log( "video is over")
}


module.exports = {
  scrollToBottom,
  scrollToCenter,
  playVideo
}
