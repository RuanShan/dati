// import util from './src/util.js'
const {
  scrollToBottom,
  playVideo
} = require('./src/util.js');

const {
  handleVerifyCode
} = require('./src/bot.js');

const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');


(async function example() {
  let driver = await new Builder().forBrowser('chrome').build();
  //driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS);
  let filename = './log_3649.json'
  let code = '464729'

  try {
    let username = '1821001452683';
    let password = '19771229'
    await login(driver, username, password)
    await handleCouseLinks(driver)
    // await readText(driver,code)
    // await watchVideo(driver,code)
    await learnCourse(driver, filename)
  } finally {
    // await driver.quit();
  }
})();

async function login(driver, username, password) {

  await driver.get('http://sso.ouchn.cn/Passport/Login?ru=http%3a%2f%2fshome.ouchn.cn%2f&to=-2&aid=6&ip=100.125.68.16&lou=http%3a%2f%2fshome.ouchn.cn%2f6%2fMCSAuthenticateLogOff.axd&sf=4968909290f6c894');
  await driver.findElement(By.id('username')).sendKeys(username);
  await driver.findElement(By.id('password')).sendKeys(password);
  await handleVerifyCode(driver)
  await driver.wait(until.titleIs('学生空间'), 1000000);
  await driver.findElement(By.className('jbox-close')).click();
  console.log('Login Success!!!');

}



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
  let hrefpromises = links.map(async (a) => {
    return await a.getAttribute('href')
  })
  let coursecodepromises = links.map(async (a) => {
    return await a.getAttribute('coursecode')
  })

  let hrefs = await Promise.all(hrefpromises)
  let coursecodes = await Promise.all(coursecodepromises)
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
  console.log('url----------------:', url);
  let class_id = url.substring(url.indexOf('id=') + 3);
  console.log('class_id----:', class_id);

  let levelOne = await driver.findElements(By.xpath(sectionl1Path))
  let progressContainer = await driver.findElement(By.xpath(progressPath))
  let progress = await progressContainer.getText()
  console.log(`毛泽东思想和中国特色社会主义理论体系概论  ${progress}`)

  let status = []
  let classinfo = {
    class_id: class_id,
    progress: progress
  }
  for (let i = 0; i < levelOne.length; i++) {
    let a = levelOne[i]
    let text = await a.getText()
    let id = await a.getAttribute('id')
    console.log(`levelOne.text ${i} ${id} ${text}`)
    let levelTwo = await a.findElements(By.css(sectionl2Css))
    let b = levelTwo[0]
    let isDisplayed = await b.isDisplayed()
    if (!isDisplayed) {
      // 显示下级内容
      a.click()
    }

    for (let j = 0; j < levelTwo.length; j++) {
      let b = levelTwo[j]
      let text = await b.getText()
      let id = await b.getAttribute('id')
      let link = await b.findElement(By.css(sectionl2LinkCss))
      let href = await link.getAttribute('href')
      let img = await b.findElements(By.tagName('img'))
      let alt = await img[1].getAttribute('alt')
      let course = {
        title: text,
        isFinish: alt.substring(0, 3),
        url: href,
        id: id.substring(7)
      }
      status.push(course)
      if (alt.startsWith("未完成")) {
        console.log(`levelTwo.text ${j} ${id} ${text} ${href} ${alt}`)
      }
    }

  }
  let json = {
    score: classinfo,
    status: status
  }
  // console.log('json=====:', json);
  // const fs = require('fs');
  // let filename = './log_' + class_id + '.json'
  // fs.writeFile(filename, JSON.stringify(json), (err) => {
  //   if (err) throw err;
  //   console.log('文件已被保存');
  // });
  await driver.get(url)
  title = await driver.getTitle()
  console.log(" title2= ", title);

  console.log(" handleCouseMaoGai ")

}
async function readText(driver, code) {
  console.log('==================readText=================');
  const fs = require('fs');

  await fs.readFile("./log.json", "utf-8", async function(error, data) {
    if (error) return console.log(error.message);
    var res = JSON.parse(data);
    if (res != null) {
      let score = res.score;
      let status = res.status;
      console.log('status----:', status.length);

      for (let i = 0; i < status.length; i++) {
        let course = status[i];
        let isFinish = course.isFinish;
        let id = course.id

        if (isFinish == '未完成' && id == code) {
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
async function watchVideo(driver, code) {
  console.log('==================watchVideo=================');
  const fs = require('fs');

  await fs.readFile("./log.json", "utf-8", async function(error, data) {
    if (error) return console.log(error.message);
    var res = JSON.parse(data);
    if (res != null) {
      let score = res.score;
      let status = res.status;

      for (let i = 0; i < status.length; i++) {
        let course = status[i];
        let isFinish = course.isFinish;
        let id = course.id

        if (isFinish == '未完成' && id == code) {
          console.log('course-----:',course);
          let url = course.url
          let title = course.title
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
  })
}


async function learnCourse(driver, filename) {
  const fs = require('fs');

  await fs.readFile(filename, "utf-8", async function(error, data) {
    if (error) return console.log(error.message);
    var res = JSON.parse(data);
    if (res != null) {
      let score = res.score;
      let status = res.status;

      for (let i = 0; i < status.length; i++) {
        let course = status[i];
        let isFinish = course.isFinish;
        if (isFinish == '未完成') {
          let url = course.url
          let title = course.title
          if (!url.includes('resource')) {
            if (title.includes('视频')) {
              await watchVideo(driver, course.id)
            } else {
              // await readText(driver, course.id)
            }
          }
        }
      }
    } else {
      console.log('can not read log.json');
    }
  })
}
