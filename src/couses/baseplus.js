const fs = require('fs');
const { log } = require('../logger');

const { handle503, handleDelay, isXingkaoLessonTitle} = require ('../utilplus');

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
    let text = await a.$eval('div',node=>node.innerText)
    let idHandle = await a.getProperty('id')
    let sectionId = await idHandle.jsonValue()
    // log.debug(`levelOne.text ${i} ${sectionId} ${text}`)
    let levelTwo = await a.$$(sectionl2Css)
    if (levelTwo.length == 0) {
      // log.debug(`levelOne.text ${i} ${sectionId} ${text} 没有内容。`)
      continue
    }
    // 电大资源区，自建资源区
    if( /课程文件|资源更新区|电大资源区|资源自建区|资源区/.test( text )){
      continue
    }
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
        }
      }

      if (imgs.length >= 2) {
        // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
        let altHandle =  await imgs[1].getProperty('alt')
        alt = await altHandle.jsonValue()
        //let link = await b.$eval( sectionl2LinkCss, node=> node.href )
        href = await b.$eval( sectionl2LinkCss, node=> node.href )
      }
      let course = {
        classId: classId, // 用于script调用，如完成视频
        sectionId: sectionId.substring(8), // section-xxx
        type: type,
        title: text,
        isFinish: alt.substring(0, 3),
        url: href,
        id: id.substring(7) // module-xxx
      }
      status.push(course)
      if (alt.startsWith("未完成")) {
        // log.debug(`levelTwo.text ${j} ${id} ${type} ${text} ${href} ${alt}`)
      }
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
    let text = await a.$eval('.sectionname,.section-title',node=>node.innerText)
    let idHandle = await a.getProperty('id')
    let sectionId = await idHandle.jsonValue()
    log.debug(`levelOne.text ${i} ${sectionId} ${text}`)
    let levelTwo = await a.$$(sectionl2Css)
    if (levelTwo.length == 0) {
      log.debug(`levelOne.text ${i} ${sectionId} ${text} 没有内容。`)
      continue
    }
    // 电大资源区，自建资源区
    if( /课程文件|资源更新区|电大资源区|资源自建区|资源区/.test( text )){
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

    let {type,id, title} = lesson

    if( type == 'quiz'){
      log.debug( "quiz title=",  title, "filter", filter)
        // 访问url，读取所有试题，可能包含多页
      if( filter=='xingkao' && !(isXingkaoLessonTitle(title))){        
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
         
        quizArray.push( quiz ) 
       
        handleDelay( 1000)

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
  let submitPageSelector = "input[value=结束答题…]"
  
  if(isFirstPage){

    // log.debug('==============isFirstPage==============');
     
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
 
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

    if( classString.includes( 'description') ){
      classType = 'description'
    }else if( classString.includes( 'truefalse') ){
      classType = 'truefalse'
    }else if( classString.includes( 'multichoice') ){
      classType = 'multichoice'      
    }else if( classString.includes( 'multianswer') ){
      classType = 'multianswer'      
    }

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
async function copyQuizBaseByReview(driver, baseurl, couseLessons ) {
  

  let quizArray = []
  for (let i = 0; i < couseLessons.length; i++) {
    let lesson = couseLessons[i];

    let {type,id} = lesson
    if( type == 'quiz'){
        // 访问url，读取所有试题，可能包含多页

      let url = `${baseurl}?id=${id}`
      let newPage = await driver.get( url )
      let is503 = false

        let quiz = await copyOneQuizByReview(newPage,  true, url, couseLessons, 0,).catch( async (error)=>{
          let title = await newPage.title()
          // log.debug( "catch title=", title)
          is503 = true
        })
        
        //newPage.removeListener( 'response', responseListener)
      
        if( is503 ){
          // log.debug( '503 i=',i, i-1)
          i = i-1;
          continue
        }
         
        quizArray.push( quiz ) 
       

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
async function copyOneQuizByReview( page,  isFirstPage, url ){
  // 读取课程分析文件
  // 选出所有的测试项目
  let reviewButtonSelector="table.quizattemptsummary .lastcol a"
  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"
  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageSelector = "input[value=下一页]"
  let prevPageSelector = "input[value=上一页]"
  let submitPageSelector = "input[value=结束答题…]"
  

  if(isFirstPage){
    // log.debug('==============isFirstPage==============');
     
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
 
    await page.waitForSelector(reviewButtonSelector);
    let button = await  page.$(reviewButtonSelector)

    await Promise.all( [page.waitForNavigation(), button.click()]) // 进入测试页面
  }

  await page.waitForSelector( queSelector );

  // 可能不存在
  const nextPage = await page.$(nextPageSelector)
  const prevPage = await page.$(prevPageSelector)
  const submitPage = await page.$(submitPageSelector)

  let questions = await page.$$(queSelector)
  // log.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];

  
  let questionNum = 0
  let copys = []
  for (let i = 0; i < questions.length; i++) {
    let classType = 'unknow'
    let copyQuestion = { title: '问题', type: '问题类型', options: ['选项数组'], answer: '', classType }

    let questionEle = questions[i];
    let question = await questionEle.$eval( '.qtext', node=> node.innerText)
    
    const classString = await page.evaluate(el => el.getAttribute("class"), questionEle);

    if( classString.includes( 'description') ){
      classType = 'description'
    }else if( classString.includes( 'truefalse') ){
      classType = 'truefalse'
    }else if( classString.includes( 'multichoice') ){
      classType = 'multichoice'      
    }else if( classString.includes( 'multianswer') ){
      classType = 'multianswer'      
    }

    let answerWraps = await questionEle.$$('.answer')
    // log.debug('question---:',question  );
    
    if (keyWords1.indexOf(question[0]) != -1 && question[1] =='、') {
      questionNum = 0; // 每一道题的下标

      copyQuestion = { title: question, type: 'h1', classType  }
      copys.push( copyQuestion)
      continue;
    }

    //// log.debug('key---:',key);
    for( let j = 0; j< answerWraps.length; j++){
      let answer = answerWraps[j];

      //let as =  await answer.$$eval('input', node=> node.value)
      let labels  = await answer.$$eval('label', nodes=> nodes.map( n=>n.innerText))
      // 正确的答案是“错”。
      // 正确答案是：质量互变规律
      let correct = await questionEle.$eval('.feedback .rightanswer', node=> node.innerText)

      if(labels.length==2){//判断题
        
          // log.debug('chose ',labels);
          //正确的答案是“错”。
          correct = correct.substr( 7,1)
          copyQuestion = { title: question, type: 'tof', options: labels, answer: correct, classType  }
      }else{//选择题
        // a. 国家开放大学是基于信息技术的特殊的大学
        // let fixedLabels = labels.map( b => b.replace(/\s*/g,"").replace(".","").substring(1)  )
        // 有的选项中有换行符，去掉
        let fixedLabels = labels.map( b => b.replace(/[\n\r]+/g,"") )
        // 正确答案是：质量互变规律
        correct = correct.substr( 6 )

        copyQuestion = { title: question, type: 'select', options: fixedLabels, answer: correct, classType  }

        // log.debug('chose ', fixedLabels);

      }
    }
    copys.push( copyQuestion)

    questionNum++;

  }
 

  if(nextPage){
    // log.debug('=======has nextPage=======');
    await Promise.all( [page.waitForNavigation(), nextPage.click()])

    let otherCopys =  await copyOneQuizByReview( page, false )
    copys = copys.concat( otherCopys)
  }else if(submitPage){
    // log.debug('=======has submitPage=======');

  }
  return copys
}

/**
 * 答题
 * @param {*} driver 
 * @param {*} url 
 * @param {*} options 
 * @param {*} answsers 
 * @param {*} quiznum - 考试在所有考试中的index
 */
async function handleQuizBase( driver, url,  options, answsers, quiznum){
  

  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"

  let page = null
  page = await driver.get( url )
  await handle503(page, url);

  await page.waitForSelector(startButtonSelector);
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
    await processOneQuiz( page,answsers, quiznum, options )
  }else{
    recursiveCount += 1
    log.warn( '答题页面打开超时 递归调用 handleQuizBase... ', navSuccess, recursiveCount)
    await handleQuizBase( driver, url,  options, answsers, quiznum)
  }
}

/**
 * 
 * @param {*} driver 
 * @param {*} url 测试地址
 * @param {*} id 
 * @param {*} quiznum 测试在所有测验中的位置，对应题库的索引
 * @param {*} isFirstPage 
 * @param {*} options - {submitquiz, filter
 * @param {*} answsers 
 */ 
async function processOneQuiz( page, answsers,  quiznum, options){
  let {submitquiz, filter} = options
  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageSelector = "input[value=下一页]"
  let prevPageSelector = "input[value=上一页]"
  let submitPageSelector = "input[value=结束答题…]"
  await handle503(page);

  await page.waitForSelector( queSelector );

  // 可能不存在
  const nextPage = await page.$(nextPageSelector)
  const prevPage = await page.$(prevPageSelector)
  const submitPage = await page.$(submitPageSelector)

  let questions = await page.$$(queSelector)
  //// log.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];
  
  let questionNum = 0
  for (let i = 0; i < questions.length; i++) {
    let questionEle = questions[i];
    let question = await questionEle.$eval( '.qtext p', node=> node.innerText)
    let answerWraps = await questionEle.$('.answer')

    const classString = await page.evaluate(el => el.getAttribute("class"), questionEle);
    let classType = 'unkonw'

    if( classString.includes( 'description') ){
      classType = 'description'
    }else if( classString.includes( 'truefalse') ){
      classType = 'truefalse'
    }else if( classString.includes( 'multichoice') ){
      classType = 'multichoice'      
    }else if( classString.includes( 'multianswer') ){
      classType = 'multianswer'      
    }

    if(classType == 'description'){
      continue;
    }
    //log.debug(`answsers[${quiznum}][${pagenum}][${questionNum}]:`);
    let key = null
    if( filter == 'xingkao'){
      let list = answsers[quiznum]

      key = list.find( ( a)=> a.title.includes(question))
    }else{
      key = answsers[quiznum][questionNum]

    }
    //log.debug('key---:',key);


    if( key ){
      let answer = answerWraps;
      let labels = await answer.$$('label')
      let labelTexts  = await answer.$$eval('label', nodes=> nodes.map( n=>n.innerText))

      //log.debug(labelTexts);
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
        for( let k = 0; k< labelTexts.length; k++){
          let b = labelTexts[k]
          let label = labels[k]
          if(b.includes( key.answer )){
            await label.click()
          }
        }
      }else if(classType == 'multianswer'){//填空题
        log.error(`填空题 quiznum=${quiznum}   ${i}`,question);

      }else{
        log.error(`无法处理试题类型 quiznum=${quiznum}   ${i}`,question);
      }
    }else{
       log.error(`无法找到试题 quiznum=${quiznum}   ${i}`,question);
    }

    
    questionNum++;
  }

  if(nextPage){
    //log.debug('=======has nextPage=======');
    await Promise.all( [page.waitForNavigation(), nextPage.click()])

    return await processOneQuiz( page,answsers,quiznum, options)
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

    await page.waitForSelector( '.submitbtns button.btn-secondary' );

    const submitButton = await page.$$('.submitbtns button.btn-secondary')
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
 


/**
 * 形考答题
 * @param {*} driver 
 * @param {*} url 
 * @param {*} options 
 * @param {*} answsers 
 * @param {*} quiznum - 考试在所有考试中的index
 */
async function handleXingkaoBase( driver, url,  options, answsers, quiznum){
  

  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"

  let page = null
  page = await driver.get( url )
  await handle503(page, url);

  await page.waitForSelector(startButtonSelector);
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
    await processOneQuiz( page,answsers, quiznum, options )
  }else{
    recursiveCount += 1
    log.warn( '答题页面打开超时 递归调用 handleQuizBase... ', navSuccess, recursiveCount)
    await processOneQuiz( driver, url,  options, answsers, quiznum)
  }
}

/**
 * 提交空题，以便生成题库
 * @param {*} driver 
 * @param {*} baseurl 
 * @param {*} couseLessons 
 */
async function submitPlainQuizBase( driver, baseurl, couseLessons){
  

  let quizArray = []
  for (let i = 0; i < couseLessons.length; i++) {
    let lesson = couseLessons[i];

    let {type,id} = lesson
    if( type == 'quiz'){
        // 访问url，读取所有试题，可能包含多页

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
        let quiz = await submitOneQuiz(newPage,  true, url, couseLessons, 0,)
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
async function submitOneQuiz( page, isFirstPage ){
  let submitquiz = 'yes'
  let reviewButtonSelector="table.quizattemptsummary .lastcol a"
  let startButtonSelector="div.quizstartbuttondiv button[type=submit]"

  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageSelector = "input[value=下一页]"
  let prevPageSelector = "input[value=上一页]"
  let submitPageSelector = "input[value=结束答题…]"
  await handle503(page);


  if(isFirstPage){    
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url

    let reviewButton = await  page.$(reviewButtonSelector)
    let startButton = await  page.$(startButtonSelector)

    if( reviewButton ){
      log.warn( "find review button ")  
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

    return await submitOneQuiz( page,false)
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

    await page.waitForSelector( '.submitbtns button.btn-secondary' );

    const submitButton = await page.$$('.submitbtns button.btn-secondary')
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
  submitPlainQuizBase
}
