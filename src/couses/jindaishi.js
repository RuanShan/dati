
// 国家开放大学学习指南
const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const {answers} = require ('../../db/answers/jindaishiList.json');
async function parseCouseJinDaiShi(driver) {

  let progressPath = "//div[@class='progress-bar']/span"
  let sectionl1Path = "//ul[@class='flexsections flexsections-level-1']/li"
  let sectionl2Path = "//ul[@class='flexsections flexsections-level-2']/li"
  let sectionl2Css = "li.activity"
  let sectionl2LinkCss = "a"
  await driver.wait(until.elementLocated(By.className('progress-bar')), 10000);

  let title = await driver.getTitle()
  let url = await driver.getCurrentUrl()
  console.log('url----------------:', url);
  let classId = url.substring(url.indexOf('id=') + 3);
  console.log('classId----:', classId);


  let levelOne = await driver.findElements(By.xpath(sectionl1Path))
  let progressContainer = await driver.findElement(By.xpath(progressPath))
  let progress = await progressContainer.getText()

  let status = []
  let classinfo = {
    title: title,
    url: url,
    classId: classId,
    progress: progress
  }
  for (let i = 0; i < levelOne.length; i++) {
    let a = levelOne[i]
    let text = await a.getText()
    let id = await a.getAttribute('id')
    console.log(`levelOne.text ${i} ${id} ${text}`)
    let levelTwo = await a.findElements(By.css(sectionl2Css))
    if (levelTwo.length == 0) {
      console.log(`levelOne.text ${i} ${id} ${text} 没有内容。`)
      continue
    }
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
      let imgs = await b.findElements(By.tagName('img'))
      let alt = "未完成"
      let type = 'unkonwn' // text, video, quiz
      let href = ''
      if (imgs.length >= 1){
        let src = await imgs[0].getAttribute('src')
        if( src.includes('core_h.png') ){ //视频1：新时代党的建设总要求网页地址
          type = 'video'
        }else if( src.includes('quiz_h.png')){
          type = 'quiz'
        }else if( src.includes('page_h.png')){
          type = 'page'
        }
      }
      if (imgs.length >= 2) {
        // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
        alt = await imgs[1].getAttribute('alt')
        let link = await b.findElement(By.css(sectionl2LinkCss))
        href = await link.getAttribute('href')
      }
      let course = {
        title: text,
        type: type,
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
  let couseJson = {
    score: classinfo,
    status: status
  }

  return couseJson
}

async function handleJinDaiShiQuiz( driver, url, id ,num,isFirstPage){
  console.log('====================handleJinDaiShiQuiz================');
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
    console.log('url-----:',url);
    await driver.get(url)
    await driver.wait(until.elementLocated(By.xpath(xpath)), 15000);
    let button = await driver.findElement(By.xpath(xpath))
    button.click() // 进入测试页面
  }

  console.log('111111111111111111111111111111');
  await driver.wait(until.elementLocated(By.css(queSelector)), 15000);
  // 可能不存在
  const [err1, nextPage] = await awaitWrap(driver.findElement(By.xpath(nextPageXpath)))
  const [err2, prevPage] = await awaitWrap(driver.findElement(By.xpath(prevPageXpath)))
  const [err3, submitPage] = await awaitWrap(driver.findElement(By.xpath(submitPageXpath)))

  let questions = await driver.findElements(By.css(queSelector))
  console.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];
  let level_1 = 0;
  let fakeQuestionNum = 0;

  let jsonStr = answers
  // let jsonStr = ''
  let keynum = 0
  for (let i = 0; i < questions.length; i++) {
    let questionEle = questions[i];
    let content = await questionEle.findElement(By.css('.qtext p,.qtext li'))
    let answerInputs = await questionEle.findElements(By.css('.answer input[type=checkbox],.answer input[type=radio]'))
    let answerLabels = await questionEle.findElements(By.css('.answer label'))

    let question = await content.getText()
    console.log('question---:',question);
    if(keyWords1.indexOf(question[0]) != -1){
      keynum = 0;
      level_1+=keyWords1.indexOf(question[0]);
      continue;
    }
    console.log('keynum-fakeQuestionNum====:',keynum);
    let key = jsonStr[num][level_1][keynum-fakeQuestionNum]
    console.log('key---:',key);
    for( let j = 0; j< answerInputs.length; j++){
      let answer = answerInputs[j];
      let label = answerLabels[j]
      let a =  await answer.getAttribute('value')
      let b =  await label.getText()
      console.log('label--:',b);
      if(b.length==1){//pan duan ti
        if(b==key.answer){
          await label.click()
          console.log('chose '+b);
        }else{
          continue
        }
      }else{//xuan ze ti
        let answerStr = key.answer.replace(/\s*/g,"").replace(".","").replace("''","");
        console.log('answerStr-----:',answerStr);
        let labelStr = b.replace(/\s*/g,"").replace(".","").substring(1)
        console.log('labelStr---:',labelStr);
        if(answerStr.indexOf(labelStr)!=-1||answerStr=='全部'){
          console.log('chose '+b);
          console.log('type--:',await answer.getAttribute('type'));
          console.log('checked--:',await answer.getAttribute('checked'));
          if(await answer.getAttribute('type')=='checkbox'&&await answer.getAttribute('checked')){
            continue;
          }else{
            await answer.click()
          }
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
    return await handleJinDaiShiQuiz( driver, url, id ,num,false)
  }else if(submitPage){
    console.log('=======has submitPage=======');
    await submitPage.click()
  }
}

const awaitWrap = (promise) => {
 return promise
  .then(data => [null, data])
  .catch(err => [err, null])
}
module.exports={
  parseCouseJinDaiShi,
  handleJinDaiShiQuiz
}
