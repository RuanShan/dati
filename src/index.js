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

async function handleCreateLog(couseCode) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing profile a couse")
  let username = '1934001474084'; // 1934001474084
  let password = '19930902'       // 19930902
  await bot.login(username, password)
  //await bot.prepareForLearn(couseCode)
  await bot.profileCouse(couseCode)
}

async function handleLearnCourse(couseCode) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleLearnTextModule")
  let username = '1934001474084'; // 1934001474084
  let password = '19930902'       // 19930902
  await bot.login(username, password)
  await bot.getLog(username, couseCode)
  //await bot.prepareForLearn(couseCode)
  await bot.learnCourse()
}

async function handleLearnByCodeModule(couseCode, moduleCode) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.debug(" bot 开始学习小节")
  let username = '1934001474084'; // 1934001474084
  let password = '19930902'       // 19930902
  await bot.login(username, password)
  await bot.getLog(username, couseCode)
  console.debug("bot got log")
  //await bot.prepareForLearn(couseCode)
  await bot.learnModule(moduleCode)
}


module.exports = {
  handleCreateLog,
  handleLearnCourse,
  handleLearnByCodeModule
}
