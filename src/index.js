// import util from './src/util.js'
const fs = require('fs');

const {
  scrollToBottom,
  playVideo
} = require('./util.js');

const {
  Bot,
  handleVerifyCode
} = require('./bot.js');

const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');

// 检查登录账户是否可用
async function handleAccountsCheckin(  accounts=[] ) {

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing accounts checkin", accounts.length)
    // 1934001474084
    // 19930902
  let checkins = []
  for(let i=0; i<accounts.length; i++){
    let account = accounts[i]
    let { username, password } = account
    if( username && username.length>0 && password && password.length>0){
      let success = await bot.login(username, password)
      checkins.push( {username, password, checkin: success })
      await bot.logout()
      console.log("登录账户: ", i, account.username, success)
    }

  }

   await driver.quit()
   let filename =  './db/students/checkin.json'
   fs.writeFileSync(filename, JSON.stringify(checkins));
}

// 为课程代码创建数据库
async function handleCreateDb(courseCodes, username, password ) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log("机器人初始化成功")
    // 1934001474084
    // 19930902
  await bot.login(username, password)
  let userInfo = { username, courses:[] }
  for( let i=0; i<courseCodes.length; i++){
    let courseCode = courseCodes[i]
    await bot.prepareForLearn(courseCode)
    // 如果这门课的数据文件存在
    let exists =  isCouseJsonExists( username, courseCode)
    if( !exists ){
      await bot.profileCouse(courseCode)
      userInfo.courses.push( bot.courseInfo.score )
    }
    await bot.closeOtherTabs( )

  }
  await saveUserJson( username, userInfo )
  await driver.quit()
}

async function handleCreateLog(courseCode, username, password ) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing profile a course")
    // 1934001474084
    // 19930902
  await bot.login(username, password)
  await bot.prepareForLearn(courseCode)
  await bot.profileCouse(courseCode)
  await bot.createAnswerList(courseCode)
  // await driver.quit()
}

async function handleReadScore(courseCode, username, password){
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleReadScore")
  await bot.login(username, password)
  await bot.prepareForLearn(courseCode)
  await bot.readScore(courseCode)
  await driver.quit()

}

// 取得课程进度
async function handleGetCourseSumaries(accounts, courseCodes ){
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleSumaryCourses")

  let allsumaries
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let user = account.username
    let password = account.password

    await bot.login(username, password)
    let summary = await bot.getSummary(courseCodes)

    sumaries.concat( summary)
    await bot.logout()

  }



  console.log(" bot doing handleSumaryCourses", sumaries.length)

  await driver.quit()
  return sumaries
}

// 学习多门课程
async function handleLearnCourses(courseCodes, username, password, options = {}) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver )
  console.log(" 机器人初始化成功，开始学习课程")

  await bot.login(username, password)
  await bot.prepareForLearn()
  for( let i=0; i<courseCodes.length; i++){
    let courseCode = courseCodes[i]
    let log = await bot.getLog( courseCode)
    if( log ){
      console.error("开始学习课程："+ courseCode )
      await bot.learnCourse(options)
    }else{
      //throw  new Error( "用户名和密码是必须的")
      console.error("没有找到课程数据文件："+ courseCode )
    }
  }

  await driver.quit()
}

async function handleLearnCourse(courseCode, username, password) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver, {username})
  console.log(" 机器人初始化成功，开始学习课程")
  let log = await bot.getLog( courseCode)
  if( log ){
    await bot.login(username, password)
    await bot.prepareForLearn(courseCode)
    await bot.learnCourse()
  }else{
    console.error("没有找到课程数据文件："+ courseCode )
  }
  await driver.quit()
}

// 学习某一个人的一节课
async function handleLearnModuleByCode(courseCode, moduleCode,username, password) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver, {username})
  console.debug("开始学习小节")
  // let username = '1934001474084'; // 1934001474084
  // let password = '19930902'       // 19930902
  let log = await bot.getLog( courseCode)
  if( log ){
    await bot.login(username, password)
    await bot.prepareForLearn(courseCode)
    let success = await bot.learnModule(moduleCode)


  }else{
    console.error("没有找到课程数据文件："+ courseCode )
  }
  await driver.quit()
}

// 学习账户中所有人的N节课
async function handleLearnModuleOfAccounts(accounts, courseCode, moduleCodes ) {
  let driver = await new Builder().forBrowser('chrome').build();

  let bot = new Bot(driver )
  console.debug("开始学习小节, 人数=", accounts.length)
  // let username = '1934001474084'; // 1934001474084
  // let password = '19930902'       // 19930902

  // '04931-习近平新时代中国特色社会主义思想'

  let filename = `./db/subjects/${courseCode.replace(/[\d\-]*/,'')}.json`
  let log = await bot.getLog( courseCode, { filename })
  let results = []
  if( log ){
    // 将module放在外面，虽然效率低，但是看视频请求api时，不会导致时间冲突
    for (let j = 0; j < moduleCodes.length; j++) {
      let moduleCode = moduleCodes[j]
      for (let i = 0; i < accounts.length; i++) {
        let account = accounts[i]
        let username = account.username
        let password = account.password
        console.debug("bot.learnModule ", username);
        await bot.login(username, password)
        await bot.prepareForLearn(courseCode)
        let success = await bot.learnModule(moduleCode)
        console.debug("bot.learnModule1");
        await bot.closeOtherTabs( )

        results.push( { username, moduleCode, success})
        await bot.logout()
      }
    }

  }else{
    console.error("没有找到课程数据文件："+ courseCode )
  }
  await driver.quit()
  let saveFilename =  `./db/students/module.json`
  fs.writeFileSync(saveFilename, JSON.stringify(results));
}

async function saveUserJson(username, userInfo) {
  let filename =  './db/students/' + username  + '.json'
  fs.writeFileSync(filename, JSON.stringify(userInfo));
}

function isCouseJsonExists(username, courseTitle) {
  let dir = './db/students'

  let filename = dir + '/' + username + '_' + courseTitle + '.json'
  //console.log("检查数据文件是否存在：", filename)

  return fs.existsSync( filename )
}


module.exports = {
  handleAccountsCheckin,
  handleCreateDb,
  handleCreateLog,
  handleLearnCourse,
  handleLearnCourses,
  handleGetCourseSumaries,
  handleLearnModuleByCode,
  handleLearnModuleOfAccounts,
  handleReadScore
}
