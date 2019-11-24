// import util from './src/util.js'
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
  driver.close()
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
  driver.close()
}

async function handleLearnByCodeModule(couseCode, moduleCode) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.debug("开始学习小节")
  let username = '1934001474084'; // 1934001474084
  let password = '19930902'       // 19930902
  await bot.login(username, password)
  await bot.getLog(username, couseCode)
  await bot.prepareForLearn(couseCode)
  await bot.learnModule(moduleCode)
  driver.close()
}


module.exports = {
  handleCreateLog,
  handleLearnCourse,
  handleLearnByCodeModule
}
