
// 毛泽东思想和中国特色社会主义理论体系概论
const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const fs = require('fs');

const {answers} = require ('../../db/answers/xiList.json');
const { handle503, handleDelay} = require ('../utilplus');

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

  console.log('before wait ');
  await page.waitForSelector( '.progress-bar' );
  console.log('after wait ');

  let title = await page.title()
  let url = await page.url()
  console.log('url----------------:', url);
  let classId = url.substring(url.indexOf('id=') + 3);
  console.log('classId----:', classId);


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
    console.log(`levelOne.text ${i} ${sectionId} ${text}`)
    let levelTwo = await a.$$(sectionl2Css)
    if (levelTwo.length == 0) {
      console.log(`levelOne.text ${i} ${sectionId} ${text} 没有内容。`)
      continue
    }
    if( /课程文件|资源更新区|电大资源区|资源自建区/.test( text )){
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
      if (imgs.length >= 1){
        // 每节课前面的图标
        let srcHandle =  await imgs[0].getProperty('src')
        let src = await srcHandle.jsonValue()
        console.log( "src=", src  )
        if( src.includes('core_h.png')){ //视频1：新时代党的建设总要求网页地址
          type = 'video'
        }else if( src.includes('quiz_h.png')){
          type = 'quiz'
        }else if( src.includes('page_h.png')){
          type = 'page'
        }else if( src.includes('assign_h.png')){
          type = 'assign'
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
        console.log(`levelTwo.text ${j} ${id} ${type} ${text} ${href} ${alt}`)
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
 * 
 * 解析专题测验的内容，生产题库
 * @param {*} courseLessions array { classId: "6071", sectionId: "7", type:"quiz", title:"专题测验", isFinish:"未完成", url:"", id:"779651", position:	1}
 * @param {*} position 测试在所有测验中的位置，对应题库的索引
 * @param {*} isFirstPage 
 * @return {[]} quiz [{ title: '问题', type: 'header,tof,select问题类型', options: ['选项数组']} ]
 * 
 */
async function copyQuizBase(driver, baseurl, couseLessons ) {
  
  // driver.browser.on('targetchanged', async target=>{
  //   let page = await target.page()
  //   await page.waitForNavigation()

  //   let title = await page.title()
  //   let url = await page.url()
  //   console.debug( title, url)
  // })

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
        //     console.debug( "resonse=", url)
        //     is503 = true
        //   }
        // }
        //newPage.on('response',responseListener )
        let quiz = await copyOneQuiz(newPage,  true, url, couseLessons, 0,).catch( async (error)=>{
          let title = await newPage.title()

          console.debug( "catch title=", title)
          is503 = true
        })

        
        //newPage.removeListener( 'response', responseListener)
      
        if( is503 ){
          console.log( '503 i=',i, i-1)
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
    console.log('==============isFirstPage==============');
     
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
 
    await page.waitForSelector(startButtonSelector);
    let button = await  page.$(startButtonSelector)
    
    // let date = new Date()
    // await  driver.wait( function(){
    //   return new Promise((resolve, reject) => {
    //     console.error("isFirstPage 延时3秒" )
    //     setTimeout(()=>{ resolve(true)}, 2000);
    //   })
    // });
    // console.error("isFirstPage 延时3秒结束", (new Date()).getTime() - date.getTime()  )

    await Promise.all( [page.waitForNavigation(), button.click()]) // 进入测试页面
  }

  await page.waitForSelector( queSelector );

  // 可能不存在
  const nextPage = await page.$(nextPageSelector)
  const prevPage = await page.$(prevPageSelector)
  const submitPage = await page.$(submitPageSelector)

  let questions = await page.$$(queSelector)
  console.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];
  let level_1 = 0;
  let fakeQuestionNum = 0; // 大标题不是问题，所以

  
  // let jsonStr = ''
  let keynum = 0
  let copys = []
  for (let i = 0; i < questions.length; i++) {
    let copyQuestion = { title: '问题', type: '问题类型', options: ['选项数组'], answer: '' }

    let questionEle = questions[i];
    let question = await questionEle.$eval( '.qtext p', node=> node.innerText)
    //let answerInputs = await questionEle.$$('.answer input')
    //let answerLabels = await questionEle.$$('.answer label')
    let answerWraps = await questionEle.$$('.answer')
    console.log('question---:',question  );
    
    if(keyWords1.indexOf(question[0]) != -1){
      keynum = 0; // 每一道题的下标
      level_1=keyWords1.indexOf(question[0]);
      copyQuestion = { title: question, type: 'h1'  }
      copys.push( copyQuestion)
      continue;
    }
    //let key = jsonStr[num][level_1][keynum]
    //console.log('key---:',key);
    for( let j = 0; j< answerWraps.length; j++){
      let answer = answerWraps[j];

      //let as =  await answer.$$eval('input', node=> node.value)
      let labels  = await answer.$$eval('label', nodes=> nodes.map( n=>n.innerText))

      console.log(labels);
      if(labels.length==2){//判断题
        
          console.log('chose ',labels);
          copyQuestion = { title: question, type: 'tof', options: labels  }
      }else{//选择题
        // a. 国家开放大学是基于信息技术的特殊的大学
        // let fixedLabels = labels.map( b => b.replace(/\s*/g,"").replace(".","").substring(1)  )
        // 有的选项中有换行符，去掉
        let fixedLabels = labels.map( b => b.replace(/[\n\r]+/g,"") )

        copyQuestion = { title: question, type: 'select', options: fixedLabels  }

        console.log('chose ', fixedLabels);

      }
    }
    copys.push( copyQuestion)

    keynum++;

  }
 

  if(nextPage){
    console.log('=======has nextPage=======');
    await Promise.all( [page.waitForNavigation(), nextPage.click()])

    let otherCopys =  await copyOneQuiz( page, false )
    copys = copys.concat( otherCopys)
  }else if(submitPage){
    console.log('=======has submitPage=======');

  }
  return copys
}


// 抽离成公共方法
const awaitWrap = (promise) => {
 return promise
  .then(data => [null, data])
  .catch(err => [err, null])
}


/**
 * 
 * @param {*} driver 
 * @param {*} url 测试地址
 * @param {*} id 
 * @param {*} num 测试在所有测验中的位置，对应题库的索引
 * @param {*} isFirstPage 
 * @param {*} options 
 * @param {*} code 
 */ 
async function handleQuizBase( driver, url, id ,num,isFirstPage,options,code){
  console.log('====================handleQuizBase================');
  let xpath = "//div[@class='singlebutton quizstartbuttondiv']//button"
  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que"
  let nextPageXpath = "//input[@value='下一页']"
  let prevPageXpath = "//input[@value='上一页']"
  let submitPageXpath = "//input[@value='结束答题…']"
  let queContentXpath="//div[@class='qtext']/p"
  let queAnswerXpath="//div[@class='answer']//input"
  console.log('isFirstPage-----:',isFirstPage);
  if(isFirstPage){
    console.log('==============isFirstPage==============');
    await driver.get(url)
    
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
    for( i=1; i<5; i++){
      let ok = await handle503( driver, url, 5000*i );
      if(ok){
        break;
      }
    }
    await driver.wait(until.elementLocated(By.xpath(xpath)), 15000);
    let button = await driver.findElement(By.xpath(xpath))
    let date = new Date()
    await  driver.wait( function(){
      return new Promise((resolve, reject) => {
        console.error("isFirstPage 延时3秒" )
        setTimeout(()=>{ resolve(true)}, 2000);
      })
    });
    console.error("isFirstPage 延时3秒结束", (new Date()).getTime() - date.getTime()  )

    await button.click() // 进入测试页面
  }

  await driver.wait(until.elementLocated(By.css(queSelector)), 15000);
  // 可能不存在
  const [err1, nextPage] = await awaitWrap(driver.findElement(By.xpath(nextPageXpath)))
  const [err2, prevPage] = await awaitWrap(driver.findElement(By.xpath(prevPageXpath)))
  const [err3, submitPage] = await awaitWrap(driver.findElement(By.xpath(submitPageXpath)))

  let questions = await driver.findElements(By.css(queSelector))
  console.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];
  let level_1 = 0;
  let fakeQuestionNum = 0; // 大标题不是问题，所以

  let jsonStr = JSON.parse(fs.readFileSync('./db/answers/'+code+'_xiList.json','utf8'));
  jsonStr = jsonStr.answers
  // console.log('jsonStr----:',jsonStr);
  // let jsonStr = ''
  let keynum = 0
  for (let i = 0; i < questions.length; i++) {
    let questionEle = questions[i];
    let content = await questionEle.findElement(By.css('.qtext p'))
    let answerInputs = await questionEle.findElements(By.css('.answer input'))
    let answerLabels = await questionEle.findElements(By.css('.answer label'))
    let question = await content.getText()
    console.log('question---:',question);
    if(keyWords1.indexOf(question[0]) != -1){
      keynum = 0; // 每一道题的下标
      level_1=keyWords1.indexOf(question[0]);
      continue;
    }
    let key = jsonStr[num][level_1][keynum]
    console.log('key---:',key);
    for( let j = 0; j< answerInputs.length; j++){
      let answer = answerInputs[j];
      let label = answerLabels[j]
      let a =  await answer.getAttribute('value')
      let b =  await label.getText()
      console.log(a+b);
      if(b.length==1){//pan duan ti
        if(b==key.answer){
          await label.click()
          console.log('chose '+b);
        }else{
          continue
        }
      }else{//xuan ze ti
        if(b.replace(/\s*/g,"").replace(".","").substring(1)==key.answer.replace(/\s*/g,"").replace(".","").substring(1)){
          await label.click()
          console.log('chose '+b);
        }
      }
    }
    keynum++;

  }
  console.log('nextPage----:',nextPage);
  console.log('submitPage----:',submitPage);

  if(nextPage){
    console.log('=======has nextPage=======');
    await nextPage.click()

    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
    for( i=1; i<5; i++){
      let ok = await handle503( driver, null, 5000*i );
      if(ok){
        break;
      }
    }

    return await handleQuizBase( driver, url, id ,num,false,options,code)
  }else if(submitPage){
    console.log('=======has submitPage=======');
    await submitPage.click()
  }

  console.log('options----:',options);

  if(options.submitquiz == 'yes'){
    // 如果标题 '503 Service' 开头, 表示503错误，需要重新载入url
    for( i=1; i<5; i++){
      let ok = await handle503( driver, null, 5000*i );
      if(ok){
        break;
      }
    }
    await driver.wait(until.elementLocated(By.css('.submitbtns button.btn-secondary')), 15000);
    const submitButton = await driver.findElements(By.css('.submitbtns button.btn-secondary'))
    console.log('submitButton-----:',submitButton.length);
    await submitButton[1].click()

    await driver.wait(until.elementLocated(By.css('.confirmation-dialogue input.btn-primary')), 15000);
    const ensureButton = await driver.findElements(By.css('.confirmation-dialogue input.btn-primary'))
    console.log('ensureButton-----:',ensureButton.length);
    await ensureButton[0].click()

    // 提交后等 300ms，以免直接切换页面，请求没有发到服务器端？
    await  handleDelay( driver, 300);
  }
}
 
/**
 * 解析形考测试文本文件，生成题库
 * @param {*} file_path 
 */
async function parseAnswerTextBase(file_path) {
  console.log('====================makeSiXiuAnswerJson======================');
  var answerJson = null
  var i = 1; //txt中的行数
  let answerList = []
  let keyWords1 = ['一', '二', '三', '四','五','六','七','八','九'];
  let keyWords2 = ['1', '2', '3', '4', '5', '6', '7', '8', '9' ]

  let level_1 = 0;
  let level_2 = 0;

  var data = fs.readFileSync(file_path, 'utf-8');

  let results = data.split(/(?:\n|\r\n|\r)/g)

  if (results.length > 0) {
    for (let i = 0; i < results.length; i++) {
      let result = results[i]
      if (result.length > 0) {
        if (keyWords1.indexOf(result[0]) != -1 && result[1] =='、') {
          answerList[level_1 - 1].push([])
          level_2++;
        } else if (result.indexOf('正确答案是：') != -1) {
          let answer = result.replace("正确答案是：","")
          let param = {
            answer: answer
          }
          console.log( 'level', level_1,level_2, 'result', result)
          answerList[level_1 - 1][level_2 - 1].push(param)
        } else if(result.indexOf('专题')==0){
          level_2 = 0
          answerList.push([]);
          level_1++;
        }
      }
    }
  }
  console.log('answerList------------:',JSON.stringify( answerList ));
  return answerList
}


module.exports={
  parseCouseBase,
  handleQuizBase,
  copyQuizBase
}
