const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const {
  getCourseNameByCode,
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

const lessonStateEnum = {
  initial: '未完成',
  completed: '完成'
}
const logger = log4js.getLogger();
const {
  AnswerList
} = require('./makeAnswerJson.js');

// const { getVerifyCode }  = require('./ocr')
// 每个学生来自不同地方，可能url不同
const CouseUrlMap = {
  // { title, code, url, host }
  // '4125': 'http://anhui.ouchn.cn/course/view.php?id=4125', // 国家开放大学学习指南
  // '4257': 'http://anhui.ouchn.cn/course/view.php?id=4257', // 思想道德修养与法律基础
  // '3833': 'http://anhui.ouchn.cn/course/view.php?id=3833', // 习近平新时代中国特色社会主义思想
  // '4255': 'http://anhui.ouchn.cn/course/view.php?id=4255' // 毛泽东思想和中国特色社会主义理论体系概论
}
const SupportCouses = [{
    title: '国家开放大学学习指南'
  },
  {
    title: '思想道德修养与法律基础'
  },
  {
    title: '习近平新时代中国特色社会主义思想'
  },
  {
    title: '毛泽东思想和中国特色社会主义理论体系概论'
  },
  {
    title: '马克思主义基本原理概论'
  },
  {
    title: '中国近现代史纲要'
  },
]

const {
  parseCouseMaoGai,
  handleMaoGaiQuiz
} = require('./couses/maogai')
const {
  parseCouseZhiNan,
  handleZhiNanQuiz
} = require('./couses/zhinan')
const {
  parseCouseSiXiu,
  handleSiXiuQuiz
} = require('./couses/sixiu')
const {
  parseCouseMao,
  handleMaoQuiz
} = require('./couses/mao')
const {
  parseCouseMaKeSi,
  handleMaKeSiQuiz
} = require('./couses/makesi')
const {
  parseCouseJinDaiShi,
  handleJinDaiShiQuiz
} = require('./couses/jindaishi')
const {
  parseCouseBase,
  handleQuizBase
} = require('./couses/base')

class Bot {

  constructor(driver, options = {}) {
    // if( !user || !password){
    //   throw  new Error( "用户名和密码是必须的")
    //
    // }
    this.mainHandle = null;
    this.status = [];
    this.driver = driver;
    this.username = options.username
    this.password = ''
    this.courseCode = '' // 当前课程代码，不同省市同一
    this.couseTitle = '' // 当前课程名称
    this.couseUrl = '' // 当前课程URL
    this.recursiveCount = 0 // 课程学习递归调用次数
    this.couseInfo = {
      score: {
        progress: 0
      },
      status: []
    } // 课程学习状态
  }

  // 读取用户课程数据文件
  // options - filename: 数据文件路径
  async getLog(couseTitle, options = {}) {
    let that = this
    this.couseTitle = couseTitle
    this.recursiveCount = 0
    let {
      filename
    } = options

    if (!filename) {
      // 需在constructor中 配置username
      filename = await this.getCouseJsonPath(couseTitle)
    }
    if (fs.existsSync(filename)) {
      let data = fs.readFileSync(filename, "utf-8")
      if (data != null) {

        let res = JSON.parse(data);
        console.info(`读取课程数据 ${couseTitle}`);
        that.courseInfo.status = res;
      }
    } else {
      logger.error(`无法读取课程数据文件 ${filename}`);
      filename = null
    }

    return filename
  }



  async readScore(couseTitle) {
    let filename = await this.getCouseJsonPath(couseTitle)
    let data = fs.readFileSync(filename, "utf-8")
    if (data != null) {
      let res = JSON.parse(data);
      for (let i = 0; i < res.status.length; i++) {
        let lesson = res.status[i];
        let isFinish = lesson.isFinish;
        let type = lesson.type

        if (isFinish == '已完成' && type == 'quiz') {
          let url = lesson.url

          let xpath = "//div[@class='singlebutton quizstartbuttondiv']//button"
          await this.driver.get(url)
          await this.driver.wait(until.elementLocated(By.xpath(xpath)), 15000);

          let scoreTable = await this.driver.findElements(By.tagName('table'))
          let table_body = await scoreTable[0].findElements(By.tagName('tbody'))
          let tr = await table_body[0].findElements(By.tagName('tr'))
          for (let j = 0; j < tr.length; j++) {
            let tr_Str = await tr[j].getText()
            let infoList = tr_Str.split(' ')
            console.log('infoList---:', infoList);
            if (j == tr.length - 1 && infoList.length > 2) {
              res.status[i].score = infoList
            } else if (j == tr.length - 1 && infoList.length == 2) {
              tr_Str = await tr[j - 1].getText()
              infoList = tr_Str.split(' ')
              res.status[i].score = infoList
            }
          }
        }
      }
      this.couseInfo.status = res.status
      fs.writeFile(filename, JSON.stringify(this.couseInfo), (err) => {
        if (err) throw err;
        console.log(`文件已被保存:${filename}`);
      });
    } else {
      logger.error(`无法读取课程数据文件 ${filename}`);
    }
  }

  /**
   * 登录账户
   * @param {Object} options - type - 学习某一类型的章节
   * @return {bool} 登录是否成功
   */
  async login(username, password) {

    this.username = username
    this.password = password
    let driver = this.driver

    await driver.get('http://passport.ouchn.cn/Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Dstudentspace%26redirect_uri%3Dhttp%253A%252F%252Fstudent.ouchn.cn%252F%2523%252Fsignin-oidc%2523%26response_type%3Did_token%2520token%26scope%3Dopenid%2520profile%2520ouchnuser%2520ouchnstudentspaceapi%26state%3Df2b1c4eebd354996ab8f0c3b618f39d1%26nonce%3D044e6125331b4db298c6acf33b1058dd');
    //await driver.get('http://passport.ouchn.cn/Account/Login?ReturnUrl=%2F');
    await driver.findElement(By.id('username')).sendKeys(username);
    await driver.findElement(By.id('password')).sendKeys(password);
    //await handleVerifyCode(driver)
    let loginButton = await driver.findElement(By.css(".login-form button[value='login']"));
    await loginButton.click();
    let success = false
    //最多等待15秒
    try {
      await driver.wait(until.titleContains('学生空间'), 10000).
      then(async ()=>{
        await driver.wait(until.titleContains('学生空间'), 10000);
        await driver.get('http://student.ouchn.cn/')
      }).catch(async ()=>{
      // 偶尔可能没有反应，直接进入学生主页，等待10秒
        await driver.get('http://student.ouchn.cn/')
        await driver.wait(until.titleContains('学生空间'), 10000);

      })

      logger.info('登录成功!!');
      // 用于打开其它窗口后，再回来打开其它课程
      this.mainHandle = await driver.getWindowHandle()

      success = true
    } catch (e) {
      logger.info('登录失败!!');
    }

    return success
  }

  async logout() {
    let url = 'http://passport.ouchn.cn/Account/Logout?logoutId=student.ouchn.cn'
    await this.driver.get(url)
  }
  /**
   * 学习一门课程
   * @param {Object} options - type - 学习某一类型的章节
   * @param {*} res
   */
  async learnCouse(options={}) {
    if (this.recursiveCount >= 15) {
      return
    }
    let typeFilter = options.type
    console.info("课程学习中", this.couseTitle, 'options=', options)
    this.recursiveCount += 1
    let driver = this.driver
    let moduleStatus = this.couseInfo.status
    let nourlModules = moduleStatus.filter((moduleStatus) => {
      return moduleStatus.isFinish == '未完成'
    })

    for (let i = 0; i < moduleStatus.length; i++) {
      let lesson = moduleStatus[i];
      let isFinish = lesson.isFinish;
      let url = lesson.url
      let type = lesson.type
      if (url.length == 0) {
        continue
      }
      if (typeFilter && typeFilter != type) {
        continue
      }
      if (isFinish == '未完成') {
        let title = lesson.title
        logger.info(`学习小节${title} url=${url}`)
        let done = false
        if (type == 'video') {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          let success = await this.watchVideo(lesson)
          if (success) {
            isFinish = '完成'
          }
        } else if (url.includes('/mod/page/view')) {
          await this.readText(lesson)
          isFinish = '完成'
        } else if (type == 'quiz') {
          // 只有类型为答题时，再答题，以免多次答题
          if (typeFilter == type) {
            await this.goQuiz(lesson, lesson.position, options)
            isFinish = '完成'
          }
        } else {
          logger.error(`无法识别的课程url =${url}`)
        }
        // 每学完一课，更新一下数据文件
        lesson.isFinish = isFinish
        if (isFinish == '完成') {
          this.saveCouseJson(this.couseTitle)
        }
      }
    }
    //

    if (nourlModules.length > 0) {
      // 重新生成数据，重新学习，主要是学习视频，有些小节视频较多

      if (this.recursiveCount < 15) {
        logger.info(`课程${ this.couseTitle}递归了${this.recursiveCount}次，还没有完成。`)
        await this.profileCouse()

        let newModuleStatus = this.couseInfo.status
        let newNourlModules = moduleStatus.filter((moduleStatus) => {
          return moduleStatus.isFinish == '未完成'
        })

        console.info(`课程${ this.couseTitle}递归了${this.recursiveCount}次，${ nourlModules.length}节未学习 ${ newNourlModules.length}节未学习 。`)

        if (newNourlModules.length < nourlModules.length) {
          await this.learnCouse()
        } else {
          logger.error(`课程${ this.couseTitle}递归了${this.recursiveCount}次，没有新的可以学习章节，结束学习。`)
          this.recursiveCount = 15
        }

      } else {
        logger.error(`课程${ this.couseTitle}递归了15次，还没有完成，强制结束。`)
      }
    } else {
      logger.info(`课程${ this.couseTitle}递归了 ${this.recursiveCount}次，终于完成。`)

    }
  }


  async learnModule(moduleCode, options) {

    logger.info(`课程${ this.couseTitle} 小节 ${moduleCode} 开始学习。`)
    let driver = this.driver
    let moduleStatus = this.couseInfo.status
    let success = false
    for (let i = 0; i < moduleStatus.length; i++) {
      let lesson = moduleStatus[i];
      let title = lesson.title
      let isFinish = lesson.isFinish;
      let type = lesson.type
      let url = lesson.url
      // 看视频无需url
      // if (url.length == 0) {
      //   console.debug(`小节 ${title} 没有 url`);
      //   continue
      // }
      if (isFinish == '未完成' && lesson.id == moduleCode) {
        // 根据url判断类型
        // 视频|外部文章：mod/url/view
        // 文本: mod/page/view
        // 专题测验：mod/quiz/view
        // 考核说明：mod/resource/view, 重定向到pdf
        console.debug(`类型 ${type} 小节 ${title} `);
        if (type == 'video') {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          success = await this.watchVideoByApi(lesson)
        } else if (url.includes('/mod/page/view')) {
          await this.readText(lesson)
        } else if (type == 'quiz') {
          await this.goQuiz(lesson, lesson.position, options)
        } else {
          logger.error(`无法识别的课程url =${url}`)
        }
      }
      //  logger.error(`无法识别的小节代码 =${moduleCode}`)


    }
    console.debug(` 小节 ${moduleCode} 学习结束 ${success} `);

    return success
  }


  async readText(lesson) {
    var driver = this.driver


    let isFinish = lesson.isFinish;
    let id = lesson.id

    if (isFinish == '未完成') {
      let url = lesson.url
      let title = lesson.title

      await driver.get(url);
      console.debug('reading ', title);
      await driver.wait(scrollToBottom(driver), 100000000);
      console.debug('read finish', title);

    }

  }

  async watchVideo(lesson) {
    console.log('==================watchVideo=================');
    let success = true
    let driver = this.driver
    let isFinish = lesson.isFinish;
    let id = lesson.id

    if (isFinish == '未完成') {
      console.log('course-----:', lesson);
      let url = lesson.url
      let title = lesson.title
      await driver.get(url);
      // 可能被重定向到 xxx.pdf

      try {
        let canvas = await driver.findElement(By.tagName('canvas'))
        await driver.wait(playVideo(driver, canvas), 100000000);
        console.log('视频播放成功');
      } catch (ex) {
        success = false
        console.error('视频播放失败：' + id, ex);
      }
    }

    return success

  }

  async goQuiz(lesson, num, options) {
    let driver = this.driver

    let isFinish = lesson.isFinish;
    let id = lesson.id

    if (isFinish == '未完成') {
      console.log('course-----:', lesson);
      //let url = lesson.url
      let lessonTitle = lesson.title
      let {
        title,
        code,
        host
      } = CouseUrlMap[this.couseTitle]
      let url = `http://${host}/mod/quiz/view.php?id=${id}`

      console.log('this.couseTitle---:', this.couseTitle);
      if (title == '习近平新时代中国特色社会主义思想') {
        await handleMaoGaiQuiz(driver, url, id, num, true, options, code)
      } else if (title == '国家开放大学学习指南') {
        await handleZhiNanQuiz(driver, url, id, num, true, options, code)
      } else if (title == '思想道德修养与法律基础') {
        await handleQuizBase(driver, url, id, num, true, options, code)
      } else if (title == '毛泽东思想和中国特色社会主义理论体系概论') {
        await handleQuizBase(driver, url, id, num, true, options, code)
      } else if (title == '马克思主义基本原理概论') {
        await handleQuizBase(driver, url, id, num, true, options, code)
      } else if (title == '中国近现代史纲要') {
        await handleQuizBase(driver, url, id, num, true, options, code)
      } else if (code == '4387') { // 中国特色社会主义理论体系概论
        await handleQuizBase(driver, url, id, num, true, options, code)
      }
      console.log('this quiz is done');
    }


  }

  async goFinal(lesson, options) {
    console.log('=================goFinal=================');
    let driver = this.driver

    let isFinish = lesson.isFinish;
    let id = lesson.id
    let url = lesson.url
    let classId = lesson.classId
    let finalFilename = getCourseNameByCode( classId )

    await driver.get(url)
    await driver.wait(until.elementLocated(By.css('.singlebutton button.btn-secondary')), 15000);
    const commitButton = await driver.findElement(By.css('.singlebutton button.btn-secondary'))
    await commitButton.click()
    console.debug("编辑按钮")

    await driver.wait(until.elementLocated(By.css('iframe')), 15000);
    const textBody = await driver.findElement(By.css('iframe'))

    let answerText = fs.readFileSync(`./db/subjects/${finalFilename}_final.txt`,'utf8')
    textBody.sendKeys(Key.CONTROL, "a", Key.NULL,answerText);

    await driver.wait(until.elementLocated(By.css('.form-group input.btn-primary')), 15000);
    const saveButton = await driver.findElement(By.css('.form-group input.btn-primary'))
    await saveButton.click()

    // 点击提交按钮
    if( options.submitfinal == 'yes'){
      let submitButtonCss = '.submissionaction:last-child form button.btn-secondary'
      await driver.wait(until.elementLocated(By.css(submitButtonCss)), 15000);
      console.debug("查找提交按钮")
      const submitButton = await driver.findElement(By.css(submitButtonCss))
      await submitButton.click()
      console.debug("点击提交按钮")
      let confirmButtonCss = '.submitconfirm #id_submitbutton'
      await driver.wait(until.elementLocated(By.css(confirmButtonCss)), 15000);
      const confirmButton = await driver.findElement(By.css(confirmButtonCss))
      await confirmButton.click()
      console.debug("点击确认按钮")
    }

  }

  // 通过api去看视频
  async watchVideoByApi(lesson) {
    // $.getJSON('http://shenyang.ouchn.cn/theme/blueonionre/modulesCompletion.php?cmid=437329&id=3935&sectionid=27', function(res){ console.log(res)})
    console.log('==================watchVideo=================', CouseUrlMap);
    let success = true
    let course = CouseUrlMap[this.couseTitle]

    let driver = this.driver
    let isFinish = lesson.isFinish;
    let id = lesson.id
    let classId = lesson.classId
    let sectionId = lesson.sectionId
    if (isFinish == '未完成') {
      console.log('lesson:', lesson);
      let url = lesson.url
      let title = lesson.title
      // http://shenyang.ouchn.cn/mod/url/view.php?id=526346
      await driver.get(`http://${course.host}/mod/url/view.php?id=${id}`);
      // 可能被重定向到 xxx.pdf
      try {
        // 超时15秒，多等点，网络有时慢
        let video = await driver.wait(until.elementLocated(By.tagName('video')), 15000);
        let script = `jQuery.ajaxSetup({ async : false}); var res = null; jQuery.getJSON('/theme/blueonionre/modulesCompletion.php?cmid=${id}&id=${classId}&sectionid=${sectionId}', function(data){ res = data; }); return res;`
        let res = await driver.executeScript(script);
        await  driver.wait( function(){
          return new Promise((resolve, reject) => {
            console.error("视频播放延时1秒, 防止API没有成功！" )
            setTimeout(()=>{ resolve(true)}, 1000);
          })
        });
        console.log('视频播放成功', typeof(res), res);
      } catch (ex) {
        success = false
        console.error('视频播放失败：' + id, ex);
      }
    }

    return success


  }

  /**
   * 确定当前课程的url 和 code
   * 需要点击一下 ‘进入学习’，获得访问权限 地区.ouchn.cn/course
   * @param {string} couseTitle -  如：“4498_中国特色社会主义理论体系概论”
   * @return {object} course 当前课程信息 或 null/undefined
   */

  async prepareForLearn(couseTitle) {
    // 处理 “4498_中国特色社会主义理论体系概论” 情况, 避免 "人文英语3" 中的3被清除
    couseTitle = couseTitle.replace(/^[\d_-\s]+/, '')
    let driver = this.driver
    let mainHandle = this.mainHandle //await driver.getWindowHandle()
    let links = await this.getCousesLinks(driver, couseTitle);
    if (links.length == 0) {
      console.error('无法找到课程' + couseTitle)
      return false
    }
    for (let i = 0; i < links.length; i++) {
      let a = links[i];
      let displayed = await a.isDisplayed()
      console.log(" isDisplayed ", displayed)

      await driver.wait(function() {
        return a.isDisplayed().then(function(isDisplayed) {
          return isDisplayed === true;
        });
      }, 5000);
      if (displayed) {
        await a.click()
        // 打开课程窗口
      }
    }
   
    
    console.log('all tab opened0, links', links.length);

    await driver.wait(async () => {
      let handles = await driver.getAllWindowHandles()
      return handles.length == links.length + 1
    }, 80000, `错误：${links.length}课程窗口没有打开`)

    console.log('all tab opened2, links');
    let handles = await driver.getAllWindowHandles()

    let success = false
    let url = null
    for (let i = 0; i < handles.length; i++) {
      let handle = handles[i]
      console.log("mainHandle", i, mainHandle, "handle = ", handle)
      if (mainHandle != handle) {
        // 等待页面加载成功，title包含 ‘课程’

        let locator = driver.switchTo()
        await locator.window(handle)
        // 需要等待页面加载完成，即标题有中包含 课程
        await driver.wait(until.titleContains('课程'));
        let windowTitle = await driver.getTitle() // 课程： 习近平新时代中国特色社会主义思想
        url = await driver.getCurrentUrl() //http://shenyang.ouchn.cn/course/view.php?id=4372
        let parsedUrl = URL.parse(url, true)
        let code = parsedUrl.query['id']
        // 如果找到当前这门课的窗口,
        // cousetitle=计算机应用基础(本)   windowtitle = 计算机应用基础（本）
        let tidyWindowTitle = windowTitle.replace(/[\(\)（）]/g, '')
        let tidyCouseTitle = couseTitle.replace(/[\(\)（）]/g, '')
        console.debug(`couseTitle=${couseTitle} windowTitle = ${windowTitle}, url= ${url} code=${code} tidyWindowTitle=${tidyWindowTitle} tidyCouseTitle=${tidyCouseTitle}`);

        if (tidyCouseTitle && tidyWindowTitle.indexOf(tidyCouseTitle) >= 0) {
          this.couseUrl = url
          this.couseTitle = couseTitle
          CouseUrlMap[code] = {
            host: parsedUrl.host,
            url,
            title: couseTitle,
            code: code
          } // [id] = url
          CouseUrlMap[couseTitle] = {
            host: parsedUrl.host,
            url,
            title: couseTitle,
            code: code
          } // [习近平新时代中国特色社会主义思想 - 负责] = url
          success = true
          break;
        }
      }
    }
    console.log("current window url=", url)
    this.recursiveCount = 0
    return CouseUrlMap[couseTitle]
  }

  async learnFinal(options) {

     

    let driver = this.driver
    let moduleStatus = this.couseInfo.status

    for (let i = 0; i < moduleStatus.length; i++) {
      let lesson = moduleStatus[i];

      if (lesson.title == '终结性考试' && lesson.type =='assign') {
        await this.goFinal(lesson, options)
      }
    }
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
  async profileCouse(courseCodeOrTitle) {
    // 毛泽东思想和中国特色社会主义理论体系概论, 统计学原理   思想道德修养与法律基础  管理学基础
    //  经济数学基础  计算机应用基础
    this.couseTitle = courseCodeOrTitle || this.couseTitle
    // 有时传过来的参数 前面有空格，导致后面匹配不上对应的课程信息
    this.couseTitle = this.couseTitle.replace(/^[\d_-\s]+/, '')

    console.debug("profileCouse=", courseCodeOrTitle, CouseUrlMap);
    let couse = null
    if (courseCodeOrTitle) {
      couse = CouseUrlMap[courseCodeOrTitle]

    } else {
      couse = CouseUrlMap[this.couseTitle]
    }

    if (couse) {
      let {
        url,
        title,
        code
      } = couse
      // 第二次递归时，必须先访问url
      let startAt = new Date()
      await this.driver.get(url)
      let windowTitle = await this.driver.getTitle()

      console.log(" tab.title1 ", title, this.couseTitle, typeof(this.couseTitle))
      if (title == '毛泽东思想和中国特色社会主义理论体系概论') {
        this.couseInfo = await parseCouseMaoGai(this.driver)
      } else if (title == '国家开放大学学习指南') {
        //this.couseInfo = await parseCouseZhiNan( this.driver )
        this.couseInfo = await parseCouseMaoGai(this.driver)
      } else if (title == '习近平新时代中国特色社会主义思想') {
        this.couseInfo = await parseCouseMaoGai(this.driver)
      } else if (title == '思想道德修养与法律基础') {
        this.couseInfo = await parseCouseMaoGai(this.driver)
      } else if (title == '中国近现代史纲要') {
        this.couseInfo = await parseCouseJinDaiShi(this.driver)
      } else if (title == '马克思主义基本原理概论') {
        this.couseInfo = await parseCouseMaKeSi(this.driver)
      } else if (title == '中国特色社会主义理论体系概论') {
        this.couseInfo = await parseCouseMaoGai(this.driver)
      }else{
        this.couseInfo = await parseCouseBase(this.driver)
      }

      let position = 0;
      for (let i = 0; i < this.couseInfo.status.length; i++) {
        if (this.couseInfo.status[i].type == 'quiz') {
          this.couseInfo.status[i].position = position;
          position++;
        }
      }

      // let endAt = new Date()
      // this.couseInfo.score.startAt = startAt
      // this.couseInfo.score.endAt = endAt
      await this.saveCouseJson(this.couseTitle)
    } else {
      console.debug(`课程代码 ${ this.couseTitle} ${courseCodeOrTitle} 找不到课程url`);
    }
  }

  async getCousesLinks(driver, couseTitle) {

    
    // 支持的课程

    let couseTitles = SupportCouses.map((c) => c.title)
    let links = []
    await driver.wait(until.elementLocated(By.css('#zaixuekecheng .media')));
    let div = await driver.findElement(By.id('zaixuekecheng'));
    let couses = await driver.findElements(By.css('#zaixuekecheng .media'));
    console.debug("getCousesLinks couses=", couseTitle, couses.length);
    for (let i = 0; i < couses.length; i++) {
      let couse = couses[i]
      let titleElement = await couse.findElement(By.css('.media-title'));
      let title = await titleElement.getText()
      let buttonElement = await couse.findElement(By.css('.course-entry button'));
      let text = await buttonElement.getText()
      //   title="★中级财务会计（一）"  couseTitle = "中级财务会计（一）"

      console.debug("getCousesLinks couse=", title, title.includes(couseTitle));
      if (title.includes(couseTitle)) {
        links.push(buttonElement)
      }
    }
    // 不知因为什么原因会多一个, 可能是angular生成的隐藏button对象，
    return links
  }

  async saveCouseJson(classId) {
    let filename = await this.getCouseJsonPath(classId)
    //console.log('this.couseInfo----:',this.couseInfo);
    // 保存 课程信息时只保存status 即每一课的信息，以便和快速开视频使用相同的结构的文件
    fs.writeFileSync(filename, JSON.stringify(this.couseInfo.status) );
  }

  async getCouseJsonPath(couseTitle) {
    let dir = './db/students'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    let filename = dir + '/' + this.username + '_' + couseTitle + '.json'
    return filename
  }

  async createAnswerList(couseTitle) {
    let answerList = new AnswerList()
    let jsonStr = ''
    let filename = null
    let couse = CouseUrlMap[couseTitle]
    if (couse) {

      let {
        url,
        title,
        code
      } = couse

      if (title == '习近平新时代中国特色社会主义思想') {
        jsonStr = answerList.makeXiAnswerJson("./db/answers/xi.txt")
        filename = './db/answers/' + code + '_xiList.json'
      } else if (title == '国家开放大学学习指南') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeZhiNanAnswerJson("./db/answers/zhinan.txt")
        filename = './db/answers/' + code + '_zhinanList.json'
      } else if (title == '思想道德修养与法律基础') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeSiXiuAnswerJson("./db/answers/sixiu.txt")
        filename = './db/answers/' + code + '_sixiuList.json'
      } else if (title == '毛泽东思想和中国特色社会主义理论体系概论') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeMaoAnswerJson("./db/answers/mao.txt")
        filename = './db/answers/' + code + '_maoList.json'
      } else if (title == '马克思主义基本原理概论') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeMaoAnswerJson("./db/answers/makesi.txt")
        filename = './db/answers/' + code + '_makesiList.json'
      } else if (title == '中国近现代史纲要') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeJinDaiShiAnswerJson("./db/answers/jindaishi.txt")
        filename = './db/answers/' + code + '_jindaishiList.json'
      } else {
        // 可能答案文件不存在，无法生成
        let answerList = new AnswerList()
        let answerfile = `./db/answers/${code}_${title}.txt`
        if( fs.existsSync( answerfile)){
          jsonStr = answerList.makeAnswerJsonBase()
          filename = `./db/answers/${code}_${title}.json`            
        }
      }
      if (filename ) {
        fs.writeFile(filename, JSON.stringify({
          answers: jsonStr
        }), (err) => {
          if (err) throw err;
          console.log(`课程测验答案已被保存:${filename}`);
        });
      } else {
        console.log(`没有课程测验答案:${couseTitle}`);
      }
    } else {
      console.error(`无法找到课程:${couseTitle}`);

    }

  }

  // 取得科目的形考成绩
  async getSummary(couseTitles) {
    let driver = this.driver
    let summaries = []
    await driver.wait(until.elementLocated(By.id('zaixuekecheng')));
    let div = await driver.findElement(By.id('zaixuekecheng'));
    let couses = await driver.findElements(By.css('#zaixuekecheng .media'));
    console.debug("getSummary couses=", couses.length);
    for (let i = 0; i < couses.length; i++) {
      let couse = couses[i]
      let titleElement = await couse.findElement(By.css('.media-title'));
      let title = await titleElement.getText()
      let buttonElement = await couse.findElement(By.css('.course-entry button'));
      let text = await buttonElement.getText()
      // [必修6学分, 形考成绩: 99,本班排名: 3/12, 有43个作业和测验待完成]

      if (couseTitles.includes(title)) {
        let sumary = {
          title: title
        }
        let infoElements = await couse.findElements(By.css('.course-content p'));
        let todo = await infoElements[3].getText()
        let score = await infoElements[1].getText()
        sumary.username = this.username
        sumary.todo = todo
        sumary.score = score
        console.debug("getSummary couse=", title, text, todo, score);
        summaries.push(sumary)
      }
    }
    return summaries

  }

  // 关闭除main之外的其它tab
  async closeOtherTabs() {
    let driver = this.driver
    let mainHandle = this.mainHandle
    let handles = await driver.getAllWindowHandles()

    let locator = await driver.switchTo()

    for (let i = 0; i < handles.length; i++) {
      let handle = handles[i]
      console.log("mainHandle0", i, mainHandle, "handle = ", handle)
      if (mainHandle != handle) {
        try {
          await locator.window(handle)
          // 等待0.5秒，否则报错  target window already closed
          // await  driver.wait( function(){
          //   return new Promise((resolve, reject) => {
          //     setTimeout(resolve, 500);
          //   })
          // });

          await driver.close()
        } catch (e) {
          console.error("driver.close", e);
        }
      }
    }
    await locator.window(mainHandle)
    await driver.wait(until.titleContains('学生空间'), 20000);
    console.debug("closeOtherTabs1");
    // await driver.wait(async () => {
    //   let handles = await driver.getAllWindowHandles()
    //   return handles.length == 1
    // }, 30000, `错误：${handles.length}课程窗口没有关闭`)
  }

  // 获取课程详细信息, prepareForLearn后才能使用
  getCourseInfo(couseTitle){
    let couse = CouseUrlMap[couseTitle]
    return couse
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
// function getCourseNameByCode(code) {
//   // liaoning
//   console.debug( "code=", code )
//   if (code == '3796') return '3796_毛泽东思想和中国特色社会主义理论体系概论';
//   if (code == '4372') return '4372_毛泽东思想和中国特色社会主义理论体系概论';
//   if (code == '4487') return '4487_毛泽东思想和中国特色社会主义理论体系概论';
//   if (code == '4485') return '4485_毛泽东思想和中国特色社会主义理论体系概论';
//   if (code == '3935') return '3935_马克思主义基本原理概论';
//   if (code == '4609') return '4609_马克思主义基本原理概论';
//   if (code == '4486') return '4486_马克思主义基本原理概论';
//   if (code == '3945') return '3945_习近平新时代中国特色社会主义思想';
//   if (code == '3797') return '3797_习近平新时代中国特色社会主义思想';
//   if (code == '4065') return '4065_习近平新时代中国特色社会主义思想';
//   if (code == '4611') return '4611_习近平新时代中国特色社会主义思想';
//   if (code == '4488') return '4488_习近平新时代中国特色社会主义思想';
//   if (code == '3937') return '3937_思想道德修养与法律基础';
//   if (code == '4374') return '4374_思想道德修养与法律基础';
//   if (code == '4491') return '4491_思想道德修养与法律基础';
//   if (code == '4614') return '4614_思想道德修养与法律基础';
//   if (code == '3944') return '3944_中国近现代史纲要';
//   if (code == '4373') return '4373_中国近现代史纲要';
//   if (code == '4615') return '4615_中国近现代史纲要';
//   if (code == '4492') return '4492_中国近现代史纲要';
//   if (code == '4387') return '4387_中国特色社会主义理论体系概论';
//   // heilongjiang
//   if (code == '4498') return '4498_中国特色社会主义理论体系概论';

//   return null

// }



module.exports = {
  Bot
}
