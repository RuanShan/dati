// import util from './src/util.js'
const {
  scrollToBottom,
  playVideo
} = require('./util.js');

const {
  Bot,
  handleVerifyCode
} = require('./bot.js');

const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');

async function handleCommandProfile(couseCode) {

  let driver = await new Builder().forBrowser('chrome').build();

  let bot = new Bot(driver)
  let filename = './log_3649.json'
  let code = '464728'
  console.log(" bot doing profile a couse")
  await bot.login('1821001452683', '19771229')
  await bot.prepareForLearn()
  // await bot.handleCouseLinks()
  // await bot.readText(code)
  // await bot.watchVideo(code)
  await bot.learnCourse(filename)

}

async function handleCommandModule(moduleCode) {

  let driver = await new Builder().forBrowser('chrome').build();

  let bot = new Bot(driver)
  let filename = './log_3649.json'
  console.log(" bot doing profile a couse")
  await bot.login('1821001452683', '19771229')
  // await bot.handleCouseLinks()
  await bot.prepareForLearn()
  // await bot.readText(moduleCode)
  await bot.watchVideo(moduleCode)
  // await bot.learnCourse(filename)

}

//
// (async function example() {
//   let driver = await new Builder().forBrowser('chrome').build();
//   //driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS);
//
//   try {
//     await driver.get('http://sso.ouchn.cn/Passport/Login?ru=http%3a%2f%2fshome.ouchn.cn%2f&to=-2&aid=6&ip=100.125.68.16&lou=http%3a%2f%2fshome.ouchn.cn%2f6%2fMCSAuthenticateLogOff.axd&sf=4968909290f6c894');
//     await driver.findElement(By.id('username')).sendKeys('1821001452683');
//     await driver.findElement(By.id('password')).sendKeys('19771229');
//     // await handleVerifyCode(driver)
//     await driver.wait(until.titleIs('学生空间'), 1000000);
//     await driver.findElement(By.className('jbox-close')).click();
//     console.log('Login Success!!!');
//     await handleCouseLinks(driver)
//
//   } finally {
//     // await driver.quit();
//   }
// })();



async function getCousesLinks(driver) {
  // div id = LearningCourseDiv
  // text = 进入课程
  let div = await driver.findElement(By.id('LearningCourseDiv'));
  let links = await div.findElements(By.linkText('进入课程'));
  // links.forEach(async (a)=>{
  //   await a.click()
  //   // generate a.href
  // })

  links[5].click()
  return links

}

async function handleCouseLinks(driver) {
  let mainHandle = await driver.getWindowHandle()
  let links = await getCousesLinks(driver);
  let promises = links.map(async (a) => {
    return await a.getAttribute('href')
  })

  let hrefs = await Promise.all(promises)
  console.log('all tab opened, hrefs', hrefs);
  let handles = await driver.getAllWindowHandles()
  console.log("getAllWindowHandles", handles)

  for (let i = 0; i < handles.length; i++) {
    let handle = handles[i]
    console.log("mainHandle", mainHandle, "handle = ", handle)
    if (mainHandle != handle) {
      let locator = driver.switchTo()
      await locator.window(handle)
      await handleCouse(driver)
    }
  }

}

async function handleCouse(driver) {
  // 毛泽东思想和中国特色社会主义理论体系概论, 统计学原理   思想道德修养与法律基础  管理学基础
  //  经济数学基础  计算机应用基础

  console.log(" tab.title0 ")
  let title = await driver.getTitle()
  console.log(" tab.title1 ", title)
  console.log('毛泽东思想和中国特色社会主义理论体系概论', title.includes('毛泽东思想'));
  // if (title.includes('毛泽东思想')) {
  await handleCouseMaoGai(driver)
  // }
}

async function handleCouseMaoGai(driver) {
  let progressPath = "//div[@class='progress-bar']/span"
  let sectionl1Path = "//ul[@class='flexsections flexsections-level-1']/li"
  let sectionl2Path = "//ul[@class='flexsections flexsections-level-2']/li"
  let sectionl2Css = "li.activity"
  let sectionl2LinkCss = "a"

  let url = await driver.getCurrentUrl()

  let levelOne = await driver.findElements(By.xpath(sectionl1Path))
  let progressContainer = await driver.findElement(By.xpath(progressPath))
  let progress = await progressContainer.getText()
  console.log(`毛泽东思想和中国特色社会主义理论体系概论  ${progress}`)

  let incompleted = []
  let status = []
  let score = {
    progress: progress
  }
  // for (let i = 0; i < levelOne.length; i++) {
  //   let a = levelOne[i]
  //   let text = await a.getText()
  //   let id = await a.getAttribute('id')
  //   console.log(`levelOne.text ${i} ${id} ${text}`)
  //   // li.activity url modtype_url| activity page modtype_page
  //   let levelTwo = await a.findElements(By.css(sectionl2Css))
  //   let b = levelTwo[0]
  //   let isDisplayed = await b.isDisplayed()
  //   if (!isDisplayed) {
  //     // 显示下级内容
  //     a.click()
  //   }
  //
  //   for (let j = 0; j < levelTwo.length; j++) {
  //     let b = levelTwo[j]
  //     let text = await b.getText()
  //     let id = await b.getAttribute('id')
  //     let link = await b.findElement(By.css(sectionl2LinkCss))
  //     let href = await link.getAttribute('href')
  //     let img = await b.findElements(By.tagName('img'))
  //     let alt = await img[1].getAttribute('alt')
  //     let course = {
  //       title: text,
  //       isFinish: alt.substring(0, 3),
  //       url: href
  //     }
  //     status.push(course)
  //     if (alt.startsWith("未完成")) {
  //       console.log(`levelTwo.text ${j} ${id} ${text} ${href} ${alt}`)
  //       // incompleted.push({
  //       //   text,
  //       //   href
  //       // })
  //     }
  //   }
  //
  // }
  incompleted.push({
    text: '视频1：一代伟人走向马克思主义 网页地址',
    href: 'http://liaoning.ouchn.cn/mod/url/view.php?id=464729'
  })
  // let json = {
  //   score: score,
  //   status: status
  // }
  // console.log('json=====:', json);
  // const fs = require('fs');
  // fs.writeFile('./log.json', JSON.stringify(json), (err) => {
  //   if (err) throw err;
  //   console.log('文件已被保存');
  // });
  console.log("incompleted= ", incompleted)
  // for (let k = 0; k < incompleted.length; k++) {
  //   let work = incompleted[k]
  //   let href = work.href
  //   if (!href.includes('resource')) {
  //     await driver.get(href);
  //   }
  //   let title = await driver.getTitle()
  //   console.log("title============== ", title);
  //   if (work.text.includes('视频')) {
  //     // let isFinish = false
  //
  //
  //     let canvas = await driver.findElement(By.tagName('canvas'))
  //
  //     // await playVideo(video,canvas).then(data=>{
  //     //   isFinish = true
  //     // })
  //     await driver.wait(playVideo(driver, canvas), 100000000);
  //     console.log('this video is done');
  //
  //   } else {
  //     console.log('this is a txt');
  //     await scrollToBottom(driver)
  //   }
  //
  // }
  // readText(driver)
  watchVideo(driver)
  await driver.get(url)
  title = await driver.getTitle()
  console.log(" title2= ", title);

  console.log(" handleCouseMaoGai ")

}




async function readText(driver) {
  console.log('==================readText=================');
  const fs = require('fs');

  await fs.readFile("./log.json", "utf-8", async function(error, data) {
    if (error) return console.log(error.message);
    var res = JSON.parse(data);
    console.log("res----:" + res);
    if (res != null) {
      let score = res.score;
      let status = res.status;
      console.log('status----:', status.length);

      for (let i = 0; i < status.length; i++) {
        let course = status[i];
        console.log('course--:', course);
        let isFinish = course.isFinish;

        if (isFinish == '未完成') {
          let url = course.url
          let title = course.title
          if (!url.includes('resource') && !title.includes('视频')) {
            await driver.get(url);
            console.log('reading ', title);
            await scrollToBottom(driver)
            console.log('read finish', title);
          }
        }
      }
    } else {
      console.log('can not read log.json');
    }
  })

}


async function watchVideo(driver) {
  console.log('=====================watchVideo====================');
  const fs = require('fs');
  let res = null;
  fs.readFile("./log.json", "utf-8", function(error, data) {
    if (error) return console.log(error.message);
    console.log("data----:" + data);
    res = JSON.parse(data);
  });
  if (res != null) {
    let score = res.score;
    let status = res.status;

    for (let i = 0; i < status.length; i++) {
      let course = status[i];
      let isFinish = course.isFinish;
      let title = course.title

      if (isFinish == '未完成' && title.includes('视频')) {
        let url = course.url
        if (!url.includes('resource') && title.includes('视频')) {
          await driver.get(url);
          let canvas = await driver.findElement(By.tagName('canvas'))
          await driver.wait(playVideo(driver, canvas), 100000000);
          console.log('this video is done');
        }
      }
    }
  } else {
    console.log('can not read log.json');
  }
}


module.exports = {
  handleCommandProfile,
  handleCommandModule
}
