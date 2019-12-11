const program = require('commander')
const fs = require('fs')
const csv = require('csv');

const csvParseSync = require('csv-parse/lib/sync')
const csvGenerateSync = require('csv-generate/lib/sync')

const enableVideoApi = true
const {
  handleCreateDb,
  handleAccountsCheckin,
  handleCreateLog,
  handleLearnCourse,
  handleLearnCourses,
  handleLearnByCodeModule,
  handleGetCourseSumaries,
  handleLearnModuleOfAccounts,
  handleReadScore,
  getAccountsCourseCode
} = require('./src/index')

// example: node app.js -- createlog 4255 #毛泽东思想和中国特色社会主义理论体
const isNetwork = true

program
  .version('0.0.1')
  .option('-u, --username <username>', 'user name')
  .option('-p, --password <password>', 'user password')
  .option('-a, --account <accountfile>', 'account file')
  .option('-m, --modulefile <modulefile>', 'module file')
  .option('-t, --type <type>', 'module type') // 学习的类型

program.command('createlog <course>')
  .description('handleCreateLog')
  .action(function(course) {
    console.log("handleCreateLog ", course, program.username, program.password)
    handleCreateLog(course, program.username, program.password)
  })

// 生成学习用 module id 文件
program.command('createModuleFile <course>')
  .description('create module file')
  .action(function(course) {
    // 4065_习近平新时代中国特色社会主义思想
    let type = program.type
    let filename = './db/subjects/' + course + '.json'
    let data = fs.readFileSync(filename, "utf-8")
    let res = JSON.parse(data);
    let moduleids = []
    res.forEach((r) => {
      if (type == r.type) {
        moduleids.push(r.id)
      }
    })

    // 保存文件
    let saveFilename = `./db/subjects/${course}_${type}_module.json`
    fs.writeFileSync(saveFilename, JSON.stringify(moduleids))
    //fs.writeFileSync(filename, csvGenerateSync(sumaries ))

  })

program.command('lcourse <course>')
  .description('learn all module')
  .action(async function(course) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    let courseTitle = course
    if (Number(course)) {
      courseTitle = getCourseNameByCode(course)
    }

    let accounts = await getAccountsJsonByKey(program.account)
    let username = null,
      password = null
    if (accounts.length > 0) {
      username = accounts[0].username
      password = accounts[0].password
    }
    console.log("handleLearnCourse ", course, username, password)
    handleLearnCourse(courseTitle, username, password)
  })

program.command('lmodule <course> <module>')
  .description('learn by code module')
  .action(async function(course, moduleCode) {
    console.log("handleLearnByCodeModule ", moduleCode)
    let accounts = []
    if (program.account) {
      accounts = await getAccountsCsvByKey(accountfile)
    }
    if (program.username) {
      accounts.push({
        username: program.username,
        password: program.password
      })
    }
    handleLearnByCodeModule(course, moduleCode, program.username, program.password)
  })

program.command('readscore <course>')
  .description('readscore by course code')
  .action(function(course) {
    console.log("handleReadScore ", course)
    handleReadScore(course, program.username, program.password)
  })

let cids = ['毛泽东思想和中国特色社会主义理论体系概论', '国家开放大学学习指南', '习近平新时代中国特色社会主义思想', '思想道德修养与法律基础', '中国近现代史纲要', '马克思主义基本原理概论']

// 根据网络数据，创建所有课程的数据文件
program.command('initdb [accountfile]')
  .description('create all courses db')
  .action(async function(accountfile) {
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("创建课程db", accountfile, accounts)
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let username = account.username
      let password = account.password
      await handleCreateDb(cids, username, password)
    }
  })

// 检查所有账户是否可以登录
program.command('checkin [accountfile]')
  .description('checkin all accounts, support json, csv')
  .action(async function(accountfile) {

    let accounts = await getAccounts(accountfile)

    console.log("检查账户登录...", accountfile)

    await handleAccountsCheckin(accounts)

  })

  //  根据账号，课程名称，取得科目代码
  program.command('getcode [accountfile]')
    .description('checkin all accounts, support json, csv')
    .action(async function(accountfile) {
      // [{username, password, subject}]
      let accounts = await getAccounts(accountfile)

      console.log("检查账户登录...", accountfile)

      await getAccountsCourseCode(accounts)

  })
// 根据网络数据，建立学习进度数据文件
program.command('summary [accountfile]')
  .description('summary all courses.')
  .action(async function(accountfile) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    // 取得所有账户信息，取得每个账户的课程进度
    let accounts = await getAccounts(accountfile)
    console.log("get all course summary", accountfile, accounts.length)

    let sumaries = await handleGetCourseSumaries(accounts, cids)

    // 保存文件
    let filename = './db/summary.csv'
    //fs.writeFileSync(filename, JSON.stringify(sumaries))
    fs.writeFileSync(filename, csvGenerateSync(sumaries))

  })

// 根据网络数据，学习所有课程
program.command('learn [accountfile]')
  .description('learn all courses.')
  .action(async function(accountfile) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    let options = {
      type: program.type
    }
    // 取得所有账户信息
    // 为每个账户创建课程日志
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("learn all courses", accountfile, accounts)
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let username = account.username
      let password = account.password
      await handleLearnCourses(cids, username, password, options)
    }
    // 按顺序学习每门课程
  })

// 根据网络数据，创建所有课程的数据文件并学习所有课程
program.command('all [accountfile]')
  .description('learn all courses.')
  .action(async function(accountfile) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    let options = {
      type: program.type
    }
    // 取得所有账户信息
    // 为每个账户创建课程日志
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("learn all courses", accountfile, accounts)
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let username = account.username
      let password = account.password
      await handleCreateDb(cids, username, password, options)
      await handleLearnCourses(cids, username, password, options)
    }
    // 按顺序学习每门课程
  })

// 学习给定一些账户的N节课
// course 如果是中文的话，bat文件会产生乱码
program.command('lmodules <course> [moduleCode]')
  .description('learn by code module')
  .action(async function(course, moduleCode) {
    if (!enableVideoApi) {
      console.log("功能开发中...")
      return
    }
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员13322280797！")
      return
    }
    console.log("handleLearnByCodeModule ", course, Number(course), moduleCode)
    let accounts = []
    if (program.account) {
      accounts = await getAccounts(program.account)
    }
    if (program.username) {
      accounts.push({
        username: program.username,
        password: program.password
      })
    }

    let courseTitle = course
    if (Number(course)) {
      courseTitle = getCourseNameByCode(course)
    }

    // 如果moduleCode 没有传，取得课程的所有 module
    let moduleCodes = null
    if (moduleCode) {
      let moduleCodes = [moduleCode]
    } else {
      moduleCodes = await getModuleIds(courseTitle)
    }

    await handleLearnModuleOfAccounts(accounts, courseTitle, moduleCodes)
  })

program.parse(process.argv)

if (program.username) console.log(`- ${program.username}`);
if (program.password) console.log(`- ${program.password}`);



async function getAccounts(accountfile) {
  let accounts = []
  if (/csv$/.test(accountfile)) {
    accounts = await getAccountsCsvByKey(accountfile)

  } else if (/json$/.test(accountfile)) {
    accounts = await getAccountsJsonByKey(accountfile)
  }
  return accounts
}

async function getModuleIds(course) {
  let moduleids = []

  let filename = `./db/subjects/${course}_${program.type}_module.json`

  try {
    let data = fs.readFileSync(filename, "utf-8")
    if (data != null) {

      moduleids = JSON.parse(data);

    } else {
      console.error(`无法读取数据文件 ${filename}`);
    }
  } catch (ex) {
    console.error(`无法读取数据文件 ${filename}`, ex);
  }

  return moduleids
}

async function getAccountsJsonByKey(filename) {
  // 检查当前时间 2020-01-01

  let accounts = []
  // if( isNetwork ){
  //
  // }

  if (program.username) {
    accounts.push({
      username: program.username,
      password: program.password
    })
  } else {
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
  }
  return accounts
}

async function getAccountsCsvByKey(filename) {
  let accounts = []

  if (filename) {
    try {
      let data = fs.readFileSync(filename, "utf-8")
      if (data != null) {

        accounts = csvParseSync(data, {
          columns: true,
          skip_empty_lines: true
        });

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


function getCourseNameByCode(code) {
  // liaoning
  if (code == '4372') return '4372_毛泽东思想和中国特色社会主义理论体系概论'
  if (code == '3935') return '3935_马克思主义基本原理概论'
  if (code == '3945') return '3945_习近平新时代中国特色社会主义思想'
  if (code == '4065') return '4065_习近平新时代中国特色社会主义思想'
  if (code == '3937') return '3937_思想道德修养与法律基础'
  if (code == '4374') return '4374_思想道德修养与法律基础'
  if (code == '3944') return '3944_中国近现代史纲要'
  if (code == '4373') return '4373_中国近现代史纲要'
  if (code == '4387') return '4387_中国特色社会主义理论体系概论'
  // heilongjiang
  if (code == '4498') return '4498_中国特色社会主义理论体系概论'

  return null

}
