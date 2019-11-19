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
    let username = '1934001474084'; // 1934001474084
    let password = '19930902'       // 19930902
    await login(driver, username, password)
    await handleCouseLinks(driver)
    // await readText(driver,code)
    // await watchVideo(driver,code)
    //await learnCourse(driver, filename)
  } finally {
    // await driver.quit();
  }
})();

async function login(driver, username, password) {

  await driver.get('http://passport.ouchn.cn/Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Dstudentspace%26redirect_uri%3Dhttp%253A%252F%252Fstudent.ouchn.cn%252F%2523%252Fsignin-oidc%2523%26response_type%3Did_token%2520token%26scope%3Dopenid%2520profile%2520ouchnuser%2520ouchnstudentspaceapi%26state%3Df2b1c4eebd354996ab8f0c3b618f39d1%26nonce%3D044e6125331b4db298c6acf33b1058dd');
  await driver.findElement(By.id('username')).sendKeys(username);
  await driver.findElement(By.id('password')).sendKeys(password);
  //await handleVerifyCode(driver)
  //
  let loginButton = await driver.findElement(By.css(".login-form button[value='login']"));
  loginButton.click();
  await driver.wait(until.titleContains('学生空间'), 100000);
  await driver.get('http://student.ouchn.cn/')
  //await driver.findElement(By.className('jbox-close')).click();
  console.log('Login Success!!!');

}



async function getCousesLinks(driver) {
  // div id = LearningCourseDiv
  // text = 进入课程
  // 等待 zaixuekecheng dom生成
  await driver.wait(until.elementLocated(By.id('zaixuekecheng')));
  let div = await driver.findElement(By.id('zaixuekecheng'));
  let links = await div.findElements(By.xpath('//button'));
  links.forEach(async (a)=>{
    await a.click()
    // generate a.href
  })

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
  if (title.includes('毛泽东思想')) {
    console.log('毛泽东思想和中国特色社会主义理论体系概论', title.includes('毛泽东思想'));
    await handleCouseMaoGai(driver)
  }else{
    console.log("待添加课程：", title)    
  }
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
      console.log(`levelTwo.text0 ${j} ${text} `)
      let id = await b.getAttribute('id')

      let imgs = await b.findElements(By.tagName('img'))
      let alt = "未完成"
      let href = ''
      if( imgs.length>=2){
        // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
        alt = await imgs[1].getAttribute('alt')
        let link = await b.findElement(By.css(sectionl2LinkCss))
        href = await link.getAttribute('href')
      }
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
