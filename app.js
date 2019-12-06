const program = require('commander')
const fs = require('fs')

const {
  handleCreateDb,
  handleCreateLog,
  handleLearnCourse,
  handleLearnCourses,
  handleLearnByCodeModule,
  handleGetCourseSumaries,
  handleReadScore
} = require('./src/index')

// example: node app.js -- createlog 4255 #毛泽东思想和中国特色社会主义理论体
const isNetwork = true

program
  .version('0.0.1')
  .option('-u, --user <user>', 'user name')
  .option('-p, --password <password>', 'user password')
  .option('-t, --type <type>', 'module type') // 学习的类型

program.command('createlog <couse>')
  .description('handleCreateLog')
  .action(function(couse) {
    console.log("handleCreateLog ", couse, program.user, program.password)
    handleCreateLog(couse, program.user, program.password)
  })
program.command('lcouse <couse>')
  .description('learn all module')
  .action(function(couse) {
    console.log("handleLearnCourse ", couse, program.user, program.password)
    handleLearnCourse(couse, program.user, program.password)
  })

program.command('lmodule <couse> <module>')
  .description('learn by code module')
  .action(function(couse, moduleCode) {
    console.log("handleLearnByCodeModule ", moduleCode)
    handleLearnByCodeModule(couse, moduleCode, program.user, program.password)
  })

program.command('readscore <couse>')
  .description('readscore by couse code')
  .action(function(couse) {
    console.log("handleReadScore ", couse)
    handleReadScore(couse, program.user, program.password)
  })

let cids = ['毛泽东思想和中国特色社会主义理论体系概论', '国家开放大学学习指南', '习近平新时代中国特色社会主义思想', '思想道德修养与法律基础', '中国近现代史纲要']

// 根据网络数据，创建所有课程的数据文件
program.command('initdb [accountfile]')
  .description('create all couses db')
  .action(async function(accountfile) {
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("创建课程db", accountfile, accounts)
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let user = account.user
      let password = account.password
      await handleCreateDb(cids, user, password)
    }
})

// 根据网络数据，建立学习进度数据文件
program.command('summary [accountfile]')
  .description('summary all couses.')
  .action(async function(accountfile) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    // 取得所有账户信息，取得每个账户的课程进度
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("learn all couses", accountfile, accounts)
    let accountSumaries = { }
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let user = account.user
      let password = account.password
      let sumaries = await handleGetCourseSumaries(cids, user, password)
      accountSumaries[user] = sumaries
    }
    // 保存文件
    let filename = './db/summaries.json'
    fs.writeFileSync(filename, JSON.stringify(accountSumaries))
})

// 根据网络数据，学习所有课程
program.command('learn [accountfile]')
  .description('learn all couses.')
  .action(async function(accountfile) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    let options = { type: program.type }
    // 取得所有账户信息
    // 为每个账户创建课程日志
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("learn all couses", accountfile, accounts)
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let user = account.user
      let password = account.password
      await handleLearnCourses(cids, user, password, options)
    }
    // 按顺序学习每门课程
})

// 根据网络数据，创建所有课程的数据文件并学习所有课程
program.command('all [accountfile]')
  .description('learn all couses.')
  .action(async function(accountfile) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    let options = { type: program.type }
    // 取得所有账户信息
    // 为每个账户创建课程日志
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("learn all couses", accountfile, accounts)
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let user = account.user
      let password = account.password
      await handleCreateDb(cids, user, password, options)
      await handleLearnCourses(cids, user, password, options)
    }
    // 按顺序学习每门课程
  })
program.parse(process.argv)

if (program.user) console.log(`- ${program.user}`);
if (program.password) console.log(`- ${program.password}`);


async function getAccountsJsonByKey(filename) {
  // 检查当前时间 2020-01-01

  let accounts = []
  // if( isNetwork ){
  //
  // }
  filename = filename || 'account.json'
  if (filename) {
    try {
      let data = fs.readFileSync(filename, "utf-8")
      if (data != null) {

        let res = JSON.parse(data);
        accounts = res.accounts || [];
      } else {
        console.error(`无法读取账户文件 ${filename}`);
      }
    } catch (ex) {
      console.error(`无法读取账户文件 ${filename}`, ex);
    }
  }
  return accounts
}

// 软件是否可用
function isAvaible() {
  let availabe = new Date('2020-01-01')
  let now = new Date()

  if (now < availabe) {
    return true
  } else {
    return false
  }
}
