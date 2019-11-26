
// 毛泽东思想和中国特色社会主义理论体系概论
const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');

const {AnswerList} = require ('../makeAnswerJson.js');

async function parseCouseMaoGai(driver) {

  let progressPath = "//div[@class='progress-bar']/span"
  let sectionl1Path = "//ul[@class='flexsections flexsections-level-1']/li"
  let sectionl2Path = "//ul[@class='flexsections flexsections-level-2']/li"
  let sectionl2Css = "li.activity"
  let sectionl2LinkCss = "a"

  console.log('before wait ');
  await driver.wait(until.elementLocated(By.className('progress-bar')), 10000);
  console.log('after wait ');

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
      let href = ''
      let type = 'unkonwn' // text, video, quiz
      // http://anhui.ouchn.cn/theme/blueonionre/pix/page_h.png
      // http://anhui.ouchn.cn/theme/blueonionre/pix/core_h.png
      // http://anhui.ouchn.cn/theme/blueonionre/pix/quiz_h.png
      if (imgs.length >= 2) {
        // 每节课前面的图标
        let src = await imgs[0].getAttribute('src')
        if( src.includes('core_h.png')){
          type = 'video'
        }else if( src.includes('quiz_h.png')){
          type = 'quiz'
        }else if( src.includes('page_h.png')){
          type = 'page'
        }

        // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
        alt = await imgs[1].getAttribute('alt')
        let link = await b.findElement(By.css(sectionl2LinkCss))
        href = await link.getAttribute('href')
      }
      let course = {
        type: type,
        title: text,
        isFinish: alt.substring(0, 3),
        url: href,
        id: id.substring(7)
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

// 抽离成公共方法
const awaitWrap = (promise) => {
 return promise
  .then(data => [null, data])
  .catch(err => [err, null])
}

async function handleMaoGaiQuiz( driver, url, id ,num){
  let xpath = "//div[@class='singlebutton quizstartbuttondiv']//button"
  //let queXpath = "//div[@class='que truefalse deferredfeedback notyetanswered']"
  let queSelector = ".que.notyetanswered"
  let nextPageXpath = "//input[@value='下一页']"
  let prevPageXpath = "//input[@value='上一页']"
  let submitPageXpath = "//input[@value='结束答题…']"
  let queContentXpath="//div[@class='qtext']/p"
  let queAnswerXpath="//div[@class='answer']//input"
  await driver.get(url)
  await driver.wait(until.elementLocated(By.xpath(xpath)), 15000);
  let button = await driver.findElement(By.xpath(xpath))
  button.click() // 进入测试页面
  await driver.wait(until.elementLocated(By.css(queSelector)), 15000);
  // 可能不存在
  const [err1, nextPage] = await awaitWrap(driver.findElement(By.xpath(nextPageXpath)))
  const [err2, prevPage] = await awaitWrap(driver.findElement(By.xpath(prevPageXpath)))
  const [err3, submitPage] = await awaitWrap(driver.findElement(By.xpath(submitPageXpath)))
  let questions = await driver.findElements(By.css(queSelector))
  console.debug( `questions:${questions.length}`)

  let keyWords1 = ['一', '二', '三', '四'];
  let level_1 = 0;
  let level_2 = 0;
  let fakeQuestionNum = 0;

  let answerList = new AnswerList()

  let jsonStr = answerList.makeAnswerJson("./db/xi.txt")

  for (let i = 0; i < questions.length; i++) {
    let questionEle = questions[i];
    let content = await questionEle.findElement(By.css('.qtext p'))
    let answerInputs = await questionEle.findElements(By.css('.answer input'))
    let answerLabels = await questionEle.findElements(By.css('.answer label'))
    let question = await content.getText()
    console.log('question---:',question);
    if(keyWords1.indexOf(question[0]) != -1){
      fakeQuestionNum++;
      continue;
    }
    let key = jsonStr[num][level_1][i-fakeQuestionNum]
    console.log('key---:',key);
    for( let j = 0; j< answerInputs.length; j++){
      let answer = answerInputs[j];
      let label = answerLabels[j]
      let a =  await answer.getAttribute('value')
      let b =  await label.getText()
      if(b[0]==key.answer[0]){
        label.click()
        console.log(a+b);
      }
    }
  }
}
module.exports={
  parseCouseMaoGai,
  handleMaoGaiQuiz
}
