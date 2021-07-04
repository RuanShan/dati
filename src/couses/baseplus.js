const { parse } = require('node-html-parser');

const { log } = require('../logger');

const { handle503, handleDelay, isXingkaoLessonTitle, getQuestionClassType} = require ('../utilplus');

let recursiveCount = 0

async function parseCouse( page ){
  let progressBar = await page.$( '.progress-bar' );

  if( progressBar ){
    return await parseCouseBase( page )
  }else{
    return await parseCouseBase2( page )
  }

}

/**
 * 分析课程章节数据
 * @param {*} page 
 */
async function parseCouseBase(page) {

  let progressPath = "div.progress-bar span"
  let sectionl1Path = "//ul[@class='flexsections flexsections-level-1']/li"
  let sectionl2Path = "//ul[@class='flexsections flexsections-level-2']/li"
  let sectionl2Css = "li.activity"
  let sectionl2LinkCss = "a"

  // log.debug('before wait ');
  await page.waitForSelector( '.progress-bar' );
  // log.debug('after wait ');

  let title = await page.title()
  let url = await page.url()
  // log.debug('url----------------:', url);
  let classId = url.substring(url.indexOf('id=') + 3);
  // log.debug('classId----:', classId);


  let levelOne = await page.$x(sectionl1Path)
  let progress = await page.$eval(progressPath, node=>node.innerText)
   
  let status = []
  let classinfo = {
    title: title,
    url: url,
    classId: classId,
    progress: progress
  }
  for (let i = 0; i < levelOne.length; i++) {
    let a = levelOne[i]
    let sectionTitle = await a.$eval('div',node=>node.innerText)
    let idHandle = await a.getProperty('id')
    let sectionId = await idHandle.jsonValue()
    // log.debug(`levelOne.text ${i} ${sectionId} ${sectionTitle}`)
    let levelTwo = await a.$$(sectionl2Css)
    if (levelTwo.length == 0) {
      // log.debug(`levelOne.text ${i} ${sectionId} ${sectionTitle} 没有内容。`)
      continue
    }
    // 电大资源区
    if( /课程文件|资源更新区|电大资源区|资源自建区/.test( sectionTitle )){
      continue
    }
    // 自建资源区 需要解析，里面有作业
    // 课程文件, 资源更新区, 电大资源区

    const isHidden = await a.$eval(sectionl2Css, (elem) => {
      return elem.style.display == 'none'
    })

    if (isHidden) {
      // 显示下级内容
      await a.click()
    }

    for (let j = 0; j < levelTwo.length; j++) {
      let b = levelTwo[j]
      let text = await  b.$eval('div',node=>node.innerText)
      let idHandle = await  b.getProperty('id')
      let id =await idHandle.jsonValue()
      let imgs = await b.$$( 'img')
      let alt = "未完成"
      let href = ''
      let type = 'unkonwn' // text, video, quiz
      // http://anhui.ouchn.cn/theme/blueonionre/pix/page_h.png
      // http://anhui.ouchn.cn/theme/blueonionre/pix/core_h.png
      // http://anhui.ouchn.cn/theme/blueonionre/pix/quiz_h.png
      // http://liaoning.ouchn.cn/theme/blueonionres/pix/forum_h.png
      if (imgs.length >= 1){
        // 每节课前面的图标
        let srcHandle =  await imgs[0].getProperty('src')
        let src = await srcHandle.jsonValue()
        // log.debug( "src=", src  )
        if( src.includes('core_h.png')){ //视频1：新时代党的建设总要求网页地址
          type = 'video'
        }else if( src.includes('quiz_h.png')){
          type = 'quiz'
        }else if( src.includes('page_h.png')){
          type = 'page'
        }else if( src.includes('assign_h.png')){
          type = 'assign'
        } else if( src.includes('forum_h.png')){
          type = 'forum'
        } else if( src.includes('text(c).png')){
          type = 'ppt'
        }
      }

      let link = await b.$( sectionl2LinkCss )
      if (link) {
        // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
        //let link = await b.$eval( sectionl2LinkCss, node=> node.href )
        href = await b.$eval( sectionl2LinkCss, node=> node.href )
      }
      let course = {
        classId: classId, // 用于script调用，如完成视频
        sectionTitle: sectionTitle, // section 标题，用来确定是否为形考
        sectionId: sectionId.substring(8), // section-xxx
        type: type,
        title: text,
        isFinish: '未完成',
        url: href,
        id: id.substring(7) // module-xxx
      }
      status.push(course)
      // if (alt.startsWith("未完成")) {
      //   // log.debug(`levelTwo.text ${j} ${id} ${type} ${text} ${href} ${alt}`)
      // }
    }
  }
  let couseJson = {
    score: classinfo,
    status: status
  }

  return couseJson
}

/**
 * 分析课程章节数据,  如：幼儿园课程论
 * @param {*} page 
 */
async function parseCouseBase2( page ){

  let sectionl1Path = "ul.topics>li, ul.flexsections>li"
  let sectionl2Css = "li.activity"
  let sectionl2LinkCss = "a"

   
  await page.waitForSelector( '.topics .section .activity,.flexsections .section .activity' );
  

  let title = await page.title()
  let url = await page.url()
  //log.debug('url----------------:', url);
  let classId = url.substring(url.indexOf('id=') + 3);
  //log.debug('classId----:', classId);


  let levelOne = await page.$$(sectionl1Path)
   
  let status = []
  let classinfo = {
    title: title,
    url: url,
    classId: classId
  }
  for (let i = 0; i < levelOne.length; i++) {
    let a = levelOne[i]
    let titleDiv= await a.$('.sectionname,.section-title')
    if( !titleDiv ){
      // 可能不存在标题
      continue
    }
    let sectionTitle = await a.$eval('.sectionname,.section-title',node=>node.innerText)
    let idHandle = await a.getProperty('id')
    let sectionId = await idHandle.jsonValue()
    log.debug(`levelOne.text ${i} ${sectionId} ${sectionTitle}`)
    let levelTwo = await a.$$(sectionl2Css)
    if (levelTwo.length == 0) {
      log.debug(`levelOne.text ${i} ${sectionId} ${sectionTitle} 没有内容。`)
      continue
    }
    // 电大资源区，自建资源区
    if( /课程文件|资源更新区|电大资源区|资源自建区|资源区/.test( sectionTitle )){
      continue
    }
    // 课程文件, 资源更新区, 电大资源区

    for (let j = 0; j < levelTwo.length; j++) {
      log.debug( `i=${i} j=${j}`)
      let b = levelTwo[j]
      let contentwithoutlink = await b.$('.contentwithoutlink')
      if( contentwithoutlink ){
        // 有的只是标题，跳过即可
        continue
      }

      let text = await  b.$eval('div',node=>node.innerText)
      let idHandle = await  b.getProperty('id')
      let id =await idHandle.jsonValue()
      let imgs = await b.$$( 'img')
      let alt = "未完成"
      let href = ''
      let type = 'unkonwn' // text, video, quiz
      // http://liaoning.ouchn.cn/theme/image.php/boost/page/1604384853/icon
      // http://liaoning.ouchn.cn/theme/image.php/boost/forum/1604384853/icon
      // http://liaoning.ouchn.cn/theme/image.php/boost/core/1604384853/f/document-24
      // http://liaoning.ouchn.cn/theme/image.php/boost/assign/1604384853/icon
      // http://liaoning.ouchn.cn/theme/image.php/boost/url/1604384853/icon

      
      if (imgs.length >= 1){
        // 每节课前面的图标
        let srcHandle =  await imgs[0].getProperty('src')
        let src = await srcHandle.jsonValue()
        // log.debug( "src=", src  )
        if( src.includes('boost/url')){ //视频1：新时代党的建设总要求网页地址
          type = 'boost_url'
        }else if( src.includes('boost/core')){
          type = 'boost_core'
        }else if( src.includes('boost/page')){
          type = 'boost_page'
        }else if( src.includes('boost/quiz')){
          type = 'quiz'
        }else if( src.includes('boost/assign')){
          type = 'boost_assign'
        } else if( src.includes('boost/forum')){
          type = 'boost_forum'
        }
      }
      href = await b.$eval( sectionl2LinkCss, node=> node.href )

      // if (imgs.length >= 2) {
      //   // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
      //   let altHandle =  await imgs[1].getProperty('alt')
      //   alt = await altHandle.jsonValue()
      //   //let link = await b.$eval( sectionl2LinkCss, node=> node.href )
      // }
      let course = {
        classId: classId, // 用于script调用，如完成视频
        sectionId: sectionId.substring(8), // section-xxx
        sectionTitle: sectionTitle, // section 标题，用来确定是否为形考
        type: type,
        title: text,
        isFinish: alt.substring(0, 3),
        url: href,
        id: id.substring(7) // module-xxx
      }
      status.push(course)
       
    }
  }
  let couseJson = {
    score: classinfo,
    status: status
  }

  return couseJson
}
/**
 * 
 * 解析专题测验的内容，生产题库
 * @param {*} courseLessions array { classId: "6071", sectionId: "7", type:"quiz", title:"专题测验", isFinish:"未完成", url:"", id:"779651", position:	1}
 * @param {*} position 测试在所有测验中的位置，对应题库的索引
 * @param {*} isFirstPage 
 * @return {[]} quiz [{ title: '问题', type: 'header,tof,select问题类型', options: ['选项数组']} ]
 * 
 */
async function copyQuizBase(driver, baseurl, couseLessons, filter ) {
  
  // driver.browser.on('targetchanged', async target=>{
  //   let page = await target.page()
  //   await page.waitForNavigation()

  //   let title = await page.title()
  //   let url = await page.url()
  //   // log.debug( title, url)
  // })

  let quizArray = []
  for (let i = 0; i < couseLessons.length; i++) {
    let lesson = couseLessons[i];

    let {type,id, title, sectionTitle} = lesson

    if( type == 'quiz'){
      log.debug( "quiz title=",  title, "filter", filter)
        // 访问url，读取所有试题，可能包含多页
      if( filter=='xingkao' && !(isXingkaoLessonTitle(title, sectionTitle))){        
        continue
      }
      let url = `${baseurl}?id=${id}`
      let newPage = await driver.get( url )
      let is503 = false

        //  let responseListener = async ( response )=> {
        //   let status = await response.status()
        //   if( status == 503){
        //     let url = await response.url()
        //     // log.debug( "resonse=", url)
        //     is503 = true
        //   }
        // }
        //newPage.on('response',responseListener )
        let quiz = await copyOneQuiz(newPage,  true, url)
        // .catch( async (error)=>{
        //   let title = await newPage.title()
        //   log.debug( "拷贝题库发生异常", title)
        //   is503 = true
        // })

        //newPage.removeListener( 'response', responseListener)
      
        if( is503 ){
          // log.debug( '503 i=',i, i-1)
          i = i-1;
          continue
        }
         
        quizArray.push( { id, quiz } ) 
       
        handleDelay( 1500)

    }
  }
   
  return quizArray
  
}

/**
 * 
 * @param {*} page 
 * @param {*} baseurl 
 * @param {*} answers 
 * @param {*} position 测试在所有测验中的位置，对应题库的索引
 * @param {*} isFirstPage 
 * @return {[]} questions { title: '问题', type: 'header,tof,select问题类型', options: ['选项数组']} 
 */
async function copyOneQuiz( page,  isFirstPage, url ){
  // 读取课程分析文件
  // 选出所有的测试项目
  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"
  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageSelector = "input[value=下一页]"
  let prevPageSelector = "input[value=上一页]"
  let submitPageSelector = "input[value*=结束]"  // 结束答题... , 结束试答...

  if(isFirstPage){

    // log.debug('==============isFirstPage==============');
     
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
    // await handle503(page, url);

    await page.waitForSelector(startButtonSelector);
    let button = await  page.$(startButtonSelector)

    await Promise.all( [page.waitForNavigation(), button.click()]) // 进入测试页面

    let currentUrl = await page.url();
    if( currentUrl.includes('page=')){
      // http://hebei.ouchn.cn/mod/quiz/attempt.php?attempt=5934506&page=1
      // 如果当前路径中包含page=x 的参数,说明不是测试第一页，需要删除参数重新加载
      originalUrl = currentUrl
      currentUrl = currentUrl.replace( /&page=[0-9]/, '')

      let navbutton = await  page.$('#quiznavbutton1')
      await Promise.all( [page.waitForNavigation(), navbutton.click()]) 
      await handleDelay( 1000) 
    }
  }

  await page.waitForSelector( queSelector );

  // 可能不存在
  const nextPage = await page.$(nextPageSelector)
  const prevPage = await page.$(prevPageSelector)
  const submitPage = await page.$(submitPageSelector)

  let questions = await page.$$(queSelector)
  // log.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];

  let fakeQuestionNum = 0; // 大标题不是问题，所以

  
  // let jsonStr = ''
  let questionNum = 0
  let copys = []
  for (let i = 0; i < questions.length; i++) {
    let classType = 'unknow'
    let copyQuestion = { title: '问题', type: '问题类型', options: ['选项数组'], answer: '', classType }

    let questionEle = questions[i];
    // que description informationitem answersaved
    // que multichoice deferredfeedback notyetanswered
    // que truefalse  deferredfeedback notyetanswered
    // que multianswer  deferredfeedback notyetanswered
    let idString = await (await questionEle.getProperty('id')).jsonValue();
    //let classString = await (await questionEle.getProperty('class')).jsonValue();
    const classString = await page.evaluate(el => el.getAttribute("class"), questionEle);

    classType = getQuestionClassType(classString )     


    log.debug( "classType=", i, classType)
    //let answerInputs = await questionEle.$$('.answer input')
    //let answerLabels = await questionEle.$$('.answer label')
    // log.debug('question---:',question  );
    
    if (classType=='description') {
      let question = await questionEle.$eval( '.qtext', node=> node.innerText)

      questionNum = 0; // 每一道题的下标

      copyQuestion = { title: question, type: 'h1', classType  }
      copys.push( copyQuestion)
      continue;
    }

    //// log.debug('key---:',key);

    if(classType=='multianswer'){
      let question = await questionEle.$$eval( '.formulation p', nodes=> nodes.map( n=>n.innerText))
      log.debug('multianswer ', question);
      let subquetions = await questionEle.$$( '.subquestion')
      copyQuestion = { title: question.join(','), type: 'multianswer', subquetions: subquetions.length, classType  }

    }else if(classType=='ddwtos'){
      let question = await questionEle.$$eval( '.drags >span', nodes=> nodes.map( n=>n.innerText))
      log.debug('ddwtos ', question);
      let subquetions = await questionEle.$$( '.drags >span')
      copyQuestion = { title: question, type: 'multianswer', subquetions: subquetions.length, classType  }

    }else{
        let answerWrap = await questionEle.$('.answer')

        //let as =  await answer.$$eval('input', node=> node.value)
        let labels  = await answerWrap.$$eval('label', nodes=> nodes.map( n=>n.innerText))
  
        // log.debug(labels);
        if(classType=='truefalse'){//判断题
          let question = await questionEle.$eval( '.qtext', node=> node.innerText)
  
            // log.debug('chose ',labels);
            copyQuestion = { title: question, type: 'tof', options: labels, classType  }
        }else if(classType=='multichoice'){
          let question = await questionEle.$eval( '.qtext', node=> node.innerText)
          //选择题
          // a. 国家开放大学是基于信息技术的特殊的大学
          // let fixedLabels = labels.map( b => b.replace(/\s*/g,"").replace(".","").substring(1)  )
          // 有的选项中有换行符，去掉
          let fixedLabels = labels.map( b => b.replace(/[\n\r]+/g,"") )
          copyQuestion = { title: question, type: 'select', options: fixedLabels, classType  }
          // log.debug('chose ', fixedLabels);
  
        }else{
           log.debug('无法失败题目类型', classType);

        }
      
    }


    copys.push( copyQuestion)

    questionNum++;

  }
 

  if(nextPage){
    // log.debug('=======has nextPage=======');
    // 避免服务器503
    await handleDelay( 2000)
    await Promise.all( [page.waitForNavigation(), nextPage.click()])

    let otherCopys =  await copyOneQuiz( page, false )
    copys = copys.concat( otherCopys)
  }else if(submitPage){
    // log.debug('=======has submitPage=======');

  }
  return copys
}

/**
 * 
 * 回顾专题测验的内容，生产题库
 * @param {*} courseLessions array { classId: "6071", sectionId: "7", type:"quiz", title:"专题测验", isFinish:"未完成", url:"", id:"779651", position:	1}
 * @param {*} position 测试在所有测验中的位置，对应题库的索引
 * @param {*} isFirstPage 
 * @return {[]} quiz [{ title: '问题', type: 'header,tof,select问题类型', options: ['选项数组']} ]
 * 
 */
async function copyQuizBaseByReview(driver, baseurl, couseLessons, filter ) {
  

  let quizArray = []
  for (let i = 0; i < couseLessons.length; i++) {
    let lesson = couseLessons[i];

    let {type, title, id, sectionTitle} = lesson
    log.debug( "copyQuizBaseByReview lesson=", lesson )
    if( type == 'quiz'){
        // 访问url，读取所有试题，可能包含多页
      if( filter=='xingkao' && !(isXingkaoLessonTitle(title, sectionTitle))){        
          continue
      }
      let url = `${baseurl}?id=${id}`
      let newPage = await driver.get( url )
      let is503 = false

      let buttons = await newPage.$$("table.quizattemptsummary td a[title*='回顾']")

      let quiz = []
      log.debug( "review buttons ", buttons.length )
      for( let j=0; j<buttons.length; j++){
        newPage = await driver.get( url )
        let aquiz = await copyOneQuizByReview(newPage,  true, j)
        quiz = quiz.concat( aquiz )
        log.debug( "完成形考 回顾", j )

      }
        // .catch( async (error)=>{
        //   let title = await newPage.title()
        //   // log.debug( "catch title=", title)
        //   is503 = true
        // })
        
        //newPage.removeListener( 'response', responseListener)
      
        if( is503 ){
          // log.debug( '503 i=',i, i-1)
          i = i-1;
          continue
        }
        log.debug( "完成形考", i )
         
        quizArray.push( { id, quiz } ) 
       
        handleDelay( 1500)

    }
  }
   
  return quizArray
  
}

/**
 * 
 * @param {*} page 
 * @param {*} baseurl 
 * @param {*} answers 
 * @param {*} position 测试在所有测验中的位置，对应题库的索引
 * @param {*} isFirstPage 
 * @return {[]} questions { title: '问题', type: 'header,tof,select问题类型', options: ['选项数组']} 
 */
async function copyOneQuizByReview( page,  isFirstPage, reviewIndex=0 ){
  // 读取课程分析文件
  // 选出所有的测试项目
  let reviewButtonSelector="table.quizattemptsummary td a[title*='回顾']"
  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"
  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageSelector = ".submitbtns a[title=下一页]"
  let prevPageSelector = "a.mod_quiz-prev-nav"
  let submitPageSelector = "input[value=结束答题…]"
  

  if(isFirstPage){
    // log.debug('==============isFirstPage==============');
     
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
 
    await page.waitForSelector(reviewButtonSelector);
    let buttons = await page.$$(reviewButtonSelector)
    let button = buttons[reviewIndex]
    await Promise.all( [page.waitForNavigation(), button.click()]) // 进入测试页面

    // 所有题目显示在一页
    let currentUrl = await page.url();
    
    currentUrl = currentUrl.replace( /&page=[0-9]/, '')

    let url = currentUrl + '&showall=1'
    await page.goto( url )
    await handleDelay( 500) 
    await handle503(page, url);

     
  }
  await handleDelay( 1500) 
  // 503 问题

  await page.waitForSelector( queSelector );

  // 可能不存在
  const nextPage = await page.$(nextPageSelector)
  const prevPage = await page.$(prevPageSelector)
  const submitPage = await page.$(submitPageSelector)

  let questions = await page.$$(queSelector)
  log.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];

  
  let questionNum = 0
  let copys = []
  let ismulti = false
  for (let i = 0; i < questions.length; i++) {
    let classType = 'unknow'
    let copyQuestion = { title: '问题', type: '问题类型', options: ['选项数组'], answer: '', classType }

    let questionEle = questions[i];
 
    let question = '' 
    let answerWrap = null
    let classString = await page.evaluate(el => el.getAttribute("class"), questionEle);

    classType = getQuestionClassType(classString )     
console.debug( `${i} ${classType}`)
    if(classType == 'multianswer' ){
      question =   await questionEle.$eval( '.formulation', node=> node.outerHTML)
      let parsed = parse(question)
      let spans = parsed.querySelectorAll( "span" )
      spans.forEach((ele)=>ele.remove())
      question = parsed.text
      answerWrap = await questionEle.$('.formulation')
    }else if(classType=='ddwtos'){
      question = await questionEle.$eval( '.qtext', node=> node.innerText)
      answerWrap = await questionEle.$('.formulation')
  
    }else{
      question = await questionEle.$eval( '.qtext', node=> node.innerText)
      answerWrap = await questionEle.$('.answer')
    }

    
    if(classType == 'description'){
      questionNum = 0; // 每一道题的下标
      ismulti = question.includes( '多选题')  // 是否为多选
      copyQuestion = { title: question, type: 'h1', classType  }
      copys.push( copyQuestion)
      continue;
    }

    if( answerWrap ){
      let answer = answerWrap;

      let labels  = await answer.$$eval('label', nodes=> nodes.map( n=>n.innerText))
      // 正确的答案是“错”。
      // 正确答案是：质量互变规律
      // The correct answers are:  多选题

      if(classType == 'truefalse'){//判断题
        // 有的科目只显示是否正确，不显示正确答案，如：Java语言程序设计
        let rightanswer = await questionEle.$('.feedback .rightanswer')
        let correct = null
        if( rightanswer ){
          correct = await questionEle.$eval('.feedback .rightanswer', node=> node.innerText)
          // log.debug('chose ',labels);
          //正确的答案是“错”， 正确答案是“错”。
          correct = (correct.indexOf("对")>0 ? '对' : '错')
        }else{
          // 在选项中查找标记为正确的答案
          let correctEle = await answer.$('.correct>label')
          let incorrectEle = await answer.$('.incorrect>label')
          if( correctEle){
            correct = await answer.$eval('.correct>label', node=> node.innerText)
          }else if(incorrectEle ){
            let selected = await answer.$eval('.incorrect>label',  node=> node.innerText)
            correct = selected == '对' ? '错' : '对'
          }
        }

          copyQuestion = { title: question, type: 'tof', options: labels, answer: correct, classType  }
      }else if(classType == 'multichoice'){//选择题

        let rightanswer = await questionEle.$('.feedback .rightanswer')
        let generalfeedback = await questionEle.$('.feedback .generalfeedback')
        let correct = null
        if( rightanswer ){
          // 
          correct = await questionEle.$eval('.feedback .rightanswer', node=> node.innerText)

          let checkbox = await answer.$$("input[type='checkbox']")
          let radio = await answer.$$("input[type='radio']")
          // 如果正确答案>1 认为是多选题
          if( checkbox.length>0){
            ismulti = true
          } 
          if( radio.length>0){
            ismulti = false
          } 
          log.debug( 'found checkbox ismulti', ismulti,  checkbox.length, question )

        }
        else if( generalfeedback ){
          // 从句子结构seek… to do something分析，需选择动词原形。所以答案是C。
          // 正确答案应该是A
          let feedback = await questionEle.$eval('.feedback .generalfeedback', node=> node.innerText)
          console.debug( 'feedback=', feedback)
          let match = feedback.match(/(答案|选)[\u4e00-\u9fa5]*([A-Z])/)
          correct = match.length==3 ? match[2] : null
        }else{
          // 可能为多选
          let correctDivs = await answer.$$('.correct >div[data-region]')
           
          if( correctDivs.length>0){
            let corrects = await answer.$$eval('.correct >div[data-region]', nodes=> nodes.map( n=>n.innerText))
            // 去掉 A. ,B., C. D. E.  选择题位置可能变化
            let fixedCorrects = corrects.map( b => b.replace(/\s*/g,"").replace(".","").substring(1)  )
            log.debug( "corrects=", correctDivs.length, corrects, "question",question )
            correct = fixedCorrects.join(',')
            // 如果正确答案>1 认为是多选题
            if( correctDivs.length>1){
              ismulti = true
            }
          }
        }

        let promptEle = await questionEle.$('.prompt')

        if( promptEle ){
          // 网站bug，有时没有 promptEle 元素，这里需要判断一下
          let prompt = await questionEle.$eval('.prompt', node=> node.innerText)
          ismulti = prompt.includes( '选择一项或多项') 
          log.debug( 'found prompt ismulti',ismulti)
        }

        // 如果是 checkbox 也认为是多选题


        // a. 国家开放大学是基于信息技术的特殊的大学
        // let fixedLabels = labels.map( b => b.replace(/\s*/g,"").replace(".","").substring(1)  )
        // 有的选项中有换行符，去掉
        let fixedLabels = labels.map( b => b.replace(/[\n\r]+/g,"") )
        // 正确答案是：质量互变规律
        // The correct answers are: 君主制, 贵族共和制, 民主共和制
        // log.debug( "correct=",i, correct, question)
        if( correct ){
          if( ismulti){
            correct = correct.replace(  "The correct answers are: ", '')
          }else{
            correct = correct.replace( "正确答案是：", '' )
          }
        }


        copyQuestion = { title: question, type: 'select', options: fixedLabels,  answer: correct, classType, ismulti  }

        // log.debug('chose ', fixedLabels);
      }else if(classType == 'multianswer'){

        let answers = []
        let subquestions = await questionEle.$$('.subquestion')
        let generalfeedback = await questionEle.$('.generalfeedback')
        for( let k=0; k<subquestions.length; k++){
          let sub = subquestions[k]
          // 可能是 input、或 select
          let inputvalue = ''
          let selectEle = await sub.$('select [selected]')
          let inputEle = await sub.$('input')
          let iscorrect = await sub.$('i.fa-check')
          if( inputEle){
            inputvalue = await sub.$eval('input', node=> node.value)
            
          }else if( selectEle ){
            inputvalue = await sub.$eval('select [selected]', node=> node.innerText)             
          }

          log.debug( classType, inputvalue)
          if( !iscorrect){
            // 不正确<br>正确答案是：主席负责制<br>获得2.00分中的0.00分 
            inputvalue = await sub.$eval('.feedbackspan ', node=> node.innerHTML)
            let splited = inputvalue.split( '<br>')
            if( splited.length == 3 && splited[1].includes('正确答案是')){
              inputvalue = splited[1].replace( "正确答案是：", '')
            }

            // 答案：1. weirdest 2. connected 3. shoot 4. countless 5. out
            // 答案：1. C   2. B   3. A   4. B   5. A
            if( generalfeedback ){
              let text = await questionEle.$eval('.generalfeedback p', node=> node.innerText)
              console.debug( 'generalfeedback=', text)

              text =  text.replace('答案：','').trim()
              
              text = text.split(/[0-9]\.[\s]*/)
              text = text.filter(i=>i.length>0).map(j=>j.trim())
              inputvalue = text[k]
            }
          }
          answers.push( inputvalue)
        }
        copyQuestion = { title: question, type: classType,  answer: answers, classType  }
      }else if(classType == 'ddwtos'){
        let answers = await questionEle.$$eval( '.drags >span', nodes=> nodes.map( n=>n.innerText))

        copyQuestion = { title: question, type: classType,  answer: answers, classType  }
      }else if(classType == 'essay'){
        //let correct = await questionEle.$eval('.feedback', node=> node.innerText)
        let correctFileEle = await questionEle.$('.qtype_essay_response')
        let correctEditorEle = await questionEle.$('.qtype_essay_editor')
        let feedbackEle = await questionEle.$('.feedback')

        let correct = ''
        if( correctFileEle ){
          correct = await questionEle.$eval('.qtype_essay_response', node=> node.innerText)
        }else if( correctEditorEle ){
          correct = await questionEle.$eval('.qtype_essay_editor', node=> node.innerText)
        }
        if( correct.length == 0 && feedbackEle){
          correct = await questionEle.$eval('.feedback', node=> node.innerText)
        }
        // log.debug(classType, question, correct)
        // \n\n 多个换行替换为1个换行
        correct = correct.replace( /[\n]{2,}/g, '\n');
        copyQuestion = { title: question, type: classType,  answer: correct, classType  }

      }else if(classType == 'shortanswer'){
        // 简单题，通常一行文本填空
        let rightanswer = await questionEle.$('.feedback .rightanswer')

        let correct = null
        if( rightanswer ){
          correct = await questionEle.$eval('.feedback .rightanswer', node=> node.innerText)
          // log.debug('chose ',labels);
          //正确的答案是“错”。
          correct = correct.replace( "正确答案是：", '' )
        }
        // log.debug(classType, question, correct)
        copyQuestion = { title: question, type: classType,  answer: correct, classType  }
      }
      else{
        log.error( '无法处理的题型', classType, question)
      }

    }
    copys.push( copyQuestion)

    questionNum++;

  }
 

  if(nextPage){
    log.debug('=======has nextPage=======');
    await Promise.all( [page.waitForNavigation(), nextPage.click()])

    let otherCopys =  await copyOneQuizByReview( page, false )
    copys = copys.concat( otherCopys)
  }else if(submitPage){
    log.debug('=======has submitPage=======');

  }
  return copys
}

/**
 * 答题
 * @param {*} driver 
 * @param {*} url 
 * @param {*} options 
 * @param {*} quizzes 
 * @param {*} lessonId - 考试Id
 * @param {*} quiznum - 考试在所有考试中的index
 */
async function handleQuizBase( driver, url,  options, quizzes, lessonId){
  


  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"

  let page = null
  page = await driver.get( url )
  await handle503(page, url);
  
  let attemptText = await page.$eval( '.quizattempt', node=> node.outerHTML)
  if( attemptText.includes('不允许再试')){
    log.error( '不允许再试' )
    return
  }
  
  await page.waitForSelector(startButtonSelector);
  await  handleDelay( 500  );

  let button = await page.$(startButtonSelector)

  let navSuccess = true
  // 进入测试页面
  await Promise.all( [page.waitForNavigation(), button.click()]).catch(async e=>{
    // 试试重新加载, 不能使用reload， 这样页面并不是新页面
    log.error( '答题页面打开超时...', e)
    navSuccess = false
      
  });

  if( navSuccess ){
    recursiveCount = 0
    await processOneQuiz( page, quizzes, lessonId, true,  0, options )
  }else{
    recursiveCount += 1
    log.warn( '答题页面打开超时 递归调用 handleQuizBase... ', navSuccess, recursiveCount)
    await handleQuizBase( driver, url,  options, quizzes, lessonId)
  }
}

/**
 * 
 * @param {*} driver 
 * @param {*} url 测试地址
 * @param {*} id 
 * @param {*} questionIndex 当前测验页面中的题在整个单元测试中的序号，用于显示当前题的排序序号
 * @param {*} isFirstPage 
 * @param {*} options - {submitquiz, type
 * @param {*} quizzes
 */ 
async function processOneQuiz( page, quizzes, lessonId, isFirstPage, questionIndex, options){
  let {submitquiz, type} = options
  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageSelector = "input[value=下一页]"
  let prevPageSelector = "input[value=上一页]"
  let submitPageSelector = "input[value*=结束]"  // 结束答题... , 结束试答...

  if(isFirstPage){
    log.debug('==============isFirstPage==============');
      
    // 如果不是第一页，进入第一页
    let currentUrl = await page.url();
    if( currentUrl.includes('page=')){
      currentUrl = currentUrl.replace( /&page=[0-9]/, '')
      await page.goto( currentUrl  )
    }

    await handleDelay( 500) 
        
  }

  await page.waitForSelector( queSelector );

  // 可能不存在
  const nextPage = await page.$(nextPageSelector)
  const prevPage = await page.$(prevPageSelector)
  const submitPage = await page.$(submitPageSelector)

  let questions = await page.$$(queSelector)
  //// log.debug( `questions:${questions.length}`)
  
  let questionNum = 0
  for (let i = 0; i < questions.length; i++) {
    let questionEle = questions[i];
    
    const classString = await page.evaluate(el => el.getAttribute("class"), questionEle);
    let classType = 'unkonw'
    let question = '' 
    let answerWrap = null
    classType = getQuestionClassType(classString )    

    if(classType == 'description'){
      continue;
    }
    questionIndex = questionIndex+1
     
    if(classType == 'multianswer' ){
      question =   await questionEle.$eval( '.formulation', node=> node.outerHTML)
      let parsed = parse(question)
      let spans = parsed.querySelectorAll( "span" )
      spans.forEach((ele)=>ele.remove())
      question = parsed.text
      answerWrap = await questionEle.$('.formulation')
    }else if(classType=='ddwtos'){
      question = await questionEle.$eval( '.qtext', node=> node.innerText)
      answerWrap = await questionEle.$('.formulation')
  
    }else{
      question = await questionEle.$eval( '.qtext', node=> node.innerText)
      answerWrap = await questionEle.$('.answer')
    }

    log.debug(`lessonId: ${lessonId}, questionIndex=${questionIndex}` );
    let key = null
    if( type == 'xingkao'){
      // 
      let list = quizzes.find((a)=>a.id==lessonId)
      let quiz = list.answers
      // log.debug(i,quiz.length, "question=", question)
      // quiz.find( ( a, k)=> { 
      //   log.debug( k, a.title, question.includes(a.title)); 
      //   return question.includes(a.title) && a.answer 
      // });
      key = quiz.find( ( a)=> question.includes(a.title) && a.answer )
    }else{
      let list = quizzes.find((a)=>a.id==lessonId)
      let quiz = list.answers
      key = quiz.find( ( a)=> question.includes(a.title) && a.answer)
    }
    log.debug('key---:',key);


    if( key ){
       
      let labels = await answerWrap.$$('label,.flex-fill')
      let labelTexts  = await answerWrap.$$eval('label,.flex-fill', nodes=> nodes.map( n=>n.innerText))
      let answerNumbers  = await answerWrap.$$eval('.answernumber', nodes=> nodes.map( n=>n.innerText))
      
      log.debug('labelTexts',labelTexts);
      if( classType == 'truefalse'){//判断题
        for( let k = 0; k< labelTexts.length; k++){
          let b = labelTexts[k]
          let label = labels[k]

          if(b==key.answer){
            await label.click()
            // log.debug('chose '+b);
          }else{
            continue
          }
        }
        
      }else if(classType == 'multichoice'){//选择题
        let ismulti = key.ismulti
        for( let k = 0; k< labelTexts.length; k++){
          let b = labelTexts[k]
          let label = labels[k]
          if( ismulti ){
            let corrects = key.answer.split(',')
            //  key.answer '正确答案是：增大金融风险, 削弱国家宏观经济政策的独立性和有效性, 加快金融危机在全球范围内的传递，增加了国际金融体系的脆弱性' 
            let found =   key.answer.includes(b) //corrects.find((a)=> b.includes(a))
            console.debug( ' key.answer',  key.answer, b, found)
            if( found ){
              await label.click()
            }
          }else{
            let isoptiononly = (key.answer.length ==1 && key.answer.search(/[A-Za-z]/)>=0)
            console.debug('isoptiononly, answerNumbers[k], key.answer', isoptiononly, answerNumbers[k], key.answer )
            // 'A. '.includes('A')
            if( isoptiononly && answerNumbers[k].includes( key.answer)){
              await label.click()
            }else if(b.includes( key.answer )){
              await label.click()
            }
          }

        }
      }else if(classType == 'shortanswer'){//填空题
        let input = await answerWrap.$('.formulation input.form-control')
        await input.focus();
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Delete');    
        await input.type( key.answer )

      }else if(classType == 'multianswer'){//填空题 或 选择题

        let inputs = await answerWrap.$$('.subquestion input.form-control')
        let selects = await answerWrap.$$('.subquestion select')
        
        let answers = key.answer

        if( inputs.length == answers.length){
          for(let i=0;i<inputs.length; i++){
            let input = inputs[i]
            let answer = answers[i]           
            await input.focus();
            await input.type( answer )
          }
        }else if( selects.length == answers.length){
          for(let i=0;i<selects.length; i++){
            let select = selects[i]
            let answer = answers[i]           
            await select.focus();
            await select.type( answer )
          }
        }else{
          log.error(`无法处理试题类型 classType=${classType}   ${i}`,question);
        }
      }else if(classType == 'essay'){//论述题
        
        await page.waitForSelector('iframe')
        const textBody = await answerWrap.$('iframe')
        await textBody.focus();
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Delete');
        await textBody.type( key.answer )

      }else if(classType == 'ddwtos'){
        let drops = await answerWrap.$$('.qtext .drop')
 
        let choices = await answerWrap.$$('.drags .drag')
        let choiceTexts = await answerWrap.$$eval('.drags .drag', nodes=> nodes.map( n=>n.innerText))
        let answers = key.answer
        log.debug( classType, 'answers=', answers, drops.length, choiceTexts, choices.length)
        if( drops.length == answers.length){
          for(let i=0;i<drops.length; i++){
            let drop = drops[i]
            let answer = answers[i]     
            let choice = null      
            for(let j=0;j<choiceTexts.length; j++){
              log.debug("i=", i, "j=",j,choiceTexts[j],answer, choiceTexts[j].includes(answer) )
              if( choiceTexts[j].includes(answer)){
                choice = choices[j]
                break
              }
            }
            if( choice && drop){

              // 移动 选项(choice) 到 对应的位置坑 (drop)
              const start = await choice.boundingBox();
              const end = await drop.boundingBox();
              log.debug("choice && drop" , start , end)
              await page.mouse.move(start.x, start.y);
              await page.mouse.down();
              await page.mouse.move(end.x + end.width/2,end.y+ end.height/2, {steps:50});
              await handleDelay( )
              await page.mouse.up();
              await handleDelay( )
            }

          }

        }


      }else{
        log.error(`无法处理试题类型 classType=${classType}   ${i}`,question);
      }
    }else{
       log.error(`无法找到试题 classType=${classType}   ${i}`,question);
    }
    
    questionNum++;
  }

  if(nextPage){
    await  handleDelay( 1000  );
    //log.debug('=======has nextPage=======');
    await Promise.all( [page.waitForNavigation(), nextPage.click()])

    return await processOneQuiz( page,quizzes,lessonId, false, questionIndex, options)
  }else if(submitPage){
    await  handleDelay( 1000  );

    //log.debug('=======has submitPage=======');
    await Promise.all([  page.waitForNavigation(), submitPage.click()])
    
    let is503 = await handle503(page);
    if( is503 ){
      // log.debug('=======handle submitPage 503=======');
    }
    // 提交后等 300ms，以免切换页面后，内容返回，导致新页面内容不正确, 因为ajax 所以 waitForNavigation 不起作用
    await  handleDelay(   );

  }

  // log.debug('options----:',options);

  if(submitquiz == 'yes'){
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url

    await page.waitForSelector( '.submitbtns button.btn-secondary' );

    const submitButton = await page.$$('.submitbtns button.btn-secondary')
    // log.debug('submitButton-----:',submitButton.length);
    await submitButton[1].click()
    // 等一下以免503
    await  handleDelay( 1000  );

    await page.waitForSelector( '.confirmation-dialogue input.btn-primary' );

    const ensureButton = await page.$$('.confirmation-dialogue input.btn-primary')
    // log.debug('ensureButton-----:',ensureButton.length);
    await Promise.all([  page.waitForNavigation(), ensureButton[0].click()])

    // 提交后等 300ms，以免直接切换页面，请求没有发到服务器端？
    await  handleDelay(  );
  }
}
 

/**
 * 提交空题，以便生成题库
 * @param {*} driver 
 * @param {*} baseurl 
 * @param {*} couseLessons 
 */
async function submitPlainQuizBase( driver, baseurl, couseLessons, filter, maxReview){
  

  let quizArray = []
  for (let i = 0; i < couseLessons.length; i++) {
    let lesson = couseLessons[i];

    let {type, id, title, sectionTitle} = lesson
    if( type == 'quiz'){
        // 访问url，读取所有试题，可能包含多页
      if( filter=='xingkao' && !(isXingkaoLessonTitle(title, sectionTitle))){        
          continue
      }
      let url = `${baseurl}?id=${id}`
      let newPage = await driver.get( url )
      let is503 = false

        //  let responseListener = async ( response )=> {
        //   let status = await response.status()
        //   if( status == 503){
        //     let url = await response.url()
        //     // log.debug( "resonse=", url)
        //     is503 = true
        //   }
        // }
        //newPage.on('response',responseListener )
        let quiz = await submitOneQuiz(newPage,  true, maxReview )
        // .catch( async (error)=>{
        //   let title = await newPage.title()

        //   log.debug( "catch title=", title)
        //   is503 = true
        // })

        
        //newPage.removeListener( 'response', responseListener)
      
        if( is503 ){
          // log.debug( '503 i=',i, i-1)
          i = i-1;
          continue
        }
         
        quizArray.push( quiz ) 
       

    }
  }
}
/**
 * 
 * @param {*} driver 
 * @param {*} url 测试地址
 * @param {*} isFirstPage 
 */ 
async function submitOneQuiz( page, isFirstPage, maxReview ){
  let submitquiz = 'yes'
  let reviewButtonSelector="table.quizattemptsummary .lastcol a"
  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"

  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageSelector = "input[value=下一页]"
  let prevPageSelector = "input[value=上一页]"
  let submitPageSelector = "input[value*=结束]"  // 结束答题... , 结束试答...
  await handle503(page);


  if(isFirstPage){    
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url

    let reviewButtons = await  page.$$(reviewButtonSelector)
    let startButton = await  page.$(startButtonSelector)

    if( reviewButtons.length>=maxReview ){
      log.warn( "find review button ", reviewButtons.length)  
      return 
    }else{
  
      await Promise.all( [page.waitForNavigation(), startButton.click()]) // 进入测试页面
      await handle503(page);
    }
  }


  await page.waitForSelector( queSelector );

  // 可能不存在
  const nextPage = await page.$(nextPageSelector)
  const prevPage = await page.$(prevPageSelector)
  const submitPage = await page.$(submitPageSelector)


  if(nextPage){
    //log.debug('=======has nextPage=======');
    await Promise.all( [page.waitForNavigation(), nextPage.click()])

    return await submitOneQuiz( page,false, maxReview)
  }else if(submitPage){
    //log.debug('=======has submitPage=======');
    await Promise.all([  page.waitForNavigation(), submitPage.click()])
    
    let is503 = await handle503(page);
    if( is503 ){
      // log.debug('=======handle submitPage 503=======');
    }
    // 提交后等 300ms，以免切换页面后，内容返回，导致新页面内容不正确, 因为ajax 所以 waitForNavigation 不起作用
    await  handleDelay(   );

  }

  // log.debug('options----:',options);

  if(submitquiz == 'yes'){
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url

    await page.waitForSelector( '.submitbtns .btn' );

    const submitButton = await page.$$('.submitbtns .btn-secondary')
    // log.debug('submitButton-----:',submitButton.length);
    await submitButton[1].click()

    await page.waitForSelector( '.confirmation-dialogue input.btn-primary' );

    const ensureButton = await page.$$('.confirmation-dialogue input.btn-primary')
    // log.debug('ensureButton-----:',ensureButton.length);
    await Promise.all([  page.waitForNavigation(), ensureButton[0].click()])

    // 提交后等 300ms，以免直接切换页面，请求没有发到服务器端？
    await  handleDelay(  );
  }
}

module.exports={
  parseCouse,
  parseCouseBase,
  parseCouseBase2,
  handleQuizBase,
  copyQuizBase,
  copyQuizBaseByReview,
  submitPlainQuizBase,
  submitOneQuiz,
  copyOneQuizByReview
}
