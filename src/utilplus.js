const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const fs = require('fs');

const domain = 'ouchn.cn'
async function scrollToBottom(page) {

  let getScrollHeightScript = "document.body.scrollHeight;"

  let scrollHight = await page.evaluate(getScrollHeightScript)
  console.log("scrollHight=", scrollHight)
  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  // 需要检查路径是否在 http://anhui.ouchn.cn/ 下，animate可能不存在
  let url = await page.url()
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; $("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  if( url.indexOf( domain )<0){
    script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; window.scrollTo(0,document.body.scrollHeight);'
  }
  await page.evaluate(script)
  
  let delay = Math.ceil(parseInt(scrollHight) / 500) * 1000

  await handleDelay( delay )
   
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

function getCourseNameByCode(code) {
  // liaoning
  console.debug( "code=", code )
  // if (code == '3796') return '3796_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4372') return '4372_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4487') return '4487_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4485') return '4485_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4608') return '4608_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4610') return '4610_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '3935') return '3935_马克思主义基本原理概论';
  // if (code == '4609') return '4609_马克思主义基本原理概论';
  // if (code == '4486') return '4486_马克思主义基本原理概论';
  // if (code == '3945') return '3945_习近平新时代中国特色社会主义思想';
  // if (code == '3797') return '3797_习近平新时代中国特色社会主义思想';
  // if (code == '4065') return '4065_习近平新时代中国特色社会主义思想';
  // if (code == '4611') return '4611_习近平新时代中国特色社会主义思想';
  // if (code == '4488') return '4488_习近平新时代中国特色社会主义思想';
  // if (code == '3937') return '3937_思想道德修养与法律基础';
  // if (code == '4374') return '4374_思想道德修养与法律基础';
  // if (code == '4491') return '4491_思想道德修养与法律基础';
  // if (code == '4614') return '4614_思想道德修养与法律基础';
  // if (code == '4612') return '4612_思想道德修养与法律基础';
  // if (code == '3944') return '3944_中国近现代史纲要';
  // if (code == '4373') return '4373_中国近现代史纲要';
  // if (code == '4613') return '4613_中国近现代史纲要';
  // if (code == '4615') return '4615_中国近现代史纲要';
  // if (code == '4492') return '4492_中国近现代史纲要';
  // if (code == '4387') return '4387_中国特色社会主义理论体系概论';
  // if (code == '4628') return '4628_国家开放大学学习指南'
  // if (code == '4749') return '4749_国家开放大学学习指南'
  // // heilongjiang
  // if (code == '4498') return '4498_中国特色社会主义理论体系概论';

  // 获取课程名称  by code
  let filename = './db/subjects/indexdb.json'
  let data = fs.readFileSync(filename, "utf-8")
  let res = JSON.parse(data);

  return res[code]

}

async function handle503( page, url, delay=10000){
  let title = await page.title();

  let isOK = true
  console.log( 'handle503 title=', title)
  if( title.startsWith( '503 Service')){
    console.error("503 延时5秒开始, 防止出现503, 服务器响应问题" )
    await  page.waitForFunction( function(delay){
      return new Promise((resolve, reject) => {
        console.error("503 延时5秒" )
        setTimeout(()=>{ resolve(true)}, delay);
      })
    }, {}, delay);
    console.log('handle 503 get url again');
     
    // 
    if( url ){
      await page.goto(url) 

    }else{
      // post request, 没有url， 只能重新reload
      await page.reload() 
    }
    console.log('handle 503 get url again', url);
    isOK = false
  }
  return isOK
}


async function handleDelay( delay = 500 ){

   
    return new Promise((resolve, reject) => {
      console.error(`  延时 ${delay} ms` )
      setTimeout(()=>{ resolve(true)}, delay);
    })
   
}



module.exports = {
  getCourseNameByCode,
  scrollToBottom,
  scrollToCenter,
  playVideo,
  handle503,
  handleDelay
}
