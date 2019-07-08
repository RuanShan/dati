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
  let filename = './log_3649.json'
  console.log(" bot doing profile a couse")
  await bot.login('1821001452683', '19771229')
  await bot.handleCouseLinks('1821001452683')
}

async function handleLearnAllModule(moduleCode) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleLearnTextModule")
  await bot.login('1821001452683', '19771229')
  await bot.getLog('1821001452683')
  await bot.prepareForLearn()
  await bot.learnCourse()
}

async function handleLearnByCodeModule(moduleCode) {
  let driver = await new Builder().forBrowser('chrome').build();
  let bot = new Bot(driver)
  console.log(" bot doing handleLearnVideoModule")
  await bot.login('1821001452683', '19771229')
  await bot.getLog('1821001452683')
  await bot.prepareForLearn()
  await bot.learnModule(moduleCode)
}


module.exports = {
  handleCreateLog,
  handleLearnAllModule,
  handleLearnByCodeModule
}
