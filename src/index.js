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
  console.log(" bot doing profile a couse")
    // 1934001474084
    // 19930902
  await bot.login(username, password)
  await bot.prepareForLearn()
  let userInfo = { username, couses:[] }
  for( let i=0; i<couseCodes.length; i++){
    let couseCode = couseCodes[i]
    await bot.profileCouse(couseCode)
    userInfo.couses.push( bot.couseInfo.score )
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
  await driver.quit()
}

// 学习多门课程
async function handleLearnCourses(couseCodes, username, password) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleLearnCourse")

  await bot.login(username, password)
  await bot.prepareForLearn()
  for( let i=0; i<couseCodes.length; i++){
    let couseCode = couseCodes[i]
    let log = await bot.getLog(username, couseCode)
    if( log ){
      await bot.learnCourse()
    }else{
      //throw  new Error( "用户名和密码是必须的")
      console.error(" can not find couse log by code "+ couseCode )
    }
  }

  await driver.quit()
}

async function handleLearnCourse(couseCode, username, password) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleLearnCourse")

  await bot.login(username, password)
  await bot.getLog(username, couseCode)
  await bot.prepareForLearn(couseCode)
  await bot.learnCourse()
  await driver.quit()
}

async function handleLearnByCodeModule(couseCode, moduleCode,username, password) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.debug("开始学习小节")
  // let username = '1934001474084'; // 1934001474084
  // let password = '19930902'       // 19930902
  await bot.login(username, password)
  await bot.getLog(username, couseCode)
  await bot.prepareForLearn(couseCode)
  await bot.learnModule(moduleCode)
  // await driver.quit()
}

async function saveUserJson(username, userInfo) {
  let filename =  './db/students/' + username  + '.json'
  fs.writeFile(filename, JSON.stringify(userInfo), (err) => {
    if (err) throw err;
    console.log(`文件已被保存:${filename}`);
  });
}

module.exports = {
  handleCreateDb,
  handleCreateLog,
  handleLearnCourse,
  handleLearnCourses,
  handleLearnByCodeModule
}
