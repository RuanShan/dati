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

// 为课程代码创建数据库
async function handleCreateDb(couseCodes, username, password ) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log("机器人初始化成功")
    // 1934001474084
    // 19930902
  await bot.login(username, password)
  await bot.prepareForLearn()
  let userInfo = { username, couses:[] }
  for( let i=0; i<couseCodes.length; i++){
    let couseCode = couseCodes[i]
    // 如果这门课的数据文件存在
    let exists =  isCouseJsonExists( username, couseCode)
    if( !exists ){
      await bot.profileCouse(couseCode)
      userInfo.couses.push( bot.couseInfo.score )
    }
  }
  await saveUserJson( username, userInfo )
  await driver.quit()
}

async function handleCreateLog(couseCode, username, password ) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing profile a couse")
    // 1934001474084
    // 19930902
  await bot.login(username, password)
  await bot.prepareForLearn(couseCode)
  await bot.profileCouse(couseCode)
  await bot.createAnswerList(couseCode)
  await driver.quit()
}

async function handleReadScore(couseCode, username, password){
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleReadScore")
  await bot.login(username, password)
  await bot.prepareForLearn(couseCode)
  await bot.readScore(couseCode)
  await driver.quit()

}

// 取得课程进度
async function handleGetCourseSumaries(couseCodes, username, password){
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleSumaryCourses")
  await bot.login(username, password)

  let sumaries = await bot.getSummary(couseCodes)

  console.log(" bot doing handleSumaryCourses", sumaries)

  await driver.quit()
  return sumaries
}

// 学习多门课程
async function handleLearnCourses(couseCodes, username, password, options = {}) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver )
  console.log(" 机器人初始化成功，开始学习课程")

  await bot.login(username, password)
  await bot.prepareForLearn()
  for( let i=0; i<couseCodes.length; i++){
    let couseCode = couseCodes[i]
    let log = await bot.getLog(username, couseCode)
    if( log ){
      console.error("开始学习课程："+ couseCode )
      await bot.learnCourse(options)
    }else{
      //throw  new Error( "用户名和密码是必须的")
      console.error("没有找到课程数据文件："+ couseCode )
    }
  }

  await driver.quit()
}

async function handleLearnCourse(couseCode, username, password) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver, {username})
  console.log(" 机器人初始化成功，开始学习课程")
  let log = await bot.getLog(username, couseCode)
  if( log ){
    await bot.login(username, password)
    await bot.prepareForLearn(couseCode)
    await bot.learnCourse()
  }else{
    console.error("没有找到课程数据文件："+ couseCode )
  }
  await driver.quit()
}

async function handleLearnByCodeModule(couseCode, moduleCode,username, password) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver, {username})
  console.debug("开始学习小节")
  // let username = '1934001474084'; // 1934001474084
  // let password = '19930902'       // 19930902
  let log = await bot.getLog(username, couseCode)
  if( log ){
    await bot.login(username, password)
    await bot.prepareForLearn(couseCode)
    await bot.learnModule(moduleCode)
  }else{
    console.error("没有找到课程数据文件："+ couseCode )
  }
  await driver.quit()
}

async function saveUserJson(username, userInfo) {
  let filename =  './db/students/' + username  + '.json'
  fs.writeFileSync(filename, JSON.stringify(userInfo));
}

function isCouseJsonExists(username, couseTitle) {
  let dir = './db/students'

  let filename = dir + '/' + username + '_' + couseTitle + '.json'
  //console.log("检查数据文件是否存在：", filename)

  return fs.existsSync( filename )
}


module.exports = {
  handleCreateDb,
  handleCreateLog,
  handleLearnCourse,
  handleLearnCourses,
  handleGetCourseSumaries,
  handleLearnByCodeModule,
  handleReadScore
}
