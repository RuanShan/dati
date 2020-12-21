const program = require('commander')
const fs = require('fs')
const path = require('path')
const csv = require('csv');
const stringify = require('csv-stringify')

const csvParseSync = require('csv-parse/lib/sync')
 
const { log } = require('./src/logger');
const { buildCouseTitle } = require('./src/utilplus')
const config = require( './config')
const { BotPlus } = require( './src/botplus')
const { PuppeteerDriver } = require( './src/puppeteer.js')
const enableVideoApi = true
const {
  handleCreateDb,
  handleAccountsCheckin,
  handleCreateLog,
   handleLearnCourses,
  handleLearnModuleByCode,
  handleGetCourseSumaries,
 
  handleReadScore,
  getAccountsCourseCode,
  handleLearnFinal,
  handleGenSubject,
  handleGenAccounts,
  handleGenQuiz,
  simpleLearn
} = require('./src/indexplus')



program
  .version('2.0.1')
  .option('-c, --config <configfile>', 'config file')
  .option('-u, --username <username>', 'user name')
  .option('-p, --password <password>', 'user password')
  .option('-a, --account <accountfile>', 'account file')
  .option('-b, --base <basepath>', 'base path')
  .option('-m, --modulefile <modulefile>', 'module file')
  .option('-s, --submitquiz <yes|no>', 'submit quiz  yes or no')
  .option('-f, --submitfinal <yes|no>', 'submit final  yes or no')
  .option('-t, --type <type>', 'module type') // 学习的类型

program.command('createlog <course>')
  .description('handleCreateLog')
  .action(function(course) {
    console.log("handleCreateLog ", course, program.username, program.password)
    handleCreateLog(course, program.username, program.password)
  })

 

program.command('simplelearn')
  .description('simple learn')
  .action(async function( ) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员！")
      return
    }
    let type = ( program.type || null)
    let submitquiz = ( program.submitquiz || null)
    
    let options = { type, submitquiz }
    let accounts = await getAccounts()  
       
    await simpleLearn(accounts, options)
  })

 

program.command('lmodule <course> <module>')
  .description('learn by code module')
  .action(async function(course, moduleCode) {
    console.log("handleLearnModuleByCode ", moduleCode)
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
    let options = {
      type: program.type,
      submitquiz: program.submitquiz,
    }
    handleLearnModuleByCode(course, moduleCode, program.username, program.password, options)
  })

program.command('readscore <course>')
  .description('readscore by course code')
  .action(function(course) {
    console.log("handleReadScore ", course)
    handleReadScore(course, program.username, program.password)
  })


// 根据网络数据，创建所有课程的数据文件
program.command('initdb [accountfile]')
  .description('create all courses db')
  .action(async function(accountfile) {
    let accounts = await getAccounts(accountfile)
    console.log("创建课程db", accountfile, accounts.length)

    await handleCreateDb(accounts)

  })

// 检查所有账户是否可以登录
// node app.js checkin account.json
program.command('checkin [accountfile]')
  .description('checkin all accounts, support json, csv')
  .action(async function(accountfile) {

    let accounts = await getAccounts(accountfile)

    console.log("检查账户登录...", accountfile)

    await handleAccountsCheckin(accounts)

  })

//  根据账号，课程名称，取得科目代码
// node app.js getcode account.json
program.command('getcode [accountfile]')
  .description('checkin all accounts, support json, csv')
  .action(async function(accountfile) {
    // [{username, password, subject}]
    let accounts = await getAccounts(accountfile)

    console.log("检查账户登录...", accountfile, accounts.length)

    await getAccountsCourseCode(accounts)

  })
// 根据网络数据，建立学习进度数据文件
program.command('summary')
  .description('summary all courses.')
  .action(async function() {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员！")
      return
    }
    // 取得所有账户信息，取得每个账户的课程进度
    let accounts = await getAccounts()
    console.log("get all course summary", accounts.length)
    if( accounts.length> 0 ){

      let sumaries = await handleGetCourseSumaries(accounts )

      // 保存文件
      let basepath = program.base;
      if( basepath ){
        let filename = `${basepath}/summary-${(new Date).getTime()}.csv`

        console.log( "before save to file:", filename  )
        //fs.writeFileSync(filename, JSON.stringify(sumaries))
        const csv = stringify(sumaries, {}, function(err, records){
          fs.writeFileSync(filename, records)
          console.log( "after save to file:", filename )
        })
      }

    }


  })

// 根据网络数据，学习所有课程
program.command('learn')
  .description('learn all courses.')
  .action(async function( ) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员！")
      return
    }
    let options = {
      type: program.type,
      submitquiz: program.submitquiz,
    }
    // 取得所有账户信息
    // 为每个账户创建课程日志
    let accounts = await getAccounts( )
    console.log("accounts learn all courses",  accounts.length)

    await handleLearnCourses(accounts, options)

    // 按顺序学习每门课程
  })
 
program.command('lfinal')
  .description('learn final exam ')
  .action(async function(course,accountfile) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员！")
      return
    }
    let accounts = []
    if (program.account || program.username) {
      accounts = await getAccounts(program.account)
    }

    let courseTitle = course
    if (Number(course)) {
      courseTitle = getCourseNameByCode(course)
    }

    let options = {
      submitfinal: program.submitfinal,
    }
    await  handleLearnFinal(accounts, courseTitle, options )

  })

// 生成课程数据文件
program.command('gensubject')
  .description('生成课程数据文件')
  .action(async function( ) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员！")
      return
    }
    let accounts = []
    if (program.account || program.username) {
      accounts = await getAccounts(program.account)
    }

    // { username: '', password: '', subject: ''}
    await  handleGenSubject(accounts  )
})

// 生成课程数据文件，把一个账户文件按照科目分别生成对应的账号文件，存入db/accounts/xxxx.csv
// genaccount --account=account.csv 
program.command('genaccount')
  .description('生成账号数据文件')
  .action(async function( ) {
    if (!isAvaible()) {
      console.log("软件出现问题，请联系开发人员！")
      return
    }
    let accounts = []
    if (program.account || program.username) {
      accounts = await getAccounts(program.account)
    }

    // { username: '', password: '', subject: '', code: ''}
    await  handleGenAccounts(accounts  )
})

program.command( 'genquiz [byreview]')  
.description('生成测验数据文件')
.action(async function( byreview) {
   
  let accounts = await getAccounts( )

  console.log( "byreview=", byreview)
  byreview = 'byreview'
  handleGenQuiz(accounts, byreview)

})

program.command( 'parsecsv <filename>')  
.description('解析账户数据文件')
.action(async function( filename) {
  await parseSubjcts(filename)
})

//
/////////////////////////////////////////////////////////////////////////////////////////////////
async function loadConfig(){
  // 
  config.appPath = __dirname;
  config.subjectPath = path.join(config.appPath, '/db/subjects' )
}
loadConfig();
program.parse(process.argv);

 
async function getAccounts(accountfile=null) {

  if ( program.account ){
    accountfile = program.account
  }
  log.info( '账号文件路径', accountfile)   

  let accounts = []
  if (/csv$/.test(accountfile)) {
    accounts = await getAccountsCsvByKey(accountfile)

  } else if (/json$/.test(accountfile)) {
    accounts = await getAccountsJsonByKey(accountfile)
  } else if( program.username && program.password){
    accounts.push({ username: program.username, password: program.password  })
  }

  // trim
  accounts.forEach((acc)=>{
    if( acc.subject ){
      // 清除空格，字母小写便于比较
      acc.subject = buildCouseTitle( acc.subject )
    }
  })
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
  console.log('==============getAccountsJsonByKey==============');
  console.log('filename---:', filename);

  let accounts = []

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

// 解析csv文件，字段 realname,username,gender,idnum,birth,major,subjects

async function parseSubjcts(filename ){
  
  if (filename) {
    
      let data = fs.readFileSync(filename, "utf-8")
      if (data != null) {

        let accounts = csvParseSync(data, {
          columns: true,
          skip_empty_lines: true
        });

        let newAccounts = []
        let uniqSubjectAccounts = []
        let uniqSubjects = []
        
console.log( `accounts = ${accounts.length}`)
        for( let i=0; i<accounts.length; i++){
          let account = accounts[i]

          let {realname, username, password, subjects} = account

          let subjectArray = subjects.split( '、')

          for( let j = 0; j<subjectArray.length; j++){            
            let subject = subjectArray[j]
            console.log( `subjectArray${j}= `,subjectArray, subject)
            if( subject.length == 0){
              continue;
            }
            let account = {realname, username, password, subject}

            if( !uniqSubjects.includes(subject)){
              uniqSubjects.push( subject )
              uniqSubjectAccounts.push( account )
            }
            newAccounts.push( account )
          }
        }

        let newfilename = 'subjects2.csv'
        const csv = stringify(newAccounts, { header: true, columns:['realname', 'username', 'password', 'subject']}, function(err, records){
          fs.writeFileSync(newfilename, records)
          console.log( "after save to file:", newfilename )
        })

        let newfilename2 = 'subjects1.csv'
        const csv2 = stringify(uniqSubjectAccounts, {header: true, columns:['realname', 'username', 'password', 'subject']}, function(err, records){
          fs.writeFileSync(newfilename2, records)
          console.log( "after save to file:", newfilename2 )
        })

      } else {
        console.error(`无法读取账户文件 ${filename}`);
      }
    
  }


}
// 软件是否可用
function isAvaible() {
  let availabe = new Date('2020-12-30')
  let now = new Date()

  if (now < availabe) {
    return true
  } else {
    return false
  }
}

