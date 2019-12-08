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

const lessonStateEnum = {
  initial: '未完成',
  completed: '完成'
}
const logger = log4js.getLogger();
const {AnswerList} = require ('./makeAnswerJson.js');

// const { getVerifyCode }  = require('./ocr')
// 每个学生来自不同地方，可能url不同
const CouseUrlMap = {
  // '4125': 'http://anhui.ouchn.cn/course/view.php?id=4125', // 国家开放大学学习指南
  // '4257': 'http://anhui.ouchn.cn/course/view.php?id=4257', // 思想道德修养与法律基础
  // '3833': 'http://anhui.ouchn.cn/course/view.php?id=3833', // 习近平新时代中国特色社会主义思想
  // '4255': 'http://anhui.ouchn.cn/course/view.php?id=4255' // 毛泽东思想和中国特色社会主义理论体系概论
}
const SupportCouses = [
  { title: '国家开放大学学习指南'},
  { title: '思想道德修养与法律基础'},
  { title: '习近平新时代中国特色社会主义思想'},
  { title: '毛泽东思想和中国特色社会主义理论体系概论'},
  { title: '马克思主义基本原理概论'},
  { title: '中国近现代史纲要'},
]

const { parseCouseMaoGai, handleMaoGaiQuiz } = require('./couses/maogai')
const { parseCouseZhiNan, handleZhiNanQuiz } = require('./couses/zhinan')
const { parseCouseSiXiu, handleSiXiuQuiz } = require('./couses/sixiu')
const { parseCouseMao, handleMaoQuiz } = require('./couses/mao')
const { parseCouseMaKeSi, handleMaKeSiQuiz } = require('./couses/makesi')
const { parseCouseJinDaiShi, handleJinDaiShiQuiz } = require('./couses/jindaishi')

class Bot {

  constructor(driver, options = {} ) {
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
    this.courseInfo = {
      score:{progress: 0},
      status: []
    } // 课程学习状态
  }

  async getLog(username, couseTitle) {
    let that = this
    this.couseTitle = couseTitle
    this.recursiveCount = 0
    let filename = await this.getCouseJsonPath(couseTitle)
    if( fs.existsSync( filename)){
      let data = fs.readFileSync(filename, "utf-8")
      if (data != null) {

        let res = JSON.parse(data);
        console.info(`读取课程数据 ${couseTitle}`);
        that.courseInfo= res;
      }
    } else {
      logger.error(`无法读取课程数据文件 ${filename}`);
      filename = null
    }

    return filename
  }

  async readScore(couseTitle){
    let filename = await this.getCouseJsonPath(couseTitle)
    let data = fs.readFileSync(filename, "utf-8")
    if (data != null) {
      let res = JSON.parse(data);
      for(let i = 0; i < res.status.length; i++){
        let lesson = res.status[i];
        let isFinish = lesson.isFinish;
        let type = lesson.type

        if(isFinish=='已完成'&&type=='quiz'){
          let url = lesson.url

          let xpath = "//div[@class='singlebutton quizstartbuttondiv']//button"
          await this.driver.get(url)
          await this.driver.wait(until.elementLocated(By.xpath(xpath)), 15000);

          let scoreTable = await this.driver.findElements(By.tagName('table'))
          let table_body = await scoreTable[0].findElements(By.tagName('tbody'))
          let tr = await table_body[0].findElements(By.tagName('tr'))
          for(let j=0;j<tr.length;j++){
            let tr_Str = await tr[j].getText()
            let infoList = tr_Str.split(' ')
            console.log('infoList---:',infoList);
            if(j==tr.length-1&&infoList.length>2){
              res.status[i].score = infoList
            }else if(j==tr.length-1&&infoList.length==2){
              tr_Str = await tr[j-1].getText()
              infoList = tr_Str.split(' ')
              res.status[i].score = infoList
            }
          }
        }
      }
      this.courseInfo.status = res.status
      fs.writeFile(filename, JSON.stringify(this.courseInfo), (err) => {
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
    await driver.findElement(By.id('username')).sendKeys(username);
    await driver.findElement(By.id('password')).sendKeys(password);
    //await handleVerifyCode(driver)
    let loginButton = await driver.findElement(By.css(".login-form button[value='login']"));
    await loginButton.click();
    let success = false
    //最多等待15秒
     try{
      await driver.wait(until.titleContains('学生空间'), 10000);
      await driver.get('http://student.ouchn.cn/#home')
      logger.info('登录成功!!');
      success = true
    }catch( e){
      logger.info('登录失败!!');
    }

    return success
  }

  async logout(){
    let url = 'http://passport.ouchn.cn/Account/Logout?logoutId=student.ouchn.cn'
    await this.driver.get(url)
  }
  /**
   * 学习一门课程
   * @param {Object} options - type - 学习某一类型的章节
   * @param {*} res
   */
  async learnCourse( options = {}) {
    if (this.recursiveCount >= 15) {
      return
    }
    let typeFilter = options.type
    console.info("课程学习中", this.couseTitle, 'options=', options)
    this.recursiveCount += 1
    let driver = this.driver
    let moduleStatus = this.courseInfo.status
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
      if( typeFilter && typeFilter != type ){
        continue
      }
      if (isFinish == '未完成') {
        let title = lesson.title
        logger.info(`学习小节${title} url=${url}`)
        let done = false
        if ( type== 'video'  ) {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          let success = await this.watchVideo(lesson)
          if( success ){
            isFinish = '完成'
          }
        } else if (url.includes('/mod/page/view')) {
          await this.readText(lesson)
          isFinish = '完成'
        } else if (url.includes('/mod/quiz/view')) {
          // 只有类型为答题时，再答题，以免多次答题
          if( typeFilter == type){
            await this.goQuiz(lesson,lesson.position)
            isFinish = '完成'
          }
        } else {
          logger.error(`无法识别的课程url =${url}`)
        }
        // 每学完一课，更新一下数据文件
        lesson.isFinish = isFinish
        if( isFinish== '完成'){
          this.saveCouseJson(this.couseTitle)
        }
      }
    }
    //

    if (nourlModules.length > 0) {
      // 重新生成数据，重新学习，主要是学习视频，有些小节视频较多

      if (this.recursiveCount < 15) {
        logger.info(`课程${ this.couseTitle}递归了${this.recursiveCount}次，还没有完成。`)
        await this.profileCouse( )

        let newModuleStatus = this.courseInfo.status
        let newNourlModules = moduleStatus.filter((moduleStatus) => {
          return moduleStatus.isFinish == '未完成'
        })

        console.info(`课程${ this.couseTitle}递归了${this.recursiveCount}次，${ nourlModules.length}节未学习 ${ newNourlModules.length}节未学习 。`)

        if( newNourlModules.length < nourlModules.length ){
          await this.learnCourse()
        }else{
          logger.error(`课程${ this.couseTitle}递归了${this.recursiveCount}次，没有新的可以学习章节，结束学习。`)
          this.recursiveCount = 15
        }

      } else {
        logger.error(`课程${ this.couseTitle}递归了15次，还没有完成，强制结束。`)
      }
    }else{
      logger.info(`课程${ this.couseTitle}递归了 ${this.recursiveCount}次，终于完成。`)

    }
  }


  async learnModule(moduleCode) {
    logger.info(`课程${ this.couseTitle} 小节 ${moduleCode} 开始学习。`)
    let driver = this.driver
    let moduleStatus = this.courseInfo.status

    for (let i = 0; i < moduleStatus.length; i++) {
      let lesson = moduleStatus[i];
      let title = lesson.title
      let isFinish = lesson.isFinish;
      let type = lesson.type
      let url = lesson.url
      if (url.length == 0) {
        console.debug(`小节 ${title} 没有 url`);
        continue
      }
      if (isFinish == '未完成' && lesson.id == moduleCode) {
        // 根据url判断类型
        // 视频|外部文章：mod/url/view
        // 文本: mod/page/view
        // 专题测验：mod/quiz/view
        // 考核说明：mod/resource/view, 重定向到pdf
        console.debug(`类型 ${type} 小节 ${title} `);
        if ( type== 'video'  ) {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          await this.watchVideoByApi(lesson)
        } else if (url.includes('/mod/page/view')) {
          await this.readText(lesson)
        } else if (url.includes('/mod/quiz/view')) {
          await this.goQuiz(lesson,lesson.position)
        } else {
          logger.error(`无法识别的课程url =${url}`)
        }
      }
      //  logger.error(`无法识别的小节代码 =${moduleCode}`)


    }

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

      try{
        let canvas = await driver.findElement(By.tagName('canvas'))
        await driver.wait(playVideo(driver, canvas), 100000000);
        console.log('视频播放成功');
      }catch(ex){
        success = false
        console.error('视频播放失败：'+id, ex);
      }
    }

    return success

  }

  async goQuiz(lesson,num){
    let driver = this.driver
    let isFinish = lesson.isFinish;
    let id = lesson.id

    if (isFinish == '未完成') {
      console.log('course-----:', lesson);
      let url = lesson.url
      let lessonTitle = lesson.title
      let { title } = CouseUrlMap[this.couseTitle]

      console.log('this.couseTitle---:',this.couseTitle);
      if (title == '习近平新时代中国特色社会主义思想') {
        await handleMaoGaiQuiz(driver, url, id ,num,true)
      }else if(title == '国家开放大学学习指南'){
        await handleZhiNanQuiz(driver, url, id ,num,true)
      }else if(title == '思想道德修养与法律基础'){
        await handleSiXiuQuiz(driver, url, id ,num,true)
      }else if(title == '毛泽东思想和中国特色社会主义理论体系概论'){
        await handleMaoQuiz(driver, url, id ,num,true)
      }else if (title == '马克思主义基本原理概论') {
        await handleMaKeSiQuiz(driver, url, id ,num,true)
      }else if (title == '中国近现代史纲要'){
        await handleJinDaiShiQuiz(driver, url, id ,num,true)
      }
      console.log('this quiz is done');
    }


  }

  // 通过api去看视频
  async watchVideoByApi(lesson){
    // $.getJSON('http://shenyang.ouchn.cn/theme/blueonionre/modulesCompletion.php?cmid=437329&id=3935&sectionid=27', function(res){ console.log(res)})
    console.log('==================watchVideo=================');
    let success = true
    let driver = this.driver
    let isFinish = lesson.isFinish;
    let id = lesson.id
    let classId = lesson.classId
    let sectionId = lesson.sectionId
    if (isFinish == '未完成') {
      console.log('course-----:', lesson);
      let url = lesson.url
      let title = lesson.title
      await driver.get(url);
      // 可能被重定向到 xxx.pdf

      try{
        let video = await driver.wait(until.elementLocated(By.tagName('video')), 10000);
        let script = `$.ajaxsettings.async = false; var res = $.getJSON('/theme/blueonionre/modulesCompletion.php?cmid=${id}&id=${classId}&sectionid=${sectionId}'); return res;`
        let res = await driver.executeScript(script);
        console.log('视频播放成功', res);
      }catch(ex){
        success = false
        console.error('视频播放失败：'+id, ex);
      }
    }

    return success


  }

  // 当前在主页，打开所有课程页面
  // 确定当前课程的url 和 code
  //需要点击一下 ‘进入学习’，获得访问权限 地区.ouchn.cn/course
  async prepareForLearn(couseTitle) {
    let driver = this.driver
    let mainHandle = await driver.getWindowHandle()
    let links = await this.getCousesLinks(driver);
    for(let i=0;i<links.length;i++){
      let a = links[i];
      let displayed = await a.isDisplayed()
      console.log(" isDisplayed ", displayed)

      driver.wait(function() {
        return a.isDisplayed().then(function(isDisplayed) {
          return isDisplayed === true;
        });
      }, 1500);
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
      return handles.length == links.length+1
    }, 30000, `错误：${links.length}课程窗口没有打开`)

    console.log('all tab opened2, links', couseTitle);
    let handles = await driver.getAllWindowHandles()

    let url = ''
    for (let i = 0; i < handles.length; i++) {
      let handle = handles[i]
      console.log("mainHandle", i, mainHandle, "handle = ", handle)
      if (mainHandle != handle) {
        let locator = driver.switchTo()
        await locator.window(handle)
        let windowTitle = await driver.getTitle() // 课程： 习近平新时代中国特色社会主义思想
        let title = windowTitle.replace('课程： ', '')
        let url = await driver.getCurrentUrl()
        let parsedUrl = URL.parse(url, true)
        let code = parsedUrl.query['id']
        console.debug("windowTitle, parsed= ", windowTitle, parsedUrl);
        if( code ){
          CouseUrlMap[code] = { url, title, code:code  } // [id] = url
          CouseUrlMap[title] = { url, title, code:code  }   // [习近平新时代中国特色社会主义思想] = url
        }
        // 如果找到当前这门课的窗口
        if (couseTitle && windowTitle.indexOf(couseTitle) >= 0) {
          this.couseUrl = url
          this.couseTitle = couseTitle
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
  async profileCouse(courseCodeOrTitle) {
    // 毛泽东思想和中国特色社会主义理论体系概论, 统计学原理   思想道德修养与法律基础  管理学基础
    //  经济数学基础  计算机应用基础
    this.couseTitle = courseCodeOrTitle || this.couseTitle
    console.debug("profileCouse=", courseCodeOrTitle, CouseUrlMap);
    let couse = null
    if( courseCodeOrTitle ){
      couse = CouseUrlMap[courseCodeOrTitle]

    }else{
      couse = CouseUrlMap[this.couseTitle]
    }

    if (couse) {
      let { url, title } = couse
      // 第二次递归时，必须先访问url
      let startAt = new Date()
      await this.driver.get(url)
      let windowTitle = await this.driver.getTitle()
      let couseTitle = windowTitle.replace('课程： ', '')
      console.log(" tab.title1 ", title, this.couseTitle, typeof(this.couseTitle))
      if (title == '毛泽东思想和中国特色社会主义理论体系概论') {
        this.courseInfo = await parseCouseMaoGai( this.driver )
      } else if (title == '国家开放大学学习指南') {
        this.courseInfo = await parseCouseZhiNan( this.driver )
      } else if (title == '习近平新时代中国特色社会主义思想') {
        this.courseInfo = await parseCouseMaoGai( this.driver )
      } else if (title == '思想道德修养与法律基础') {
        this.courseInfo = await parseCouseMaoGai( this.driver )
      } else if (title == '中国近现代史纲要') {
        this.courseInfo = await parseCouseJinDaiShi( this.driver )
      }else if (title == '马克思主义基本原理概论') {
        this.courseInfo = await parseCouseMaKeSi( this.driver )
      }
      let position = 0;
      for(let i=0;i<this.courseInfo.status.length;i++){
        if(this.courseInfo.status[i].type == 'quiz'){
          this.courseInfo.status[i].position = position;
          position++;
        }
      }

      let endAt = new Date()
      this.courseInfo.score.startAt = startAt
      this.courseInfo.score.endAt = endAt
      this.saveCouseJson(this.couseTitle)
    } else {
      console.debug(`课程代码 ${ this.couseTitle} ${courseCodeOrTitle} 找不到课程url`);
    }
  }

  async getCousesLinks(driver) {
    // 等待 zaixuekecheng dom生成

    // 支持的课程

    let couseTitles = SupportCouses.map((c)=>c.title)
    let links = []
    await driver.wait(until.elementLocated(By.id('zaixuekecheng')));
    let div = await driver.findElement(By.id('zaixuekecheng'));
    let couses = await driver.findElements(By.css('#zaixuekecheng .media'));
    console.debug("getCousesLinks couses=",couses.length);
    for(let i=0;i <couses.length; i++){
      let couse = couses[i]
      let titleElement = await couse.findElement(By.css('.media-title'));
      let title = await titleElement.getText()
      let buttonElement = await couse.findElement(By.css('.course-entry button'));
      let text = await buttonElement.getText()
      console.debug("getCousesLinks couse=",title, text);
      if( couseTitles.includes( title )){
        links.push(buttonElement)
      }
    }
    // 不知因为什么原因会多一个, 可能是angular生成的隐藏button对象，
    return links
  }

  async saveCouseJson(classId) {
    let filename = await this.getCouseJsonPath(classId)
    //console.log('this.courseInfo----:',this.courseInfo);
    fs.writeFile(filename, JSON.stringify(this.courseInfo), (err) => {
      if (err) throw err;
      console.log(`文件已被保存:${filename}`);
    });
  }

  async getCouseJsonPath(couseTitle) {
    let dir = './db/students'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    let filename = dir + '/' + this.username + '_' + couseTitle + '.json'
    return filename
  }

  async createAnswerList(couseTitle){
    let answerList = new AnswerList()
    let jsonStr =''
    let filename = null
    let couse = CouseUrlMap[couseTitle]
    if( couse ){

      let { url, title } = couse

      if (title == '习近平新时代中国特色社会主义思想') {
        jsonStr = answerList.makeXiAnswerJson("./db/answers/xi.txt")
        filename = './db/answers/xiList.json'
      }else if(title == '国家开放大学学习指南'){
        let answerList = new AnswerList()
        jsonStr = answerList.makeZhiNanAnswerJson("./db/answers/zhinan.txt")
        filename = './db/answers/zhinanList.json'
      }else if(title == '思想道德修养与法律基础'){
        let answerList = new AnswerList()
        jsonStr = answerList.makeSiXiuAnswerJson("./db/answers/sixiu.txt")
        filename = './db/answers/sixiuList.json'
      }else if(title == '毛泽东思想和中国特色社会主义理论体系概论'){
        let answerList = new AnswerList()
        jsonStr = answerList.makeMaoAnswerJson("./db/answers/mao.txt")
        filename = './db/answers/maoList.json'
      }else if(title == '马克思主义基本原理概论'){
        let answerList = new AnswerList()
        jsonStr = answerList.makeMaoAnswerJson("./db/answers/makesi.txt")
        filename = './db/answers/makesiList.json'
      }else if(title == '中国近现代史纲要'){
        let answerList = new AnswerList()
        jsonStr = answerList.makeJinDaiShiAnswerJson("./db/answers/jindaishi.txt")
        filename = './db/answers/jindaishiList.json'
      }
      if( filename ){
        fs.writeFile(filename, JSON.stringify({answers:jsonStr}), (err) => {
          if (err) throw err;
          console.log(`课程测验答案已被保存:${filename}`);
        });
      }else{
        console.log(`没有课程测验答案:${couseTitle}`);
      }
    }else{
      console.error(`无法找到课程:${couseTitle}`);

    }

  }

  // 取得科目的形考成绩
  async getSummary(couseTitles ){
    let driver = this.driver
    let summaries = []
    await driver.wait(until.elementLocated(By.id('zaixuekecheng')));
    let div = await driver.findElement(By.id('zaixuekecheng'));
    let couses = await driver.findElements(By.css('#zaixuekecheng .media'));
    console.debug("getSummary couses=",couses.length);
    for(let i=0;i <couses.length; i++){
      let couse = couses[i]
      let titleElement = await couse.findElement(By.css('.media-title'));
      let title = await titleElement.getText()
      let buttonElement = await couse.findElement(By.css('.course-entry button'));
      let text = await buttonElement.getText()
      // [必修6学分, 形考成绩: 99,本班排名: 3/12, 有43个作业和测验待完成]

      if( couseTitles.includes( title )){
        let sumary = { title: title}
        let infoElements = await couse.findElements(By.css('.course-content p'));
        let todo = await infoElements[3].getText()
        let score =  await infoElements[1].getText()
        sumary.username = this.username
        sumary.todo = todo
        sumary.score = score
        console.debug("getSummary couse=",title, text, todo, score);
        summaries.push( sumary)
      }
    }
    return summaries

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
