
const fs = require('fs');
const { log } = require('./logger');

const domain = 'ouchn.cn'
async function scrollToBottom(page) {

  let getScrollHeightScript = "document.body.scrollHeight;"

  let scrollHight = await page.evaluate(getScrollHeightScript)
  console.log("scrollHight=", scrollHight)
  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  // 需要检查路径是否在 http://anhui.ouchn.cn/ 下，animate可能不存在
  let url = await page.url()
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; jQuery("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  if( url.indexOf( domain )<0){
    script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; window.scrollTo(0,document.body.scrollHeight);'
  }
  await page.evaluate(script)
  
  let delay = Math.ceil(parseInt(scrollHight) / 500) * 1000

  await handleDelay( delay )
   
}

function scrollToCenter(driver) {
  // let script = "var h=document.body.scrollHeight; window.scrollTo(0,document.body.scrollHeight)"
  // 每秒500px
  let script = 'var timespan = Math.ceil(document.body.scrollHeight/500)*1000; $("html,body").animate({scrollTop: document.body.scrollHeight + "px"}, timespan);'
  driver.executeScript(script)
}


// (webElement) video
async function playVideo(driver, canvas) {

  console.log('this is a video');

  let video = await driver.waitForSelector( 'video' );

  let duration = await driver.wait(function() {
    return video.getAttribute('duration').then(function(aaaa) {
      console.log('aaaa----:', aaaa);
      if(!(isNaN(aaaa))){
        return aaaa
      }
      return  !(isNaN(aaaa))
    });
  }, 10000);
  console.log('duration----:', duration);
  // setTimeout
  await canvas.click()
  // 等待视频播放完毕
  return new Promise((resolve, reject) => {
    setTimeout(resolve, duration * 1000, video);
  })

}



function playVideoTimeout(video) {
  console.log("video is over")
  return true
}

function getCourseNameByCode(code) {
  // liaoning
  console.debug( "code=", code )
  // if (code == '3796') return '3796_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4372') return '4372_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4487') return '4487_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4485') return '4485_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4608') return '4608_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '4610') return '4610_毛泽东思想和中国特色社会主义理论体系概论';
  // if (code == '3935') return '3935_马克思主义基本原理概论';
  // if (code == '4609') return '4609_马克思主义基本原理概论';
  // if (code == '4486') return '4486_马克思主义基本原理概论';
  // if (code == '3945') return '3945_习近平新时代中国特色社会主义思想';
  // if (code == '3797') return '3797_习近平新时代中国特色社会主义思想';
  // if (code == '4065') return '4065_习近平新时代中国特色社会主义思想';
  // if (code == '4611') return '4611_习近平新时代中国特色社会主义思想';
  // if (code == '4488') return '4488_习近平新时代中国特色社会主义思想';
  // if (code == '3937') return '3937_思想道德修养与法律基础';
  // if (code == '4374') return '4374_思想道德修养与法律基础';
  // if (code == '4491') return '4491_思想道德修养与法律基础';
  // if (code == '4614') return '4614_思想道德修养与法律基础';
  // if (code == '4612') return '4612_思想道德修养与法律基础';
  // if (code == '3944') return '3944_中国近现代史纲要';
  // if (code == '4373') return '4373_中国近现代史纲要';
  // if (code == '4613') return '4613_中国近现代史纲要';
  // if (code == '4615') return '4615_中国近现代史纲要';
  // if (code == '4492') return '4492_中国近现代史纲要';
  // if (code == '4387') return '4387_中国特色社会主义理论体系概论';
  // if (code == '4628') return '4628_国家开放大学学习指南'
  // if (code == '4749') return '4749_国家开放大学学习指南'
  // // heilongjiang
  // if (code == '4498') return '4498_中国特色社会主义理论体系概论';

  // 获取课程名称  by code
  let filename = './db/subjects/indexdb.json'
  let data = fs.readFileSync(filename, "utf-8")
  let res = JSON.parse(data);

  return res[code]

}

/**
 * 
 * @param {*} page 
 * @param {*} url 
 * @param {*} delay 
 * @return {boolean}  is meet 503  
 */
async function handle503( page, url, delay=5000){
  let title = await page.title();

  let isOK = false
  console.log( 'handle503 title=', title)
  if( title.startsWith( '503 Service')){
    console.error("503 延时5秒开始, 防止出现503, 服务器响应问题" )
    await handleDelay(delay )
    console.log('handle 503 get url again');
     
    // 
    if( url ){
      await page.goto(url) 

    }else{
      // post request, 没有url， 只能重新reload
      await page.reload() 
    }
    console.log('handle 503 get url again', url);
    isOK = true
  }
  return isOK
}


async function handleDelay( delay = 500 ){

   
    return new Promise((resolve, reject) => {
      log.debug(`延时 ${delay} ms` )
      setTimeout(()=>{ resolve(true)}, delay);
    })
   
}


/**
 * 整理title，清除 特殊字符 如：'/'
 * @param {string} couseTitle 
 */
function buildCouseTitle( couseTitle ){
  // 04391-习近平新时代中国特色社会主义思想
  // 机械CAD/CAM
  // cousetitle=计算机应用基础(本)   windowtitle = 计算机应用基础（本）
  // "Photoshop图像处理".toLowerCase() => "photoshop图像处理"

  let newTitle = couseTitle.replace(/^[\d_-\s]+/,'')
  newTitle = newTitle.replace(/[\/\(\)（）]/g,'')
  newTitle = newTitle.trim().toLowerCase()

  return newTitle
}

function isXingkaoLessonTitle( lessonTitle, sectionTitle ){
  // 比较初等教育 的形考叫 课程考核
  return lessonTitle.includes('形考' ) || lessonTitle.includes('形成性' ) || sectionTitle.includes('形考' )|| sectionTitle.includes('课程考核' )
}

function getQuestionClassType( elementClass){
  let classType = null
  if( elementClass.includes( 'description') ){
    classType = 'description'
  }else if( elementClass.includes( 'truefalse') ){
    classType = 'truefalse'
  }else if( elementClass.includes( 'multichoice') ){
    classType = 'multichoice'      
  }else if( elementClass.includes( 'multianswer') ){
    classType = 'multianswer'      
  }else if( elementClass.includes( 'essay') ){
    classType = 'essay'      
  }else if( elementClass.includes( 'shortanswer') ){
    classType = 'shortanswer'      
  }else if( elementClass.includes( 'ddwtos') ){
    classType = 'ddwtos'      
  }
   
  return classType
}

async function buildXingkaoJson(file_path) {

  let quizzes = []

  var data = fs.readFileSync(file_path, 'utf-8');

  let lines = data.split(/(?:\n|\r\n|\r)/g)

  if (lines.length > 0) {
    let lastLineType = null
    let questionType = null
    let question = ''
    let quizIndex = -1

    let quiz = []
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      line = line.trim()
      if (line.length > 0) {
        if(lastLineType == '题干' ){
          question = line  // 上一行是 ‘题干’
          lastLineType = null
          continue
        }
        console.log(i, line )

        if( line.startsWith('题干')){
          lastLineType = '题干'
          continue
        }


        if( line.startsWith('形考')){
          // 形考开始 ， 形考结束
          quizIndex+=1

          let lessonId = line.replace('形考','')
          quizzes[quizIndex] = { id: parseInt(lessonId), answers:[]}
          continue
        }
        console.log(i,"正确答案", line.startsWith('正确答案'),line )

        if( line.startsWith('正确答案')){
          // 正确答案是：国务院
          
          answer = line.replace('正确答案是：', '')
          answer = answer.replace('正确答案：', '')
          if( questionType == 'truefalse'){
            answer = answer[0]
          }
          quizzes[quizIndex].answers.push( {title: question, answer, classType: questionType})
          continue
        }
        if( line.startsWith('正确的答案是')){
          answer = line.replace('正确的答案是', '')
          if( questionType == 'truefalse'){
            answer = answer[1]
          }
          quizzes[quizIndex].answers.push( {title: question, answer, classType: questionType})
          continue
        }

        if (['一', '二', '三', '四'].includes(line[0])  && line[1]=='、') {
          // 一、单项选择题（每小题5分，共50分）
          if( line.includes('单项选择题')){
            questionType = 'multichoice'
          }
          if( line.includes('判断题')){
            questionType = 'truefalse'
          }
          
        }  
      }
    }
  }
  console.log('answerList------------:',quizzes);
  return quizzes
}

// 处理copybyreview生成的形考题库文件，生成json
async function buildXingkaoJsonPlus(file_path) {

  let quizzes = []

  var data = fs.readFileSync(file_path, 'utf-8');

  let lines = data.split(/(?:\n|\r\n|\r)/g)

  if (lines.length > 0) {

    let questionType = null
    let question = ''
    let quizIndex = -1

    let quiz = []
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      line = line.trim()
      if (line.length > 0) {

        console.log(i, line )
        // [问题shortanswer] 自秦汉到晚清，中国中央集权的       政治延续2000多年。 
        if( line.startsWith('[形考')){
          quizIndex +=1
          lessionId = line.match( /\d+/)[0]
          quizzes[quizIndex] = {id: lessionId, answers: []}
        }

        if( line.startsWith('[问题')){
          let tagEndindex = line.indexOf(']')
          question = line.slice( tagEndindex +2 )
          questionType = line.match( /\w+/)[0]
          continue
        }

 
        if( line.startsWith('[答案]')){
          // [答案] 政治文明
          answer = line.replace('[答案] ', '')     
          let ismulti = answer.includes(',')
          quizzes[quizIndex].answers.push( {title: question, answer, classType: questionType, ismulti})
          continue
        }       
         
      }
    }
  }
  console.log('answerList------------:',quizzes);
  return quizzes
}


module.exports = {
  getCourseNameByCode,
  scrollToBottom,
  scrollToCenter,
  playVideo,
  handle503,
  handleDelay,
  buildCouseTitle,
  isXingkaoLessonTitle,
  getQuestionClassType,
  buildXingkaoJson,
  buildXingkaoJsonPlus
}
