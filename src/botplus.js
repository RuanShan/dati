const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const {
  getCourseNameByCode,
  scrollToBottom,
  playVideo,
  handleDelay
} = require('./utilplus')
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



const {
  parseCouseBase,
  handleQuizBase,
  copyQuizBase,
  copyQuizBaseByReview
} = require('./couses/baseplus')

class BotPlus {

  constructor(driver, options = {}) {
    // if( !user || !password){
    //   throw  new Error( "用户名和密码是必须的")
    //
    // }
    this.mainPage = null;
    this.cousePage = null;
    this.mainHandle = null;
    this.driver = driver;
    this.username = options.username
    this.password = ''

    this.couseTitle = '' // 当前课程名称
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
        this.couseInfo.status = res;
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
   * 登录账户 done
   * @param {Object} options - type - 学习某一类型的章节
   * @return {bool} 登录是否成功
   */
  async login(username, password) {

    this.username = username
    this.password = password
    let driver = this.driver

    let page = await driver.get('http://passport.ouchn.cn/Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Dstudentspace%26redirect_uri%3Dhttp%253A%252F%252Fstudent.ouchn.cn%252F%2523%252Fsignin-oidc%2523%26response_type%3Did_token%2520token%26scope%3Dopenid%2520profile%2520ouchnuser%2520ouchnstudentspaceapi%26state%3Df2b1c4eebd354996ab8f0c3b618f39d1%26nonce%3D044e6125331b4db298c6acf33b1058dd');
    //await driver.get('http://passport.ouchn.cn/Account/Login?ReturnUrl=%2F');
    await page.type('#username', username)
    await page.type('#password', password)
    // await page.click(".login-form button[value='login']")
    //await driver.findElement(By.id('username')).sendKeys(username);
    //await driver.findElement(By.id('password')).sendKeys(password);
    //await handleVerifyCode(driver)
    //let loginButton = await driver.findElement(By.css(".login-form button[value='login']"));
    //await loginButton.click();
    let success = false
    //最多等待15秒
    try {
      const [response] = await Promise.all([  page.waitForNavigation( ),  page.click(".login-form button[value='login']") ]).catch(async (e)=>{
        // 偶尔会没有重定向，需要重新请求一下
        console.error( '未知问题登录失败，尝试再次打开http://student.ouchn.cn/')
        await page.goto('http://student.ouchn.cn/')
      });
      
      let url = await page.url()

      if(url.startsWith('http://passport.ouchn.cn')){
        logger.error(`登录失败 ${username}!!`);
      } else{
        console.info('登录成功!!');
        success = true
        await page.goto('http://student.ouchn.cn/')
      }
      
      // await driver.wait(until.titleContains('学生空间'), 10000).
      // then(async ()=>{
      //   await driver.wait(until.titleContains('学生空间'), 10000);
      //   await driver.get('http://student.ouchn.cn/')
      // }).catch(async ()=>{
      // // 偶尔可能没有反应，直接进入学生主页，等待10秒
      //   await driver.get('http://student.ouchn.cn/')
      //   await driver.wait(until.titleContains('学生空间'), 10000);
      // })

      // 用于打开其它窗口后，再回来打开其它课程
      //this.mainHandle = await driver.getWindowHandle()

    } catch (e) {
      logger.error('登录失败!!', e);
    }
    this.mainPage = page
    return success
  }

  async logout() {
    let url = 'http://passport.ouchn.cn/Account/Logout?logoutId=student.ouchn.cn'
    await this.driver.get(url)
  }
  /**
   * 学习一门课程, 
   * 根据 课程章节id，开始学习 
   * @param {Object} options - type - 学习某一类型的章节
   * @param {*} res
   */
  async learnCouse(options={}) {
    
    
    let typeFilter = options.type
    let lessionIndex = options.lessionIndex || 0
    console.info("课程学习中", this.couseTitle, 'options=', options,  this.couseInfo.status.length)
    
   
    let moduleStatus = this.couseInfo.status
     

    for (let i = 0; i < moduleStatus.length; i++) {
      let lesson = moduleStatus[i];
      let isFinish = lesson.isFinish;
      let url = lesson.url
      let type = lesson.type
       
      if( i< lessionIndex ){
        continue
      }
      if (typeFilter && typeFilter != type) {
        continue
      }
      try{
       
        let title = lesson.title
        logger.info(`学习小节${title} url=${url}`)
        let done = false
        if (type == 'video') {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          let success = await this.watchVideoByApi(lesson)
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
      }catch(e){
        console.error( `无法学习课程 ${lesson.title} url=${url} account=${this.username}`,e);
        logger.error( `无法学习课程 ${lesson.title} url=${url} account=${this.username} `,e)
      }
    }
    //

 
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

      let page = await driver.get(url);
      console.debug(`before reading ${ title}`);
      await scrollToBottom(page)
      
      console.debug(`after reading${ title}`);

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

      let fullname = `${title}_${code}`
      let answerfile = `./db/answers/${fullname}.json`
      let json = JSON.parse(fs.readFileSync(answerfile,'utf8'));
      let answsers = json.answers
      // 加载题库文件

      console.log('this.couseTitle---:', this.couseTitle);
      if (title == '习近平新时代中国特色社会主义思想') {
        await handleQuizBase(driver, url, options, answsers, num )
      } else if (title == '国家开放大学学习指南') {
        await handleQuizBase(driver, url, options, answsers, num )
      } else if (title == '思想道德修养与法律基础') {
        await handleQuizBase(driver, url, options, answsers, num )
      } else if (title == '毛泽东思想和中国特色社会主义理论体系概论') {
        await handleQuizBase(driver, url, options, answsers, num )
      } else if (title == '马克思主义基本原理概论') {
        await handleQuizBase(driver, url, options, answsers, num )
      } else if (title == '中国近现代史纲要') {
        await handleQuizBase(driver, url, options, answsers, num )
      } else  {  
        await handleQuizBase(driver, url, options, answsers, num )
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

    
    let page = await driver.get(url)

    await page.waitForSelector( '.singlebutton button.btn-secondary');
    const commitButton = await page.$( '.singlebutton button.btn-secondary')
    // 等待commit的click功能
    await commitButton.click()
    await handleDelay(300);
    console.debug("编辑按钮")

    // 可能会超时，需要重新加载
    await page.waitForSelector('iframe', {timeout:45000}).catch(async(e)=>{
      console.error( " TimeoutError: waiting for selector iframe", e)
      await page.reload()
    }); 

    // 多等一会  failed: timeout 30000ms exceeded
    const textBody = await page.$('iframe')

    let fullname = `${this.couseTitle}_${classId}`

    let answerText = "";
    let filepath = `./db/subjects/${fullname}_final.txt`
    if( fs.existsSync( filepath )){
      filepath = `./db/subjects/final/${this.couseTitle}.txt`
      answerText = fs.readFileSync(filepath,'utf8')

    }else{
      filepath = `./db/subjects/final/${this.couseTitle}.txt`
      answerText = fs.readFileSync(filepath,'utf8')

    }

    await textBody.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    await textBody.type( answerText )

    await page.waitForSelector('.form-group input.btn-primary');
    const saveButton = await page.$('.form-group input.btn-primary')
    await saveButton.click()
    // 现在这里就直接保存了，需要延时以免数据没有提交成功
    await handleDelay(300);

    // 点击提交按钮
    if( options.submitfinal == 'yes'){
      let submitButtonCss = '.submissionaction:last-child form button.btn-secondary'
      await page.waitForSelector(submitButtonCss);
      console.debug("查找提交按钮")
      const submitButton = await page.$(submitButtonCss)
      await submitButton.click()
      console.debug("点击提交按钮")
      let confirmButtonCss = '.submitconfirm #id_submitbutton'
      await page.waitForSelector(confirmButtonCss);
      const confirmButton = await page.$( confirmButtonCss )
      await confirmButton.click()
      // 延时以免数据没有提交成功
      await handleDelay(300);
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
      let page = await driver.get(`http://${course.host}/mod/url/view.php?id=${id}`);
      // 可能被重定向到 xxx.pdf
      try {
        // puppeteer 不支持video，这里获取div#video. 直接执行ajax
        let video = await page.waitForSelector('#video');
        let script = `jQuery.ajaxSetup({ async : false}); var res = null; jQuery.getJSON('/theme/blueonionre/modulesCompletion.php?cmid=${id}&id=${classId}&sectionid=${sectionId}', function(data){ res = data; }); ;`
        // "视频播放延时1秒, 防止API没有成功！"
        let res = await page.evaluate(script);
        await handleDelay(500);
         
        console.log('视频播放成功', typeof(res), res);
      } catch (ex) {
        success = false
        logger.error(`视频播放失败：${this.username} ${id} ${ex}`);
        console.error('视频播放失败：' + id, ex);
      }
    }

    return success


  }


  /**
   * 生成测验题库 
   * 调用前需先调用 
   * @param {string} couseTitle -  如：“中国特色社会主义理论体系概论”
  */
  async copyQuiz( couseTitle, byreview = false ) {

    await this.prepareForLearn( couseTitle )

    let {
      title,
      code,
      host
    } = CouseUrlMap[couseTitle]

    let fullname = `${title}_${code}`
    let filename = `db/subjects/${fullname}.json`
    // 加载课程数据文件
    this.getLog( couseTitle, { filename } )
    

    let urlbase = `http://${host}/mod/quiz/view.php`
    
    let lessons = this.couseInfo.status
    
    let quizArray = []
    
    if( byreview ) {
      quizArray = await copyQuizBaseByReview( this.driver, urlbase, lessons )
    }else{
      quizArray = await copyQuizBase( this.driver, urlbase, lessons )
    }
      // 生成试题文件
    let answerfile = `db/answers/${fullname}.txt`

    let answerStr = ''
    let LE =  "\r\n"
    for( let i=0; i<quizArray.length; i++){
      let quiz = quizArray[i];
      answerStr = answerStr.concat( `形考${(i+1)} ${LE}` )
      for( let j = 0; j<quiz.length; j++ ){
        let question = quiz[j]
        let { title, options, type, answer} = question

        let line = ''
        if( type =='h1'){
          line =  title + LE
        }else if( type == 'select'){
          line =  `问题 ${title} ${LE}${options} ${LE}答案 ${answer} ${LE}`
        }else if( type == 'tof'){
          line =  `问题 ${title} ${LE}${options} ${LE}答案 ${answer} ${LE}`
        }

        answerStr = answerStr.concat( line )
      }
    }

    fs.writeFileSync(answerfile, answerStr);

    let answerList = []
    for( let i=0; i<quizArray.length; i++){
      let quiz = quizArray[i];
      // 有时为空，需要跳过
      answerList[i] = []
      let level2 = 0
      for( let j = 0; j<quiz.length; j++ ){
        let question = quiz[j]
        let { title, options, type, answer} = question
        
        if( type =='h1'){
          
          answerList[i][level2] = []
          level2+=1
        }else if( type == 'select'){
          answerList[i][level2-1].push( { title, answer })
          
        }else if( type == 'tof'){
          answerList[i][level2-1].push( { title, answer })
        }

      }
    }
    let answerjson = `db/answers/${fullname}.json`

    // console.log( "answerjson", answerjson)
    fs.writeFileSync(answerjson, JSON.stringify({ answers: answerList}));

  }

  /**
   * 确定当前课程的url 和 code
   * 需要点击一下 ‘进入学习’，获得访问权限 地区.ouchn.cn/course
   * @param {string} couseTitle -  如：“4498_中国特色社会主义理论体系概论”
   * @return {object} course 当前课程信息 或 null/undefined
   */

  async prepareForLearn(couseTitle) {
    console.log( "============= prepareForLearn0 =============")
    // 处理 “4498_中国特色社会主义理论体系概论” 情况, 避免 "人文英语3" 中的3被清除
    couseTitle = couseTitle.replace(/^[\d_-\s]+/, '')
    let driver = this.driver
    let browser = driver.browser
    let mainPage = this.mainPage //await driver.getWindowHandle()
    let links = await this.getCousesLinks(mainPage, couseTitle);
    if (links.length == 0) {
      console.error('无法找到课程' + couseTitle)
      return false
    }
    console.log( 'links', links.length)
    // https://segmentfault.com/q/1010000019135401
    // https://www.zhihu.com/question/306082778/answer/556674503
    // 每次点击新建页面，需要关闭
    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page()))); 

    await links[0].click()
    
    const cousePage = await newPagePromise 
     
    let success = false
    let url = null
        
        // 等待页面加载成功，title包含 ‘课程’

        // 需要等待页面加载完成，即标题有中包含 课程
        //await driver.wait(until.titleContains('课程'));
        let windowTitle = await cousePage.title() // 课程： 习近平新时代中国特色社会主义思想
        url = await cousePage.url() //http://shenyang.ouchn.cn/course/view.php?id=4372
        let parsedUrl = URL.parse(url, true)
        let code = parsedUrl.query['id']
        // 如果找到当前这门课的窗口,
        // cousetitle=计算机应用基础(本)   windowtitle = 计算机应用基础（本）
        //   "Photoshop图像处理".toLowerCase() => "photoshop图像处理"

        let tidyWindowTitle = windowTitle.replace(/[\(\)（）]/g, '').toLowerCase()
        let tidyCouseTitle = couseTitle.replace(/[\(\)（）]/g, '').toLowerCase()
        console.debug(`couseTitle=${couseTitle} windowTitle = ${windowTitle}, url= ${url} code=${code} tidyWindowTitle=${tidyWindowTitle} tidyCouseTitle=${tidyCouseTitle}`);

        if (tidyCouseTitle && tidyWindowTitle.indexOf(tidyCouseTitle) >= 0) {
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
        }
       
    cousePage.close()
    console.log("current window url=", url)
    this.recursiveCount = 0

    console.log( "============= prepareForLearn1 =============")

    return CouseUrlMap[couseTitle]
  }

  async learnFinal(options) {

    console.log( "============= learnFinal =============")
    console.log( "this.couseInfo.status", this.couseInfo.status.length)

    let moduleStatus = this.couseInfo.status
    
      for (let i = 0; i < moduleStatus.length; i++) {
        let lesson = moduleStatus[i];
        try{
          if ((lesson.title == '终结性考试' || lesson.title == '大作业')&& lesson.type =='assign') {
            await this.goFinal(lesson, options)
          }
        }catch(e){
          console.error( `无法学习课程 ${lesson.title} url=${lesson.url} account=${this.username}`,e);
          logger.error( `无法学习课程 ${lesson.title} url=${lesson.url} account=${this.username}`,e)
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
    console.log( "============= profileCouse0 =============")

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
      let cousePage = await this.driver.get(url)
      let windowTitle = await cousePage.title()

      console.log(" tab.title1 ", title, this.couseTitle, typeof(this.couseTitle))

      let bybase = [ '国家开放大学学习指南','思想道德修养与法律基础','马克思主义基本原理概论','毛泽东思想和中国特色社会主义理论体系概论','中国特色社会主义理论体系概论','习近平新时代中国特色社会主义思想', '中国近现代史纲要']
      
      if (bybase.includes(title)) {
        this.couseInfo = await parseCouseBase(cousePage)
      } else{
        this.couseInfo = await parseCouseBase(cousePage)
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
      // 无需关闭，每次driver都用第一个tab打开，如果关闭，browser会关闭
      // await cousePage.close();
    } else {
      console.debug(`课程代码 ${ this.couseTitle} ${courseCodeOrTitle} 找不到课程url`);
    }
    console.log( "============= profileCouse1 =============")

    return this.couseInfo
  }

  async getCousesLinks(mainPage, couseTitle) {

    
    // 支持的课程
    let links = []
    try{
    
      await mainPage.waitForSelector('#zaixuekecheng .media');
      let div = await mainPage.$('#zaixuekecheng');
      let couses = await mainPage.$$('#zaixuekecheng .media');
      console.debug("getCousesLinks couses=", couseTitle, couses.length);
      for (let i = 0; i < couses.length; i++) {
        let couse = couses[i]
        //let titleElement = await couse.$eval('.media-title', node=> node.innerText );
        let title =  await couse.$eval('.media-title', node=> node.innerText );
        let buttonElement = await couse.$('.course-entry button');
        //let text =  await couse.$eval('.course-entry button', node=>node.innerText );
        //   title="★中级财务会计（一）"  couseTitle = "中级财务会计（一）"
        //   "Photoshop图像处理".toLowerCase() => "photoshop图像处理"

        title = title.toLowerCase()
        console.debug("getCousesLinks couse=", title, title.includes(couseTitle));
        if (title.includes(couseTitle)) {
          links.push(buttonElement)
        }
      }

    }catch(e){
      logger.error(`无法读取课程链接 ${this.username} ${this.password} ${couseTitle}`);
      let path = `./db/log/${couseTitle}_${this.username}.jpg`
      await mainPage.screenshot({type: 'jpeg', path: path})
    }
    // 不知因为什么原因会多一个, 可能是angular生成的隐藏button对象，
    return links
  }

  async saveCouseJson(classId) {
    let filename = await this.getCouseJsonPath(classId)
    //console.log('this.couseInfo----:',this.couseInfo);
    // 保存 课程信息时只保存status 即每一课的信息，以便和快速开视频使用相同的结构的文件
    //fs.writeFileSync(filename, JSON.stringify(this.couseInfo.status) );
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

      let fullname = `${title}_${code}`
      if (title == '习近平新时代中国特色社会主义思想') {
        jsonStr = answerList.makeXiAnswerJson("./db/answers/xi.txt")
        filename = `./db/answers/${fullname}.json`
      } else if (title == '国家开放大学学习指南') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeZhiNanAnswerJson("./db/answers/zhinan.txt")
        filename = `./db/answers/${fullname}.json`
      } else if (title == '思想道德修养与法律基础') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeSiXiuAnswerJson("./db/answers/sixiu.txt")
        filename = `./db/answers/${fullname}.json`
      } else if (title == '毛泽东思想和中国特色社会主义理论体系概论') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeMaoAnswerJson("./db/answers/mao.txt")
        filename = `./db/answers/${fullname}.json`
      } else if (title == '马克思主义基本原理概论') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeMaoAnswerJson("./db/answers/makesi.txt")
        filename = `./db/answers/${fullname}.json`
      } else if (title == '中国近现代史纲要') {
        let answerList = new AnswerList()
        jsonStr = answerList.makeJinDaiShiAnswerJson("./db/answers/jindaishi.txt")
        filename = `./db/answers/${fullname}.json`
      } else {
        // 可能答案文件不存在，无法生成
        let answerList = new AnswerList()
        let answerfile = `./db/answers/${fullname}.txt`
        if( fs.existsSync( answerfile)){
          jsonStr = answerList.makeAnswerJsonBase()
          filename = `./db/answers/${fullname}.json`            
        }
      }
      if (filename ) {
        console.log( "课程测验答案",filename)
        fs.writeFileSync(filename, JSON.stringify({
          answers: jsonStr
        }));
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
    let url = 'http://student.ouchn.cn/'
    let page = await driver.get( url )
     await page.waitForSelector( '#zaixuekecheng');
    let div = await page.$( '#zaixuekecheng');
    let couses = await page.$$( '#zaixuekecheng .media' );
    console.debug("getSummary couses=", couses.length);
    for (let i = 0; i < couses.length; i++) {
      let couse = couses[i]
      let title = await couse.$eval( '.media-title', node => node.innerText);
      
      let text = await couse.$eval( '.course-entry button', node => node.innerText);

      // [必修6学分, 形考成绩: 99,本班排名: 3/12, 有43个作业和测验待完成]

      if (couseTitles.includes(title)) {
        let sumary = {
          title: title
        }
        let infoElementWrap = await couse.$('.course-content');
        let todo = await infoElementWrap.$eval('p:nth-child(4)', node => node.innerText) // [3].getText()
        let score = await infoElementWrap.$eval('p:nth-child(2)', node => node.innerText)
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
    // let driver = this.driver
    // let mainHandle = this.mainHandle
    // let handles = await driver.getAllWindowHandles()

    // let locator = await driver.switchTo()

    // for (let i = 0; i < handles.length; i++) {
    //   let handle = handles[i]
    //   console.log("mainHandle0", i, mainHandle, "handle = ", handle)
    //   if (mainHandle != handle) {
    //     try {
    //       await locator.window(handle)
    //       // 等待0.5秒，否则报错  target window already closed
    //       // await  driver.wait( function(){
    //       //   return new Promise((resolve, reject) => {
    //       //     setTimeout(resolve, 500);
    //       //   })
    //       // });

    //       await driver.close()
    //     } catch (e) {
    //       console.error("driver.close", e);
    //     }
    //   }
    // }
    // await locator.window(mainHandle)
    // await driver.wait(until.titleContains('学生空间'), 20000);
    // console.debug("closeOtherTabs1");
   
  }

  // 获取课程详细信息, prepareForLearn后才能使用
  getCourseInfo(couseTitle){
    let couse = CouseUrlMap[couseTitle]
    return couse
  }

  /**
   * 
   * @param {*} couseTitle 
   * @param {*} filename 
   */
  async loadCouseFile(couseTitle, filename ) {
     
    this.couseTitle = couseTitle
         
    if (fs.existsSync(filename)) {
      let data = fs.readFileSync(filename, "utf-8")
      if (data != null) {

        let res = JSON.parse(data);
        console.info(`读取课程数据 ${couseTitle}`);
        this.courseInfo.status = res;
      }
    } else {
      logger.error(`无法读取课程数据文件 ${filename}`);
      filename = null
    }

    return filename
  }

}



module.exports = {
  BotPlus
}
