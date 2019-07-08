const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const {
  scrollToBottom,
  playVideo
} = require('./util')
const fs = require('fs');
// const { getVerifyCode }  = require('./ocr')


class Bot {

  constructor(driver) {
    this.status = [];
    this.driver = driver
  }



  async handleCouseLinks() {
    let driver = this.driver
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



  async login(username, password) {
    let driver = this.driver
    await driver.get('http://sso.ouchn.cn/Passport/Login?ru=http%3a%2f%2fshome.ouchn.cn%2f&to=-2&aid=6&ip=100.125.68.16&lou=http%3a%2f%2fshome.ouchn.cn%2f6%2fMCSAuthenticateLogOff.axd&sf=4968909290f6c894');
    await driver.findElement(By.id('username')).sendKeys(username);
    await driver.findElement(By.id('password')).sendKeys(password);
    // await handleVerifyCode(driver)
    await driver.wait(until.titleIs('学生空间'), 1000000);
    await driver.findElement(By.className('jbox-close')).click();
    console.log('Login Success!!!');

  }

  async learnCourse(filename) {
    let driver = this.driver

    await fs.readFile(filename, "utf-8", async (error, data) => {
      if (error) return console.log(error.message);
      var res = JSON.parse(data);
      if (res != null) {
        let score = res.score;
        this.status = res.status;

        for (let i = 0; i < this.status.length; i++) {
          let course = this.status[i];
          let isFinish = course.isFinish;
          if (isFinish == '未完成') {
            let url = course.url
            let title = course.title
            if (!url.includes('resource')) {
              if (title.includes('视频')) {
                await this.watchVideo(course.id)
              } else {
                await this.readText(course.id)
              }
            }
          }
        }
      } else {
        console.log('can not read log.json');
      }
    })
  }



  async learnModule(code) {

    /// text, video, quiz,
    /// do work

  }


  async readText(code) {
    console.log('==================readText=================');
    var driver = this.driver
    let status = this.status

    for (let i = 0; i < status.length; i++) {
      let course = status[i];
      let isFinish = course.isFinish;
      let id = course.id

      if (isFinish == '未完成' && id == code) {
        let url = course.url
        let title = course.title
        if (!url.includes('resource') && !title.includes('视频')) {
          console.log('id-----:', id);
          await driver.get(url);
          console.log('reading ', title);
          await driver.wait(scrollToBottom(driver), 100000000);
          console.log('read finish', title);
        }
      }
    }
  }

  async watchVideo(code) {
    console.log('==================watchVideo=================');

    let driver = this.driver
    let status = this.status

    for (let i = 0; i < status.length; i++) {
      let course = status[i];
      let isFinish = course.isFinish;
      let id = course.id

      if (isFinish == '未完成' && id == code) {
        console.log('course-----:', course);
        let url = course.url
        let title = course.title
        if (!url.includes('resource') && title.includes('视频')) {
          await driver.get(url);
          let canvas = await driver.findElement(By.tagName('canvas'))
          console.log('this video is start');
          await driver.wait(playVideo(driver, canvas), 100000000);
          console.log('this video is done');
        }
      }
    }
  }

  async prepareForLearn() {
    let driver = this.driver
    let mainHandle = await driver.getWindowHandle()
    let links = await getCousesLinks(driver);
    let hrefpromises = links.map(async (a) => {
      return await a.getAttribute('href')
    })

    let hrefs = await Promise.all(hrefpromises)
    console.log('all tab opened, hrefs', hrefs);
    let handles = await driver.getAllWindowHandles()
    console.log("getAllWindowHandles", handles)

    for (let i = 0; i < handles.length; i++) {
      let handle = handles[i]
      console.log("mainHandle", mainHandle, "handle = ", handle)
      if (mainHandle != handle) {
        let locator = driver.switchTo()
        await locator.window(handle)
      }
    }
  }


  async handleVerifyCode(driver) {

    let code = await getVerifyCode(driver)
    let text = /[\w]+/.exec(code.text).toString()
    console.log("text=", text)
    await driver.findElement(By.id('checkCode')).sendKeys(text);
    await driver.findElement(By.id('btnLogin')).click()

  }

}

function learnModule(code) {

  /// text, video, quiz,
  /// do work

}
async function handleVerifyCode(driver) {

  let code = await getVerifyCode(driver)
  let text = /[\w]+/.exec(code.text).toString()
  console.log("text=", text)
  await driver.findElement(By.id('checkCode')).sendKeys(text);
  await driver.findElement(By.id('btnLogin')).click()

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
  await driver.wait(until.elementLocated(By.className('progress-bar')), 10000);

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
  console.log('json=====:', json);
  let filename = './log_' + class_id + '.json'
  fs.writeFile(filename, JSON.stringify(json), (err) => {
    if (err) throw err;
    console.log('文件已被保存');
  });
  await driver.get(url)
  title = await driver.getTitle()
  console.log(" title2= ", title);

  console.log(" handleCouseMaoGai ")

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


module.exports = {
  Bot
}
