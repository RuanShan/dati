const fs = require('fs');
const path = require('path');
const stringify = require('csv-stringify')
//const parallelLimit = require('async/parallelLimit');

const { log } = require('./logger');

const config = require( '../config')

const {
  BotPlus,  
} = require('./botplus.js');
const {
  buildXingkaoJsonPlus
} = require('./utilplus')

const {
  getAccount,  
  addAccount
} = require('./db.js');

const Bot =  BotPlus
const { PuppeteerDriver } = require( './puppeteer.js')

 

const GenCouseError = { }; // code => false
// 检查登录账户是否可用
async function handleAccountsCheckin(  accounts=[] ) {

  let driver = new PuppeteerDriver();
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

// 取得学科的代码，确认学科代码
// accounts [{username, password, subject}]
async function getAccountsCourseCode(  accounts=[] ) {

  let driver = new PuppeteerDriver();
  let bot = new Bot(driver)
  console.log(" bot doing accounts checkin", accounts.length)
    // 1934001474084
    // 19930902
  let checkins = []
  for(let i=0; i<accounts.length; i++){
    let account = accounts[i]
    let { username, password, subject } = account
    if( username && username.length>0 && password && password.length>0){
      let success = await bot.login(username, password)
      let courseCode = Object.assign({ username, password, checkin: success, subject }, account)
      if( success){
        let course = await bot.prepareForLearn(subject)
        if( course){
          courseCode.code =  course.code
        }else{
            console.error(`不能找到学生${username}的课程[${subject}]`)
        }

      }
      checkins.push( courseCode)
      await bot.logout()
      console.log("登录账户: ", i, account.username, success)
    }
    let filename =  './db/students/couses.json'
    fs.writeFileSync(filename, JSON.stringify(checkins));
    let csvfile =  './db/students/couses.csv'
    const csv = stringify(checkins, {  header: true,
        columns: ['username','password','subject','checkin', 'code']
      }, function(err, records){
      fs.writeFileSync(csvfile, records)
      console.log( "after save to file:", csvfile, checkins.length )
    })

  }

   await driver.quit()

}

// 为课程代码创建数据库
// accounts [{username, password, subject}]
async function handleCreateDb(accounts=[] ) {
  let driver = new PuppeteerDriver();
  let bot = new Bot(driver)
  
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let username = account.username
    let password = account.password
    let subject = account.subject
    if( !username || !password || !subject){
      continue
    }


      // 1934001474084
      // 19930902
    let success = await bot.login(username, password)

    if( success ){
        //04391-习近平新时代中国特色社会主义思想
        let courseTitle = subject
        await bot.prepareForLearn(courseTitle)
        // 如果这门课的数据文件存在
         
          await bot.profileCouse(courseTitle)
          // .catch(async(e)=>{
          //   log.error( `无法创建课程数据文件 ${courseTitle}`, e)
          // })
         
        await bot.logout()

    }else{
      log.error('登录失败账号', username, password)
    }
  }
  await driver.quit()
}

async function handleCreateLog(courseCode, username, password ) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }
  courseCode = courseCode.trim();

  let driver = new PuppeteerDriver();
  let bot = new Bot(driver)
  console.log(" bot doing profile a course")
    // 1934001474084
    // 19930902
  await bot.login(username, password)
  await bot.prepareForLearn(courseCode)
  await bot.profileCouse(courseCode)
  await bot.createAnswerList(courseCode)
  await driver.quit()
  //return bot
}

 
async function handleReadScore(courseCode, username, password){
  let driver = new PuppeteerDriver();
  let bot = new Bot(driver)
  console.log(" bot doing handleReadScore")
  await bot.login(username, password)
  await bot.prepareForLearn(courseCode)
  await bot.readScore(courseCode)
  await driver.quit()

}

// 取得课程进度
async function handleGetCourseSumaries(accounts ){
  let driver = new PuppeteerDriver();
  let bot = new Bot(driver)
  console.log(" bot doing handleSumaryCourses")

  let sumaries= []
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let username = account.username
    let password = account.password
    let subject = account.subject

    await bot.login(username, password)
    let summary = await bot.getSummary([subject])

    sumaries = sumaries.concat( summary)
    await bot.logout()

  }



  console.log(" bot doing handleSumaryCourses", sumaries.length)

  await driver.quit()
  return sumaries
}

// 学习多门课程
async function handleLearnCourses(accounts=[] , options = {}) {

  let driver = new PuppeteerDriver();
  let bot = new Bot(driver )
  console.log(" 机器人初始化成功，开始学习课程")
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let username = account.username
    let password = account.password
    let subject = account.subject

    if( !username || !password || !subject){
      continue
    }
    // 1934001474084 19930902
    let success = await bot.login(username, password)

    if( success ){
        //04391-习近平新时代中国特色社会主义思想
        let courseTitle = subject
        await bot.prepareForLearn(courseTitle)

        let log = await bot.getLog( courseTitle)
        if( log ){
          console.error("开始学习课程："+ courseTitle )
          await bot.learnCouse(options)
        }else{
          //throw  new Error( "用户名和密码是必须的")
          console.error("没有找到课程数据文件："+ courseTitle )
        }
        await bot.closeOtherTabs( )

    }
  }
  await driver.quit()
}

async function handleLearnCourse(courseCode, username, password) {
  if( !username || !password){
    throw  new Error( "用户名和密码是必须的")
  }

  let driver = new PuppeteerDriver();
  let bot = new Bot(driver, {username})
  console.log(" 机器人初始化成功，开始学习课程")
  let log = await bot.getLog( courseCode)
  if( log ){
    await bot.login(username, password)
    await bot.prepareForLearn(courseCode)
    await bot.learnCouse()
  }else{
    console.error("没有找到课程数据文件："+ courseCode )
  }
  await driver.quit()
}

// 学习某一个人的一节课
async function handleLearnModuleByCode(courseCode, moduleCode,username, password, options) {
  let driver = new PuppeteerDriver();
  let bot = new Bot(driver, {username})
  console.debug("开始学习小节")
  // let username = '1934001474084'; // 1934001474084
  // let password = '19930902'       // 19930902
  let log = await bot.getLog( courseCode)
  if( log ){
    await bot.login(username, password)
    let course = await bot.prepareForLearn(courseCode)
    let success = await bot.learnModule(moduleCode, options)


  }else{
    console.error("没有找到课程数据文件："+ courseCode )
  }
  await driver.quit()
}

// 学习账户中所有人的N节课
async function handleLearnModuleOfAccounts(accounts, courseCode, moduleCodes, options ) {
  let driver = new PuppeteerDriver();

  let bot = new Bot(driver )
  console.debug("开始学习小节, 人数=", accounts.length)
  // let username = '1934001474084'; // 1934001474084
  // let password = '19930902'       // 19930902

  // '04931-习近平新时代中国特色社会主义思想', 这里不再删除数字，课程前可能有代码
  let filename = `./db/subjects/${courseCode}.json`
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
        let success = false
        console.debug("bot.learnModule ", username);
        await bot.login(username, password)
        let course = await bot.prepareForLearn(courseCode)
        if( course ){
          success = await bot.learnModule(moduleCode,options)
          if( success ){
            // console.error("延时1秒开始, 防止出现503, 服务器响应问题" )
            // await  driver.wait( function(){
            //   return new Promise((resolve, reject) => {
            //     setTimeout(resolve, 500);
            //   })
            // });
            // console.error("延时1秒结束" )
          }
        }else{
          console.error("没有找到课程", username, courseCode)
        }
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

// 学习账户中所有人的N节课
// 将账号循环放在外面，module放在里面，提高效率，但不处理视频模块
async function handleLearnModuleOfAccounts2(accounts, courseCode, moduleCodes, options ) {
  let driver = new PuppeteerDriver();

  let bot = new Bot(driver )
  console.debug("开始学习小节, 人数=", accounts.length)
  // let username = '1934001474084'; // 1934001474084
  // let password = '19930902'       // 19930902

  // '04931-习近平新时代中国特色社会主义思想', 这里不再删除数字，课程前可能有代码
  let filename = `./db/subjects/${courseCode}.json`
  let log = await bot.getLog( courseCode, { filename })
  let results = []
  if( log ){

      for (let i = 0; i < accounts.length; i++) {
        let account = accounts[i]
        let username = account.username
        let password = account.password
        let success = false
        console.debug("bot.learnModule ", username);
        await bot.login(username, password)
        let course = await bot.prepareForLearn(courseCode)
        if( course ){
          for (let j = 0; j < moduleCodes.length; j++) {
            let moduleCode = moduleCodes[j]
            success = await bot.learnModule(moduleCode,options)
            console.info( `${username} ${moduleCode} 是否学完 ${success}`)
            results.push( { username, moduleCode, success})
          }
        }else{
          console.error("没有找到课程", username, courseCode)
        }
        await bot.closeOtherTabs( )

        await bot.logout()
      }

  }else{
    console.error("没有找到课程数据文件："+ courseCode )
  }
  await driver.quit()
  let saveFilename =  `./db/students/module.json`
  fs.writeFileSync(saveFilename, JSON.stringify(results));
}

/**
 * 生成题库文件
 * @param {[]} accounts { username, password, code }
 */
async function handleGenQuiz(accounts, options={}){
  let driver = new PuppeteerDriver();

  let bot = new Bot(driver )
  console.debug("开始学习小节, 人数=", accounts.length)

  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let { username, password, subject} = account
    

    if( !username || !password || !subject){
      continue
    }
    await bot.login( username, password )
    await bot.copyQuiz( subject, options )
    await bot.logout()

  }
  await driver.quit()
}

/**
 * 提交空白题库，以便下一步生成题库文件
 * @param {[]} accounts { username, password, subject }
 */
async function handleSubmitPlainQuiz(accounts, filter, max){
  let driver = new PuppeteerDriver();

  let bot = new Bot(driver )
  console.debug("开始学习小节, 人数=", accounts.length)

  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let { username, password, subject} = account
    

    if( !username || !password || !subject){
      continue
    }
    await bot.login( username, password )
    await bot.submitPlainQuiz( subject, filter,max )
    await bot.logout()

  }
  await driver.quit()
}

/**
 * 学习账号文件中的课程，只需提供账号，密码，课程名称
 * @param {Array} accounts { username, password, subject: 课程名称 }
 * @param {Object} options { type: video }
 */

async function simpleLearn(accounts, options={}) {

  log.info( "配置", config)
  let driver = new PuppeteerDriver();
  let { type, submitquiz } = options
  let bot = new Bot(driver )
  log.info("开始学习课程 人数=", accounts.length)

  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let { username, password, subject} = account
    
    let accountstr = `用户名=${username},密码=${password}, 课程=${subject}`;
    log.debug(  `${i+1} ${accountstr}` )
    if( !username || !password || !subject){
      continue
    }
    // 课程信息 { code, title, url, host }
    let couseBaseInfo = null;
    // 课程数据文件信息
    let subjectFileInfo = { success: false};
    
    // 1. 检查登录是否成功
    let islogin = await bot.login( username, password )
    let isFileExists = false
    // 2. 检查课程是否存在，查询课程代码
    if( islogin){
      couseBaseInfo = await bot.prepareForLearn(subject)

      log.debug( "课程基本信息", couseBaseInfo)
      // 课程代码在前，内部使用，作为课程文件命名

      
      // 3. 根据课程代码，查询课程数据文件

      if ( couseBaseInfo ){ 
        // {success, path }
        let subjectfile = bot.getSubjectDataFilePath( couseBaseInfo )

        let couseFullname = `${couseBaseInfo.title}_${couseBaseInfo.code}`
        
        isFileExists =  fs.existsSync(subjectfile )
        let isSubjectLoaded= false
        if( !isFileExists ){
          let success = await produceSubjectFile( bot, couseBaseInfo )

          if( success){
            // 如果存在需要加载课程数据
            isFileExists = true
          
          }else{
            log.error( `${accountstr} 课程数据文件生成异常 ${subjectfile}`)
          }
        }
        if( isFileExists ){
          // 设置当前课程，加载课程数据文件
          isSubjectLoaded = await bot.getLog( couseBaseInfo.title, { filename: subjectfile } )
        }else{
          log.error( `${accountstr} 没有找到课程数据文件 ${subjectfile}`)
        }


        if( isSubjectLoaded ){
          // 4. 查询用户账号数据文件，查询当前用户当前课程进度
          // 
          let key = username+'_'+couseBaseInfo.code 
          let accountInfo = getAccount( key )

          
          if( accountInfo == null ){
            accountInfo = { username, password, subject, islogin: islogin, isexist:isFileExists, code: couseBaseInfo.code, videodone: false, quizdone: false, pagedone: false, xingkaodone: false, finaldone: false, forumdone: false }
          }
          log.info( `课程进度`, accountInfo)
          // 如果当前课程可以学习

          // 5.1 学习单元测试，并保存进度
          if( (   type=='page') && !accountInfo.pagedone ){
            await bot.learnCouse({ type: 'page' })
            accountInfo.pagedone = true
          }
          // 5.2 学习视频，并保存进度
          if( (   type=='video') && !accountInfo.videodone ){
            await bot.learnCouse({ type: 'video' })
            // await bot.watchAllVideoByApi()
            accountInfo.videodone = true
          }
          // 5.3 学习单元测试，并保存进度
          if( (  type=='quiz') && !accountInfo.quizdone ){
            await bot.learnCouse({ type: 'quiz', submitquiz: submitquiz })
            if( submitquiz == 'yes'){
              accountInfo.quizdone = true
            }
          }
          // 5.4 形式考试
          if( (  type=='xingkao') && !accountInfo.xingkaodone ){
            await bot.learnCouse({ type: 'xingkao', submitquiz: submitquiz })
            if( submitquiz == 'yes'){
              accountInfo.xingkaodone = true
            }
          }
          // 5.5 论坛发帖
          if( (  type=='xingkaoforum') && !accountInfo.forumdone ){
            await bot.learnCouse({ type: 'xingkaoforum', submitquiz: submitquiz })
            if( submitquiz == 'yes'){
              accountInfo.forumdone = true
            }
          }
          // 5.6 形考论述
          if( (  type=='xingkaofinal') && !accountInfo.finaldone ){
            await bot.learnCouse({ type: 'xingkaofinal', submitquiz: submitquiz })
            if( submitquiz == 'yes'){
              accountInfo.finaldone = true
            }
          }
          // 7. 学习终结性考试，并保存进度

          if( (  type=='final') && !accountInfo.finaldone ){
            await bot.learnFinal( { submitquiz:submitquiz } )       
            accountInfo.finaldone = true
          }
          // 8. 保存账号数据
          addAccount( accountInfo )      
        }

      }else{
        log.error(  `${accountstr} 没有找到课程`)
      }


    }else{
      log.error(  `${accountstr} 登录失败`)
    }
    await bot.logout()
  }
  await driver.quit()
}


 

async function getAllCouses( accounts){
  let driver = new PuppeteerDriver();
   
  let bot = new Bot(driver )

  let students = []
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let { username, password} = account
    log.debug(  `${i+1} ${username} ${password}` )

    let islogin = await bot.login( username, password )

    let stu = {username, password, islogin, major: '', couses: ''}
    if( islogin ){
      let mainPage = bot.mainPage
      let allCouses = await bot.getAllCouses( mainPage)
      let majorInfo = await bot.getMajorInfo( )
  
      log.debug(allCouses, majorInfo )
      stu = {username, password, islogin, major: majorInfo.title, couses: allCouses.join(',') }
    }

    students.push( stu )
    await bot.logout()
  }

  await driver.quit()
  return students
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


async function handleLearnFinal(accounts, courseTitle, options ) {
  let driver = new PuppeteerDriver();
  let bot = new Bot(driver)

  let results = []

    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i]
      let username = account.username
      let password = account.password
      //let subject = account.subject
      let success = false
      let filename = `./db/subjects/${courseTitle}.json`
      let log = await bot.getLog( courseTitle, { filename })
      if( log ){
        console.debug("bot.learnModule ", username);
        await bot.login(username, password)
        let course = await bot.prepareForLearn(courseTitle)
        if( course ){
          console.log(" bot doing profile a course")
          // 1934001474084
          // 19930902
          await bot.learnFinal(options)
        }else{
          console.error("没有找到课程", username, courseTitle)
        }
        await bot.closeOtherTabs( )

        await bot.logout()
      }else{
        console.error("没有找到课程数据文件："+ courseCode )
      }
    }


  await driver.quit()
}



// 生成账号对应的课程数据文件
async function handleGenSubject( accounts ){
  // 相同的课程只处理一个


  // 根据账号生成 数据文件

  let gensubjectlog = './db/log/gensubject.log'
  let logs=[]
  let gencouseerror = {} // { code: error }
  for (let i = 0; i < accounts.length; i++) {

    let account = accounts[i]
    let log = Object.assign( {}, account )
    let username = account.username
    let password = account.password
    let couseName = account.subject // 课程名称
    let driver = new PuppeteerDriver();
    let bot = new Bot(driver)

    couseName = couseName.trim()
    let isexist = true
    let islogin = await bot.login(username, password)
    let couse = null
    let gencouse = true
    if( islogin){
      couse = await bot.prepareForLearn(couseName)
    }

    if( couse ){
      // 课程代码在前，内部使用，作为课程文件命名
      let couseFullname = `${couse.code}_${couse.title}`
      let subjectfile = `./db/subjects/${couseFullname}.json`
      isexist =  fs.existsSync(subjectfile )
      // 如果文件存在则跳过
      iserror = gencouseerror[couse.code] === false
      if( !isexist && !iserror){
        await bot.profileCouse(couseName).catch((e)=>{
          gencouse = false
          gencouseerror[couse.code] = false
        })

        if( gencouse ){
          //await bot.createAnswerList(couseName)
    
          // 1. ./db/students/2021201400283_习近平新时代中国特色社会主义思想.json
          let studentfile = await bot.getCouseJsonPath( bot.couseTitle )
          // 重命名
      
          let moduleType = 'video'
          console.log( studentfile, subjectfile )
          fs.copyFileSync( studentfile, subjectfile )
          // 2.1 创建视频数据文件
          createModuleFile( couseFullname, moduleType )
          // 2.2 创建测单元验数据文件
          moduleType = 'quiz'
          createModuleFile( couseFullname, moduleType )
          // 2.3 创建文章数据文件
          moduleType = 'page'
          createModuleFile( couseFullname, moduleType )
      
          // 3. 创建可执行文件, 文件的最后4个字符为课程号，
          let couseFullname2 = `${couse.title}_${couse.code}`
          createBinFile(couseFullname2)
      
          // 4. 添加课程数据到indexdb.json
          addCouseIntoDb( couse.code, couse.title )
        }

      }
    
    }

    // 记录日志
    log.subjectexists = isexist
    log.loginsuccess = islogin
    log.cousefound = !!couse
    log.gencouse = gencouse
    logs.push( log )
    fs.writeFileSync(gensubjectlog, JSON.stringify(logs))
    await driver.quit()


  }
}

async function handleGenAccounts( accounts ){
  console.log( "handleGenAccounts= accounts", accounts.length )
  let codeAccountsMap = { }
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i]
    let username = account.username
    let password = account.password
    let course = account.subject // 课程名称
    let code = account.code
    if( code ){
      codeAccountsMap[code] = codeAccountsMap[code]||[]
      codeAccountsMap[code].push( account )
    }
  }

  Object.keys( codeAccountsMap ).forEach( ( code )=>{
    let filename = `./db/accounts/${code}.csv`

    let accountByCode = codeAccountsMap[code]
    // 保存文件
    const csv = stringify(accountByCode, {  header: true,
        columns: ['username','password','subject', 'code']
      }, function(err, records){
      fs.writeFileSync(filename, records)
      console.log( "after save to file:", filename, accountByCode.length )
    })
  })
}


/**
 * 根据课程信息生成课程数据文件
 * @param {*} couseBaseInfo 
 * @returns {} { success, msg, error }  - 是否成功
 */
async function produceSubjectFile(bot, couseBaseInfo){

  
        // 课程代码在前，内部使用，作为课程文件命名
 
        let success = true
         // 如果文件存在则跳过
        iserror = GenCouseError[couseBaseInfo.code] === false
        let subjectfile = bot.getSubjectDataFilePath( couseBaseInfo )
        if(  !iserror){
          let couseName = couseBaseInfo.title
          let couseDetail = await bot.profileCouse(couseName).catch((e)=>{
            log.error( "课程数据文件生成异常", e)
            success = false
            GenCouseError[couseBaseInfo.code] = false
          })

          if( success ){
            //await bot.createAnswerList(couseName)
      
            for( let i=0;i< couseDetail.status.length; i++){
              couseDetail.status[i].isFinish='未完成'
            }
            fs.writeFileSync(subjectfile, JSON.stringify(couseDetail.status) );
        
            let moduleType = 'video'
            
            // // 2.1 创建视频数据文件
            // createModuleFile( couseFullname, moduleType )
            // // 2.2 创建测单元验数据文件
            // moduleType = 'quiz'
            // createModuleFile( couseFullname, moduleType )
            // // 2.3 创建文章数据文件
            // moduleType = 'page'
            // createModuleFile( couseFullname, moduleType )
        
            // 3. 创建可执行文件, 文件的最后4个字符为课程号，
            //let couseFullname2 = `${couseBaseInfo.title}_${couseBaseInfo.code}`
            //createBinFile(couseFullname2)
        
            // 4. 添加课程数据到indexdb.json
            addCouseIntoDb( couseBaseInfo.code, couseBaseInfo.title )
          }
  
        }

      return success
}
  
 

// couseFullname: 4065_习近平新时代中国特色社会主义思想
// moduleType: video, text
function createModuleFile( couseFullname, moduleType ){
  // 4065_习近平新时代中国特色社会主义思想
  let filename = './db/subjects/' + couseFullname + '.json'
  let data = fs.readFileSync(filename, "utf-8")
  let res = JSON.parse(data);
  let moduleids = []
  res.forEach((r) => {
    if (moduleType == r.type) {
      moduleids.push(r.id)
    }
  })

  // 保存文件
  let saveFilename = `./db/subjects/${couseFullname}_${moduleType}_module.json`
  fs.writeFileSync(saveFilename, JSON.stringify(moduleids))
}

// couseFullname 4065_习近平新时代中国特色社会主义思想
function createBinFile(couseFullname){
  let templateDir = `./db/templates`
  let destDir =  `./bin/${couseFullname}`
  if( !fs.existsSync( destDir )){
    fs.mkdirSync( destDir )
  }
  let files = fs.readdirSync(templateDir)
  files.forEach((filename)=>{
    fs.copyFileSync( templateDir + '/'+filename, destDir +'/'+filename )
  })

}




// 添加课程数据到课程数据库
function addCouseIntoDb(code, title){

  let dbfile = `./db/subjects/indexdb.json`
  let data = fs.readFileSync(dbfile, "utf-8")
  let records = JSON.parse(data);
  let couseFullname = `${code}_${title}`

  records[code] = couseFullname
  fs.writeFileSync(dbfile, JSON.stringify(records))

}


//读取固定格式形考题库文本文件，生成 xingkao.json
async function handleGenQuizByTxt(  file){
  let basename = path.basename(file, '.txt')
  let json = await buildXingkaoJsonPlus( file )
  let jsonfile = `./${basename}xingkao.json`

  fs.writeFileSync(jsonfile, JSON.stringify( { answers: json } ))

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
  handleLearnModuleOfAccounts2,
  handleReadScore,
  getAccountsCourseCode,
  handleLearnFinal,
  handleGenSubject,
  handleGenAccounts,
  handleGenQuiz,
  handleSubmitPlainQuiz,
  handleGenQuizByTxt,
  simpleLearn,
  getAllCouses,
  
}
