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
const URL = require('url');

const log4js = require('log4js');
log4js.configure({
  appenders: {
    app: {
      type: 'file',
      filename: 'app.log'
    },
    console: {
      type: "stdout"
    }
  },
  categories: {
    default: {
      appenders: ['app', 'console'],
      level: 'debug'
    }
  }
});

const LessionStateEnum = {
  initial: '未完成',
  completed: '完成'
}
const logger = log4js.getLogger();

// const { getVerifyCode }  = require('./ocr')
// 每个学生来自不同地方，可能url不同
const CouseUrlMap = {
  // '4125': 'http://anhui.ouchn.cn/course/view.php?id=4125', // 国家开放大学学习指南
  // '4257': 'http://anhui.ouchn.cn/course/view.php?id=4257', // 思想道德修养与法律基础
  // '3833': 'http://anhui.ouchn.cn/course/view.php?id=3833', // 习近平新时代中国特色社会主义思想
  // '4255': 'http://anhui.ouchn.cn/course/view.php?id=4255' // 毛泽东思想和中国特色社会主义理论体系概论
}

const { parseCouseMaoGai, handleMaoGaiQuiz } = require('./couses/maogai')
const { parseCouseZhiNan, handleZhiNanQuiz } = require('./couses/zhinan')
const { parseCouseSiXiu, handleSiXiuQuiz } = require('./couses/sixiu')
const { parseCouseMao, handleMaoQuiz } = require('./couses/mao')

class Bot {

  constructor(driver ) {
    // if( !user || !password){
    //   throw  new Error( "用户名和密码是必须的")
    //
    // }
    this.mainHandle = null;
    this.status = [];
    this.driver = driver;
    this.username = ''
    this.password = ''
    this.couseCode = '' // 当前课程代码
    this.couseUrl = '' // 当前课程URL
    this.recursiveCount = 0 // 课程学习递归调用次数
    this.couseInfo = {
      score:{progress: 0},
      status: []
    } // 课程学习状态
  }

  async getLog(username, couseCode) {
    let that = this
    that.couseCode = couseCode
    let filename = await this.getCouseJsonPath(couseCode)
    let data = fs.readFileSync(filename, "utf-8")
    if (data != null) {

      let res = JSON.parse(data);
      that.couseInfo= res;
    } else {
      logger.error(`无法读取课程数据文件 ${filename}`);
    }

    return filename
  }

  // async handleCouseLinks(couseCode) {
  //   let driver = this.driver
  //   let mainHandle = await driver.getWindowHandle()
  //   let links = await getCousesLinks(driver);
  //
  //   console.log('all tab opened, hrefs', hrefs);
  //   let handles = await driver.getAllWindowHandles()
  //   console.log("getAllWindowHandles", handles)
  //
  //   for (let i = 0; i < handles.length; i++) {
  //     let handle = handles[i]
  //     console.log("mainHandle", mainHandle, "handle = ", handle)
  //     if (mainHandle != handle) {
  //       let locator = driver.switchTo()
  //       await locator.window(handle)
  //       await handleCouse(driver)
  //     }
  //   }
  //
  // }



  async login(username, password) {

    this.username = username
    this.password = password
    let driver = this.driver

    await driver.get('http://passport.ouchn.cn/Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Dstudentspace%26redirect_uri%3Dhttp%253A%252F%252Fstudent.ouchn.cn%252F%2523%252Fsignin-oidc%2523%26response_type%3Did_token%2520token%26scope%3Dopenid%2520profile%2520ouchnuser%2520ouchnstudentspaceapi%26state%3Df2b1c4eebd354996ab8f0c3b618f39d1%26nonce%3D044e6125331b4db298c6acf33b1058dd');
    await driver.findElement(By.id('username')).sendKeys(username);
    await driver.findElement(By.id('password')).sendKeys(password);
    //await handleVerifyCode(driver)
    let loginButton = await driver.findElement(By.css(".login-form button[value='login']"));
    loginButton.click();
    await driver.wait(until.titleContains('学生空间'), 100000);
    await driver.get('http://student.ouchn.cn/')
    //await driver.findElement(By.className('jbox-close')).click();
    logger.info('Login Success!!!');
  }

  async learnCourse() {
    this.recursiveCount += 1
    let driver = this.driver
    let moduleStatus = this.couseInfo.status

    for (let i = 0; i < moduleStatus.length; i++) {
      let lession = moduleStatus[i];
      let isFinish = lession.isFinish;
      let url = lession.url
      let type = lession.type
      if (url.length == 0) {
        continue
      }
      if (isFinish == '未完成') {
        let title = lession.title
        logger.info(`学习小节${title} url=${url}`)
        let done = false
        if ( type== 'video'  ) {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          await this.watchVideo(lession)
          isFinish = '完成'
        } else if (url.includes('/mod/page/view')) {
          await this.readText(lession)
          isFinish = '完成'
        } else if (url.includes('/mod/quiz/view')) {
          await this.goQuiz(lession,lession.position)
          isFinish = '完成'
        } else {
          logger.error(`无法识别的课程url =${url}`)
        }
        // 每学完一课，更新一下数据文件
        lession.isFinish = isFinish
        if( isFinish== '完成'){
          this.saveCouseJson(this.couseCode)
        }
      }
    }
    //
    let nourlModules = moduleStatus.filter((moduleStatus) => {
      return moduleStatus.url.length == 0 && moduleStatus.isFinish == '未完成'
    })
    if (nourlModules.length > 0) {
      // 重新生成数据，重新学习，主要是学习视频，有些小节视频较多
      if (this.recursiveCount < 15) {
        logger.info(`课程${ this.couseCode}递归了${this.recursiveCount}次，还没有完成。`)
        await this.profileCouse( )
        await this.learnCourse()
      } else {
        logger.error(`课程${ this.couseCode}递归了15次，还没有完成。`)
      }
    }
  }


  async learnModule(moduleCode) {
    logger.info(`课程${ this.couseCode} 小节 ${moduleCode} 开始学习。`)
    let driver = this.driver
    let moduleStatus = this.couseInfo.status

    for (let i = 0; i < moduleStatus.length; i++) {
      let lession = moduleStatus[i];
      let title = lession.title
      let isFinish = lession.isFinish;
      let type = lession.type
      let url = lession.url
      if (url.length == 0) {
        console.debug(`小节 ${title} 没有 url`);
        continue
      }
      if (isFinish == '未完成' && lession.id == moduleCode) {
        // 根据url判断类型
        // 视频|外部文章：mod/url/view
        // 文本: mod/page/view
        // 专题测验：mod/quiz/view
        // 考核说明：mod/resource/view, 重定向到pdf
        console.debug(`类型 ${type} 小节 ${title} `);
        if ( type== 'video'  ) {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          await this.watchVideo(lession)
        } else if (url.includes('/mod/page/view')) {
          await this.readText(lession)
        } else if (url.includes('/mod/quiz/view')) {
          await this.goQuiz(lession,lession.position)
        } else {
          logger.error(`无法识别的课程url =${url}`)
        }
      }
      //  logger.error(`无法识别的小节代码 =${moduleCode}`)


    }

  }


  async readText(lession) {
    var driver = this.driver


    let isFinish = lession.isFinish;
    let id = lession.id

    if (isFinish == '未完成') {
      let url = lession.url
      let title = lession.title

      await driver.get(url);
      console.debug('reading ', title);
      await driver.wait(scrollToBottom(driver), 100000000);
      console.debug('read finish', title);

    }

  }

  async watchVideo(lession) {
    console.log('==================watchVideo=================');

    let driver = this.driver
    let isFinish = lession.isFinish;
    let id = lession.id

    if (isFinish == '未完成') {
      console.log('course-----:', lession);
      let url = lession.url
      let title = lession.title
      await driver.get(url);
      let canvas = await driver.findElement(By.tagName('canvas'))
      console.log('this video is start');
      await driver.wait(playVideo(driver, canvas), 100000000);
      console.log('this video is done');
    }

  }

  async goQuiz(lession,num){
    let driver = this.driver
    let isFinish = lession.isFinish;
    let id = lession.id

    if (isFinish == '未完成') {
      console.log('course-----:', lession);
      let url = lession.url
      let title = lession.title
      console.log('this.couseCode---:',this.couseCode);
      if (this.couseCode == '3833') {
        await handleMaoGaiQuiz(driver, url, id ,num,true)
      }else if(this.couseCode == '4125'){
        await handleZhiNanQuiz(driver, url, id ,num,true)
      }else if(this.couseCode == '4257'){
        await handleSiXiuQuiz(driver, url, id ,num,true)
      }else if(this.couseCode == '4255'){
        await handleMaoQuiz(driver, url, id ,num,true)
      }
      console.log('this quiz is done');
    }


  }
  // 当前在主页，打开所有课程页面
  // 确定当前课程的url 和 code
  //需要点击一下 ‘进入学习’，获得访问权限 地区.ouchn.cn/course
  async prepareForLearn(couseCode) {
    let driver = this.driver
    let mainHandle = await driver.getWindowHandle()
    let links = await this.getCousesLinks(driver);
    for(let i=0;i<links.length;i++){
      let a = links[i];
      let displayed = await a.isDisplayed()
      console.log(" isDisplayed ", displayed)
      if (displayed) {
        await a.click()
        // 打开课程窗口
      }
    }
    // links.forEach(async (a) => {
    //   let displayed = await a.isDisplayed()
    //   console.log(" isDisplayed ", displayed)
    //   if (displayed) {
    //     await a.click()
    //     // 打开课程窗口
    //   }
    // })
    console.log('all tab opened0, links', links.length);

    await driver.wait(async () => {
      let handles = await driver.getAllWindowHandles()
      return handles.length == links.length
    }, 30000, `错误：${links.length}课程窗口没有打开`)

    console.log('all tab opened2, links', couseCode);
    let handles = await driver.getAllWindowHandles()
    console.log("getAllWindowHandles", handles)
    let url = ''
    for (let i = 0; i < handles.length; i++) {
      let handle = handles[i]
      console.log("mainHandle", i, mainHandle, "handle = ", handle)
      if (mainHandle != handle) {
        let locator = driver.switchTo()
        await locator.window(handle)
        let url = await driver.getCurrentUrl()
        let parsedUrl = URL.parse(url, true)
        console.debug("parsed= ",parsedUrl);
        if( parsedUrl.query['id']){
          CouseUrlMap[ parsedUrl.query['id']] = url
        }
        // 如果找到当前这门课的窗口
        if (couseCode && url.indexOf(couseCode) >= 0) {
          this.couseUrl = url
          this.couseCode = couseCode
          break;
        }
      }
    }
    console.log("current window url=", url)
    this.recursiveCount = 0
  }


  // async handleVerifyCode(driver) {
  //
  //   let code = await getVerifyCode(driver)
  //   let text = /[\w]+/.exec(code.text).toString()
  //   console.log("text=", text)
  //   await driver.findElement(By.id('checkCode')).sendKeys(text);
  //   await driver.findElement(By.id('btnLogin')).click()
  //
  // }
  // 生成某一门课的db log，需要知道这门课的url
  async profileCouse(couseCode) {
    // 毛泽东思想和中国特色社会主义理论体系概论, 统计学原理   思想道德修养与法律基础  管理学基础
    //  经济数学基础  计算机应用基础
    this.couseCode = couseCode || this.couseCode

    let url = CouseUrlMap[this.couseCode]
    if (url) {
      // 第二次递归时，必须先访问url
      let startAt = new Date()
      await this.driver.get(url)
      let title = await this.driver.getTitle()
      console.log(" tab.title1 ", title, this.couseCode, typeof(this.couseCode))
      if (this.couseCode == '4255') {
        this.couseInfo = await parseCouseMaoGai( this.driver )
      } else if (this.couseCode == '4125') {
        this.couseInfo = await parseCouseZhiNan( this.driver )
      } else if (this.couseCode == '3833') {
        this.couseInfo = await parseCouseMaoGai( this.driver )
      } else if (this.couseCode == '4257') {
        this.couseInfo = await parseCouseMaoGai( this.driver )
      }

      let position = 0;
      for(let i=0;i<this.couseInfo.status.length;i++){
        if(this.couseInfo.status[i].type == 'quiz'){
          this.couseInfo.status[i].position = position;
          position++;
        }
      }

      let endAt = new Date()
      this.couseInfo.score.startAt = startAt
      this.couseInfo.score.endAt = endAt
      this.saveCouseJson(this.couseCode)
    } else {
      console.debug(`课程代码 ${ this.couseCode} 找不到课程url`);
    }
  }

  // async handleCouseMaoGai() {
  //   let driver = this.driver
  //   let progressPath = "//div[@class='progress-bar']/span"
  //   let sectionl1Path = "//ul[@class='flexsections flexsections-level-1']/li"
  //   let sectionl2Path = "//ul[@class='flexsections flexsections-level-2']/li"
  //   let sectionl2Css = "li.activity"
  //   let sectionl2LinkCss = "a"
  //   await driver.wait(until.elementLocated(By.className('progress-bar')), 10000);
  //
  //   let url = await driver.getCurrentUrl()
  //   console.log('url----------------:', url);
  //   let classId = url.substring(url.indexOf('id=') + 3);
  //   console.log('classId----:', classId);
  //
  //
  //   let levelOne = await driver.findElements(By.xpath(sectionl1Path))
  //   let progressContainer = await driver.findElement(By.xpath(progressPath))
  //   let progress = await progressContainer.getText()
  //
  //   let status = []
  //   let classinfo = {
  //     url: url,
  //     classId: classId,
  //     progress: progress
  //   }
  //   for (let i = 0; i < levelOne.length; i++) {
  //     let a = levelOne[i]
  //     let text = await a.getText()
  //     let id = await a.getAttribute('id')
  //     console.log(`levelOne.text ${i} ${id} ${text}`)
  //     let levelTwo = await a.findElements(By.css(sectionl2Css))
  //     if (levelTwo.length == 0) {
  //       console.log(`levelOne.text ${i} ${id} ${text} 没有内容。`)
  //       continue
  //     }
  //     let b = levelTwo[0]
  //
  //     let isDisplayed = await b.isDisplayed()
  //     if (!isDisplayed) {
  //       // 显示下级内容
  //       a.click()
  //     }
  //
  //     for (let j = 0; j < levelTwo.length; j++) {
  //       let b = levelTwo[j]
  //       let text = await b.getText()
  //       let id = await b.getAttribute('id')
  //       let imgs = await b.findElements(By.tagName('img'))
  //       let alt = "未完成"
  //       let href = ''
  //       if (imgs.length >= 2) {
  //         // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
  //         alt = await imgs[1].getAttribute('alt')
  //         let link = await b.findElement(By.css(sectionl2LinkCss))
  //         href = await link.getAttribute('href')
  //       }
  //       let course = {
  //         title: text,
  //         isFinish: alt.substring(0, 3),
  //         url: href,
  //         id: id.substring(7)
  //       }
  //       status.push(course)
  //       if (alt.startsWith("未完成")) {
  //         console.log(`levelTwo.text ${j} ${id} ${text} ${href} ${alt}`)
  //       }
  //     }
  //   }
  //   this.couseInfo = {
  //     score: classinfo,
  //     status: status
  //   }
  //
  //   this.saveCouseJson(classId)
  //   console.log("end handleCouseMaoGai ")
  // }

  async getCousesLinks(driver) {
    // 等待 zaixuekecheng dom生成
    await driver.wait(until.elementLocated(By.id('zaixuekecheng')));
    let div = await driver.findElement(By.id('zaixuekecheng'));
    let links = await div.findElements(By.xpath('//button'));

    // 不知因为什么原因会多一个, 可能是angular生成的隐藏button对象，
    return links
  }

  async saveCouseJson(classId) {
    let filename = await this.getCouseJsonPath(classId)
    console.log('this.couseInfo----:',this.couseInfo);
    fs.writeFile(filename, JSON.stringify(this.couseInfo), (err) => {
      if (err) throw err;
      console.log(`文件已被保存:${filename}`);
    });
  }

  async getCouseJsonPath(couseCode) {
    let dir = './db/students'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    let filename = dir + '/' + this.username + '_' + couseCode + '.json'
    return filename
  }
}


// async function handleVerifyCode(driver) {
//
//   let code = await getVerifyCode(driver)
//   let text = /[\w]+/.exec(code.text).toString()
//   console.log("text=", text)
//   await driver.findElement(By.id('checkCode')).sendKeys(text);
//   await driver.findElement(By.id('btnLogin')).click()
//
// }




module.exports = {
  Bot
}
