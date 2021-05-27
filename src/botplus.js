const {
  scrollToBottom,
  playVideo,
  handleDelay,
  buildCouseTitle,
  isXingkaoLessonTitle
} = require('./utilplus')
const fs = require('fs');
const URL = require('url');

const { log } = require('./logger');

const lessonStateEnum = {
  initial: '未完成',
  completed: '完成'
}


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
  parseCouse,
  handleQuizBase,
  copyQuizBase,
  copyQuizBaseByReview,
  submitPlainQuizBase
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
  /**
   * 
   * @param {*} couseTitle 
   * @param {*} options 
   * @return {boolean} 是否成功 
   */
  async getLog(couseTitle, options = {}) {
    let success = false
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
        this.couseInfo.status = res;
        success  = true
      }
    } else {
      log.error(`无法读取课程数据文件 ${filename}`);
      success = false
    }

    return success
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
    let url1 = 'http://passport.ouchn.cn/Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Dstudentspace%26redirect_uri%3Dhttp%253A%252F%252Fstudent.ouchn.cn%252F%2523%252Fsignin-oidc%2523%26response_type%3Did_token%2520token%26scope%3Dopenid%2520profile%2520ouchnuser%2520ouchnstudentspaceapi%2520offline_access%26state%3D3e1197c784234af2b9cf49089e7c94e5%26nonce%3D8054db32701f4f5c85a9323795fab166';
    let url2 = 'http://passport.ouchn.cn/Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Dstudentspace%26redirect_uri%3Dhttp%253A%252F%252Fstudent.ouchn.cn%252F%2523%252Fsignin-oidc%2523%26response_type%3Did_token%2520token%26scope%3Dopenid%2520profile%2520ouchnuser%2520ouchnstudentspaceapi%26state%3Df2b1c4eebd354996ab8f0c3b618f39d1%26nonce%3D044e6125331b4db298c6acf33b1058dd'
    let page = await driver.get(url1);
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
        log.error( '未知问题登录失败，尝试再次打开 http://student.ouchn.cn/')
        await page.goto('http://student.ouchn.cn/')
      });
      
      let url = await page.url()

      if(url.startsWith('http://passport.ouchn.cn')){
        log.error(`登录失败 ${username}`);
      } else{
        log.info(`登录成功 ${username}`);
        success = true
        await page.goto('http://student.ouchn.cn/')
      }

    } catch (e) {
      log.error('登录异常', e);
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

    // log.debug( `课程学习中 ${this.couseTitle}`, '参数', options )
    
   
    let moduleStatus = this.couseInfo.status
     

    for (let i = 0; i < moduleStatus.length; i++) {
      let lesson = moduleStatus[i];
      let { isFinish, url, type, title, sectionTitle } = lesson;
       
      let matchType =  (typeFilter.search( type )>=0);
      log.debug( `课程学习中 typeFilter=${typeFilter} type= ${type}  matchType=${matchType}`, !isXingkaoLessonTitle( title, sectionTitle )  )

      if( typeFilter.startsWith( 'xingkao') ){
        if(  !isXingkaoLessonTitle( title, sectionTitle ) ){
          continue
        }
      }else  if (  !matchType) {
        continue
      }
      
      try{
       
        
        log.debug(`学习小节${title} url=${url}`)
        let done = false
        if (type=='ppt')   {
          // pdf, ppt 学习
         
          await this.readPpt(lesson)
          isFinish = '完成'

        } else  if (type == 'video') {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          let success = await this.watchVideoByApi(lesson)
          if (success) {
            isFinish = '完成'
          }
        } else if (type=='page' && typeFilter != 'xingkao') {
          // 形考不处理页面
          if(url.includes('/mod/page/view')){
            await this.readText(lesson)
            isFinish = '完成'
          }

        } else if (type == 'quiz') {
          // 只有类型为答题时，再答题，以免多次答题
          if (typeFilter == 'xingkao') {
            if( isXingkaoLessonTitle( title, sectionTitle )){
              await this.goXingkao(lesson,  options)
            }
          }else if(typeFilter == 'quiz' )
          {            
            await this.goQuiz(lesson, options)
            isFinish = '完成'
          }
        } else if (type == 'assign' || type == 'boost_assign') {
          // 课程 parseCouseBase2 分析的结构 type = boost_assign， 如：幼儿园课程论
          // 形式考试，提交文件
          if (typeFilter == 'xingkaofinal') {
            if( isXingkaoLessonTitle( title, sectionTitle )){
              await this.goFinal(lesson,  options)
            }
          }
        } else if (type == 'forum') {
          // 形式考试，提交文件
          if (typeFilter == 'xingkaoforum') {
            if( isXingkaoLessonTitle( title, sectionTitle )){
              await this.goForum(lesson,  options)
            }
          }
          
        }else {
          log.error(`无法识别的课程url =${url}`)
        }
        // 每学完一课，更新一下数据文件
        lesson.isFinish = isFinish
        if (isFinish == '完成') {
          //this.saveCouseJson(this.couseTitle)
        }
      }catch(e){
        log.error( `无法学习课程 ${lesson.title} url=${url} account=${this.username} `,e)
      }
    }
    //

 
  }


  async learnModule(moduleCode, options) {

    log.info(`课程${ this.couseTitle} 小节 ${moduleCode} 开始学习。`)
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
      //   log.debug(`小节 ${title} 没有 url`);
      //   continue
      // }
      if (isFinish == '未完成' && lesson.id == moduleCode) {
        // 根据url判断类型
        // 视频|外部文章：mod/url/view
        // 文本: mod/page/view
        // 专题测验：mod/quiz/view
        // 考核说明：mod/resource/view, 重定向到pdf
        log.debug(`类型 ${type} 小节 ${title} `);
        if (type == 'video') {
          //http://anhui.ouchn.cn/course/view.php?id=4257&sectionid=91623&mid=561704
          success = await this.watchVideoByApi(lesson)
        } else if (url.includes('/mod/page/view')) {
          await this.readText(lesson)
        } else if (type == 'quiz') {

          await this.goQuiz(lesson,  options)
        } else {
          log.error(`无法识别的课程url =${url}`)
        }
      }
      //  log.error(`无法识别的小节代码 =${moduleCode}`)


    }
    log.debug(` 小节 ${moduleCode} 学习结束 ${success} `);

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
      log.debug(`before reading ${ title}`);
      await scrollToBottom(page)
      
      log.debug(`after reading${ title}`);

    }
  }
  
  async readPpt(lesson) {
    var driver = this.driver
    let success = true

    let isFinish = lesson.isFinish;
    let lessonId = lesson.id

    if (isFinish == '未完成') {
      let { host  } = CouseUrlMap[this.couseTitle]
      let url = `http://${host}/mod/url/view.php?id=${lessonId}`

      let title = lesson.title

      let page = await driver.get(url);
      log.debug(`before reading ${ title}`);
      // 点击进入
      try {
        let enterButton = await page.$( '#ck a')
        await enterButton.click()
        await handleDelay(500);
      } catch (ex) {
        success = false
        log.error('PPT播放失败：' + lessonId, ex);
      }
      log.debug(`after reading${ title}`);

    }
    return success

  }

  async watchVideo(lesson) {
    log.log('==================watchVideo=================');
    let success = true
    let driver = this.driver
    let isFinish = lesson.isFinish;
    let id = lesson.id

    if (isFinish == '未完成') {
      log.log('course-----:', lesson);
      let url = lesson.url
      let title = lesson.title
      await driver.get(url);
      // 可能被重定向到 xxx.pdf

      try {
        let canvas = await driver.findElement(By.tagName('canvas'))
        await driver.wait(playVideo(driver, canvas), 100000000);
        log.log('视频播放成功');
      } catch (ex) {
        success = false
        log.error('视频播放失败：' + id, ex);
      }
    }

    return success

  }

  async goQuiz(lesson,  options) {
    let driver = this.driver

    let isFinish = lesson.isFinish;
    let lessonId = lesson.id


      //let url = lesson.url
      let lessonTitle = lesson.title
      let {
        title,
        code,
        host
      } = CouseUrlMap[this.couseTitle]
      let url = `http://${host}/mod/quiz/view.php?id=${lessonId}`

      let fullname = `${title}_${code}`
      let answerfile = `./db/answers/${fullname}.json`
      let json = JSON.parse(fs.readFileSync(answerfile,'utf8'));
      let answsers = json.answers
      // 加载题库文件

      log.log('this.couseTitle---:', this.couseTitle, lessonTitle);
      
      await handleQuizBase(driver, url, options, answsers, lessonId )
      
      log.log('this quiz is done');
  }

  async goXingkao(lesson,  options ) {
    let driver = this.driver

    let isFinish = lesson.isFinish;
    let lessonId = lesson.id


      //let url = lesson.url
      let lessonTitle = lesson.title
      let {
        title,
        code,
        host
      } = CouseUrlMap[this.couseTitle]
      let url = `http://${host}/mod/quiz/view.php?id=${lessonId}`

      let fullname = `${title}_${code}`
      let answerfile = `./db/answers/${fullname}xingkao.json`
      let json = JSON.parse(fs.readFileSync(answerfile,'utf8'));
      let answsers = json.answers
      // 加载题库文件

      log.log('this.couseTitle :', this.couseTitle);
 
      await handleQuizBase(driver, url, options, answsers, lessonId )
      
      log.log('this quiz is done');
  }

  // 处理提交文本的测试，一般为终结性考试
  async goFinal(lesson, options) {
    log.debug('=================goFinal=================', options);
    let { type } = options
    let driver = this.driver

    let lessonType = lesson.type;
    let lessonId = lesson.id
    let url = lesson.url
    let classId = lesson.classId

    
    let page = await driver.get(url)
    let submitted = await page.$( '.submissionstatussubmitted')

    if( submitted){
      log.info("作业已经提交")
      return
    }
    let status = await page.$eval( '.submissionsummarytable tr:first-child td.lastcol', node=>node.innerText.trim() )
    log.info("final lesson status", status)
    if( status == '这个作业不需要您在网上提交任何东西'){
      log.info(status)
      return
    }
    await page.waitForSelector( '.singlebutton button.btn-secondary');
    const commitButton = await page.$( '.singlebutton button.btn-secondary')
    // 等待commit的click功能
    await commitButton.click()
    await handleDelay(1500);
    await page.waitForSelector( '.editsubmissionform .row .col-form-label');

    // 检查提交文本还是文件
    let label = await page.$eval( '.editsubmissionform .row .col-form-label', node=>node.innerText.trim() )
    log.debug("编辑按钮", label)
    if( label == '在线文本'){
      
      // 可能会超时，需要重新加载
      await page.waitForSelector('iframe', {timeout:45000}).catch(async(e)=>{
        log.error( " TimeoutError: waiting for selector iframe", e)
        await page.reload()
      }); 

      // 多等一会  failed: timeout 30000ms exceeded
      const textBody = await page.$('iframe')

      let fullname = `${this.couseTitle}_${classId}`
      // 
      // 有的课程的形考，有多个论述题，所以文件名里需要添加lessonId
      let answerText = "";
      let filepath = `./db/subjects/${fullname}_final.txt`
      if( type == 'xingkaofinal'){
        filepath = `./db/subjects/${fullname}_${lessonType}_${lessonId}.txt`
      } 
      if( fs.existsSync( filepath )){
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

    }else if( label=="文件提交"){
      // 提交文件

      await page.waitForSelector('.filemanager .filemanager-container' ).catch(async(e)=>{
        log.error( " TimeoutError: waiting for selector filemanager", e)
        await page.reload()
      }); 

      // 多等一会  failed: timeout 30000ms exceeded

      let fullname = `${this.couseTitle}_${classId}`

      let filepath = `./db/answers/${fullname}/${lessonType}_${lessonId}.txt`
      if( !fs.existsSync( filepath )){
        filepath = `./db/answers/${fullname}/${lessonType}_${lessonId}.doc`
      } 
      if( !fs.existsSync( filepath )){
        filepath = `./db/subjects/final/${this.couseTitle}.txt`
      } 
      log.debug( "filepath=", filepath)
      const uploaded = await page.$('.fp-content .fp-file')
      if( uploaded ){
        await uploaded.click()
        await page.waitForSelector( '.filemanager button.fp-file-delete')
        let delbutton = await page.$( '.filemanager button.fp-file-delete')
        await delbutton.click()
        const confirmButton = await page.$( '.filemanager button.fp-dlg-butconfirm'  )
        await confirmButton.click()
        // 延时以免数据没有提交成功
        await handleDelay(300);
      }
      const addbutton = await page.$('.fp-toolbar .fp-btn-add a')

      await addbutton.click()
      await page.waitForSelector( '.moodle-dialogue')
      let nav = await page.$('.fp-repo-area .nav-item:nth-child(2) a')
      await nav.click()
      await page.waitForSelector( '.moodle-dialogue input[type=file]')

      let selbutton = await page.$('.moodle-dialogue input[type=file]')

      await selbutton.uploadFile(filepath)
      const uploadButton = await page.$('.moodle-dialogue   button.fp-upload-btn')
      await uploadButton.click()


      log.debug("提交文件", filepath)
      await handleDelay(1500);

    }

    await page.waitForSelector('.form-group input.btn-primary');
    const saveButton = await page.$('.form-group input.btn-primary')
    await saveButton.click()
    // 现在这里就直接保存了，需要延时以免数据没有提交成功
    await handleDelay(300);

    // 点击提交按钮
    if( options.submitquiz == 'yes'){
      log.debug("查找提交按钮")

      let submitButtonCss = '.submissionaction:last-child form button.btn-secondary'
      await page.waitForSelector(submitButtonCss);
      const submitButton = await page.$(submitButtonCss)
      await submitButton.click()
      log.debug("点击提交按钮")

      if( lessonType == 'assign'){
        let confirmButtonCss = '#id_submitbutton'
        await page.waitForSelector(confirmButtonCss);
  
        let stateButtonCss = '#id_submissionstatement'
        // 
        const stateButton = await page.$( stateButtonCss )
        if( stateButton ){
          await stateButton.click()
        }
        const confirmButton = await page.$( confirmButtonCss )
        await confirmButton.click()
      }

      // 延时以免数据没有提交成功
      await handleDelay(300);
      log.debug("点击确认按钮")
    }

  }

  async goForum(lesson, options) {
    log.debug('=================goForum=================', options);

    let driver = this.driver

    let lessonType = lesson.type;
    let lessonId = lesson.id
    let url = lesson.url
    let classId = lesson.classId
    
    let page = await driver.get(url)

    await page.waitForSelector( '#newdiscussionform');
    const [response] = await Promise.all([  page.waitForNavigation( ),  page.click("#newdiscussionform> button[type=submit]") ])

    await handleDelay(1000);

    // 可能会超时，需要重新加载
    await page.waitForSelector('iframe', {timeout:5000}).catch(async(e)=>{
      log.error( " TimeoutError: waiting for selector iframe", e)
      await page.reload()
    }); 

    // 多等一会  failed: timeout 30000ms exceeded
    const textBody = await page.$('iframe')

    let fullname = `${this.couseTitle}_${classId}`
    // 
    // 有的课程的形考，有多个论述题，所以文件名里需要添加lessonId
     
    let filepath = `./db/subjects/${fullname}_${lessonType}_${lessonId}.txt`
    // 第一行是标题，第二行是内容  
    let answerText = fs.readFileSync(filepath,'utf8')
    let lineEnd = answerText.indexOf( "\r\n")
     
    let title = answerText.slice(0,lineEnd)
    
    let body = answerText.slice(lineEnd+2)
    log.debug( 'title', title, 'body', body)

    await page.type('input#id_subject', title)
    await textBody.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    await textBody.type( body )

    // 点击提交按钮
    if( options.submitquiz == 'yes'){
      let submitButtonCss = 'form#mformforum #id_submitbutton'
      await page.waitForSelector(submitButtonCss);
      const submitButton = await page.$(submitButtonCss)
      await submitButton.click()
      log.debug("点击提交按钮")       
      // 延时以免数据没有提交成功
      await handleDelay(1000);
    }

  }

  // 通过api去看视频
  async watchVideoByApi(lesson) {
    // $.getJSON('http://shenyang.ouchn.cn/theme/blueonionre/modulesCompletion.php?cmid=437329&id=3935&sectionid=27', function(res){ log.log(res)})

    let success = false
    let course = CouseUrlMap[this.couseTitle]

    let driver = this.driver
    let isFinish = lesson.isFinish;
    let id = lesson.id
    let classId = lesson.classId
    let sectionId = lesson.sectionId
          
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
         
        success = (res == 1)
        log.info(`视频播放成功${success}`);
      } catch (ex) {
        
        handleBotError( this, ex )

      }
    
    return success

  }

    // 通过api去看视频
    async watchAllVideoByApi() {
      // $.getJSON('http://shenyang.ouchn.cn/theme/blueonionre/modulesCompletion.php?cmid=437329&id=3935&sectionid=27', function(res){ log.log(res)})
      let driver = this.driver

      let success = false
      let course = CouseUrlMap[this.couseTitle]
      let host = course.host
      let moduleStatus = this.couseInfo.status
      let videoLessons = []
      for (let i = 0; i < moduleStatus.length; i++) {
        let lesson = moduleStatus[i];
        let url = lesson.url
        let type = lesson.type

        if (type == 'video') {
          videoLessons.push( lesson  )
        }
      }

      let page = null
      try {
        for (let i = 0; i < videoLessons.length; i++) {

          let {id,classId,sectionId } = videoLessons[i]
          if( i == 0 ){
            page = await driver.get(`http://${host}/mod/url/view.php?id=${id}`);      
            await page.waitForSelector('#video');
          }
          let script = `jQuery.ajaxSetup({ async : false}); var res = null; jQuery.getJSON('/theme/blueonionre/modulesCompletion.php?cmid=${id}&id=${classId}&sectionid=${sectionId}', function(data){ res = data; }); ;`
          // "视频播放延时1秒, 防止API没有成功！"
          let res = await page.evaluate(script);
          await handleDelay(300);
          success = (res == 1)

        }
      } catch (ex) {
            
        handleBotError( this, ex )

      }
       
      log.info(`视频播放成功 ${success}`);
       
      return success
    }

  /**
   * 生成单元测验题，针对可以重复提交，并显示答案的科目 byreview
   * 调用前需先调用 
   * @param {string} couseTitle -  如：“中国特色社会主义理论体系概论”
  */
  async copyQuiz( couseTitle, options={}  ) {

    let { byreview, filter} = options
    await this.prepareForLearn( couseTitle )
console.debug( 'copyQuiz', couseTitle, CouseUrlMap, options)
    let {
      title,
      code,
      host
    } = CouseUrlMap[couseTitle]
    filter = filter || ''
    let fullname = `${title}_${code}`
    let filename = `db/subjects/${fullname}.json`
    // 加载课程数据文件
    this.getLog( couseTitle, { filename } )
    

    let urlbase = `http://${host}/mod/quiz/view.php`
    
    let lessons = this.couseInfo.status
    
    let quizArray = []
    
    if( byreview ) {
      quizArray = await copyQuizBaseByReview( this.driver, urlbase, lessons, filter  )
    }else{
      quizArray = await copyQuizBase( this.driver, urlbase, lessons, filter )
    }
      // 生成试题文件
    let answerfile = `db/answers/${fullname}${filter}.txt`

    let answerStr = ''
    let LE =  "\r\n"
    for( let i=0; i<quizArray.length; i++){
      let { id, quiz } = quizArray[i];
      answerStr = answerStr.concat( `[形考${id}] ${i+1}${LE}` )
      for( let j = 0; j<quiz.length; j++ ){
        let question = quiz[j]
        let { title, options, type, answer, subquetions, classType} = question

        let line = ''
        if( classType =='description'){
          line =  title + LE
        }else if( classType == 'multichoice'){
          line =  `[问题${classType}] ${title} ${LE}${options} ${LE}[答案] ${answer} ${LE}`
        }else if( classType == 'truefalse'){
          line =  `[问题${classType}] ${title} ${LE}${options} ${LE}[答案] ${answer} ${LE}`
        }else if( classType == 'multianswer'){
          line =  `[问题${classType}] ${title} ${LE}[答案] ${answer} ${LE}`
        }else if( classType == 'ddwtos'){
          line =  `[问题${classType}] ${title} ${LE}[答案] ${answer} ${LE}`
        }else if( classType == 'essay'){
          line =  `[问题${classType}] ${title} ${LE}[答案] ${answer} ${LE}`
        }else if( classType == 'shortanswer'){
          line =  `[问题${classType}] ${title} ${LE}[答案] ${answer} ${LE}`
        }

        answerStr = answerStr.concat( line )
      }
    }

    fs.writeFileSync(answerfile, answerStr);

    let answerList = []
    for( let i=0; i<quizArray.length; i++){
      let { id, quiz }  = quizArray[i];
      // 有时为空，需要跳过
      let answers = []

      for( let j = 0; j<quiz.length; j++ ){
        let question = quiz[j]
        // ismulti 是否为多选
        let { title, options, type, answer, classType, ismulti} = question
        log.debug("classType=", classType, "i=",i, "j=",j, title)
        if( classType =='description'){
          continue
        }
        answers.push( { title, answer, classType, ismulti })

      }
      answerList.push( { id, answers })
    }
    let answerjson = `db/answers/${fullname}${filter}.json`

    // 如果是形考题，并且原有题库，把新题添加到原有题库中

    // log.log( "answerjson", answerjson)
    fs.writeFileSync(answerjson, JSON.stringify({ answers: answerList}));

  }


  /**
     * 提交空白的测验题库 
     * 调用前需先调用 
     * @param {string} couseTitle -  如：“中国特色社会主义理论体系概论”
    */
  async submitPlainQuiz( couseTitle, filter= null, maxReview=0  ) {

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
    
    
    await submitPlainQuizBase( this.driver, urlbase, lessons, filter, maxReview )
     
  }


  /**
   * 确定当前课程的url 和 code
   * 需要点击一下 ‘进入学习’，获得访问权限 地区.ouchn.cn/course
   * @param {string} couseTitle -  如：“4498_中国特色社会主义理论体系概论”
   * @return {object} course 当前课程信息 或 null/undefined
   */

  async prepareForLearn(couseTitle) {

    // 处理 “4498_中国特色社会主义理论体系概论” 情况, 避免 "人文英语3" 中的3被清除
    couseTitle = buildCouseTitle(couseTitle)
    let driver = this.driver
    let browser = driver.browser
    let mainPage = this.mainPage //await driver.getWindowHandle()
    let links = await this.getCousesLinks(mainPage, couseTitle);

    if (links.length == 0) {
      log.error(`无法找到课程 ${couseTitle}`)
      return false
    }
    log.info( `找到课程 ${couseTitle}`)
    //log.debug( 'links', links.length)
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
        let windowTitle = await cousePage.title() // 课程： 习近平新时代中国特色社会主义思想
        url = await cousePage.url() //http://shenyang.ouchn.cn/course/view.php?id=4372
        let parsedUrl = URL.parse(url, true)
        let code = parsedUrl.query['id']
        // 如果找到当前这门课的窗口,
        // cousetitle=计算机应用基础(本)   windowtitle = 计算机应用基础（本）
        //   "Photoshop图像处理".toLowerCase() => "photoshop图像处理"

        let tidyWindowTitle = buildCouseTitle(windowTitle)
        let tidyCouseTitle = couseTitle
        
        //log.debug(`couseTitle=${couseTitle} windowTitle = ${windowTitle}, url= ${url} code=${code} tidyWindowTitle=${tidyWindowTitle} tidyCouseTitle=${tidyCouseTitle}`);

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
    // log.debug("current window url=", url)
    this.recursiveCount = 0

    return CouseUrlMap[couseTitle]
  }

  async learnFinal(options) {

    log.log( "============= learnFinal =============")
    log.log( "this.couseInfo.status", this.couseInfo.status.length)

    let moduleStatus = this.couseInfo.status
    
      for (let i = 0; i < moduleStatus.length; i++) {
        let lesson = moduleStatus[i];
        try{
          if ((lesson.title == '终结性考试' || lesson.title == '大作业')&& lesson.type =='assign') {
            await this.goFinal(lesson, options)
          }
        }catch(e){
          log.error( `无法学习课程 ${lesson.title} url=${lesson.url} account=${this.username}`,e)
        }
      }

  }


  // async handleVerifyCode(driver) {
  //
  //   let code = await getVerifyCode(driver)
  //   let text = /[\w]+/.exec(code.text).toString()
  //   log.log("text=", text)
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
    this.couseTitle = this.couseTitle

    log.debug("profileCouse=", courseCodeOrTitle, CouseUrlMap);
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
      let snapshot = `./db/log/initdb/${this.couseTitle}.jpg`
      handleSnapshot( this, cousePage,snapshot)
      log.debug(" tab.title1 ", title, this.couseTitle, typeof(this.couseTitle))

      // let bybase = [ '国家开放大学学习指南','思想道德修养与法律基础','马克思主义基本原理概论','毛泽东思想和中国特色社会主义理论体系概论','中国特色社会主义理论体系概论','习近平新时代中国特色社会主义思想', '中国近现代史纲要']
      // let bybase2= [ '幼儿园课程论', '人文社会科学基础', '学前教育学', '学前儿童发展心理学', '儿童家庭与社区教育', '幼儿园管理','商务礼仪概论' ]
      // if (bybase.includes(title)) {
      //   this.couseInfo = await parseCouseBase(cousePage)
      // } else if (bybase2.includes(title)) {
      //   this.couseInfo = await parseCouseBase2(cousePage)
      // } else{
      //   this.couseInfo = await parseCouseBase(cousePage)
      // }

      this.couseInfo = await parseCouse(cousePage) 

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
      log.debug(`课程代码 ${ this.couseTitle} ${courseCodeOrTitle} 找不到课程url`);
    }

    return this.couseInfo
  }

  async getCousesLinks(mainPage, couseTitle) {

    
    // 支持的课程
    let links = []
    try{
    
      await mainPage.waitForSelector('#zaixuekecheng .media');
      let div = await mainPage.$('#zaixuekecheng');
      let couses = await mainPage.$$('#zaixuekecheng .media');
      //log.debug("getCousesLinks couses=", couseTitle, couses.length);
      for (let i = 0; i < couses.length; i++) {
        let couse = couses[i]
        //let titleElement = await couse.$eval('.media-title', node=> node.innerText );
        let title =  await couse.$eval('.media-title', node=> node.innerText );
        let buttonElement = await couse.$('.course-entry button');
        //let text =  await couse.$eval('.course-entry button', node=>node.innerText );
        //   title="★中级财务会计（一）"  couseTitle = "中级财务会计（一）"
        //   "Photoshop图像处理".toLowerCase() => "photoshop图像处理"

        title = buildCouseTitle( title )
        //log.debug("getCousesLinks couse=", title, title.includes(couseTitle));
        if (title.includes(couseTitle)) {
          links.push(buttonElement)
        }
      }

    }catch(e){
      handleBotError( this, e)
    }
    // 不知因为什么原因会多一个, 可能是angular生成的隐藏button对象，
    return links
  }

  async getAllCouses(page) {

    
    // 支持的课程
    let links = []
    try{
      await handleDelay(500);
      await page.waitForSelector('#zaixuekecheng .media');
      let div = await page.$('#zaixuekecheng');
      let couses = await page.$$('#zaixuekecheng .media');
      //log.debug("getCousesLinks couses=", couseTitle, couses.length);
      for (let i = 0; i < couses.length; i++) {
        let couse = couses[i]
        //let titleElement = await couse.$eval('.media-title', node=> node.innerText );
        let title =  await couse.$eval('.media-title', node=> node.innerText );
        let buttonElement = await couse.$('.course-entry button');
        //let text =  await couse.$eval('.course-entry button', node=>node.innerText );
        //   title="★中级财务会计（一）"  couseTitle = "中级财务会计（一）"
        //   "Photoshop图像处理".toLowerCase() => "photoshop图像处理"

        title = buildCouseTitle( title )
        //log.debug("getCousesLinks couse=", title, title.includes(couseTitle));
        links.push(title)
        
      }

    }catch(e){
      handleBotError( this, e)
    }
    // 不知因为什么原因会多一个, 可能是angular生成的隐藏button对象，
    return links
  }

  async getMajorInfo(   ){
    let url = 'http://student.ouchn.cn/#/discover-more/student-status'

    let page = await this.driver.get( url )
    let css = '.page-content .student-roll .col-md-6:nth-child(2)'
    await page.waitForSelector('.page-content .student-roll');

    let title =  await page.$eval(css, node=> node.innerText );
    title =  title.replace( /[\n\t\r]+/, '')
    return { title }

  }

  async saveCouseJson(classId) {
    let filename = await this.getCouseJsonPath(classId)
    //log.log('this.couseInfo----:',this.couseInfo);
    // 保存 课程信息时只保存status 即每一课的信息，以便和快速开视频使用相同的结构的文件
    fs.writeFileSync(filename, JSON.stringify(this.couseInfo.status) );
  }

  async getCouseJsonPath(couseTitle) {
    let couse = CouseUrlMap[couseTitle]
    let fullname = `${couse.title}_${couse.code}`
    let dir = './db/subjects'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    let filename = dir + '/' + fullname+ '.json'
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
        log.log( "课程测验答案",filename)
        fs.writeFileSync(filename, JSON.stringify({
          answers: jsonStr
        }));
      } else {
        log.log(`没有课程测验答案:${couseTitle}`);
      }
    } else {
      log.error(`无法找到课程:${couseTitle}`);

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
    log.debug("getSummary couses=", couses.length);
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
        log.debug("getSummary couse=", title, text, todo, score);
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
    //   log.log("mainHandle0", i, mainHandle, "handle = ", handle)
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
    //       log.error("driver.close", e);
    //     }
    //   }
    // }
    // await locator.window(mainHandle)
    // await driver.wait(until.titleContains('学生空间'), 20000);
    // log.debug("closeOtherTabs1");
   
  }

  /**
   * 返回课程数据文件，数据文件记录课程的所有章节内容
   * @param {*} couseBaseInfo couseTitle, couseCode
   */
  getSubjectDataFilePath( couseBaseInfo ){
    let couseFullname = `${couseBaseInfo.title}_${couseBaseInfo.code}`
    // Error: File or directory 'D:\**\dati\db\subjects\毛泽东思想和中国特色社会主义理论体系概论_5771.json' was not included into executable at compilation stage. Please recompile adding it as asset or script.
    //let subjectfile =  path.join( AppConfig.appPath, `./db/subjects/${couseFullname}.json`)
    let subjectfile =  `./db/subjects/${couseFullname}.json`
    return subjectfile
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
        log.info(`读取课程数据 ${couseTitle}`);
        this.courseInfo.status = res;
      }
    } else {
      log.error(`无法读取课程数据文件 ${filename}`);
      filename = null
    }

    return filename
  }

}

async function handleBotError( bot, e ){
  let { username,couseTitle } = bot
  log.error(`异常错误 ${this.username} ${couseTitle}`, e);
  let pages = await bot.driver.pages()
  for( let i=0; i<pages.length; i++){
    let path = `./db/log/${couseTitle}_${username}_${i}.jpg`
    let page = pages[i]
    await page.screenshot({type: 'jpeg', path: path})

  }
}

async function handleSnapshot( bot, page, path ){
  let { username,couseTitle } = bot 
  //let path = `./db/log/${couseTitle}_${username}.jpg`
  await page.screenshot({type: 'jpeg', path: path})
  
}


module.exports = {
  BotPlus
}
