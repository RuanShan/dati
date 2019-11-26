const program = require('commander')
const fs = require('fs')

const {
  handleCreateDb,
  handleCreateLog,
  handleLearnCourse,
  handleLearnCourses,
  handleLearnByCodeModule
} = require('./src/index')

// example: node app.js -- createlog 4255 #毛泽东思想和中国特色社会主义理论体
const isNetwork = true

program
  .version('0.0.1')
  .option('-u, --user <user>', 'user name')
  .option('-p, --password <password>', 'user password')

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


// 根据网络数据，学习所有课程
program.command('all [accountfile]')
  .description('learn all couses.')
  .action(async function(accountfile) {
    if( !isAvaible()){
      console.log( "软件出现问题，请联系开发人员13322280797！")
      return
    }
    // 取得所有账户信息
    // 为每个账户创建课程日志
    let accounts = await getAccountsJsonByKey(accountfile)
    console.log("learn all couses", accountfile, accounts )
    for( let i = 0; i<accounts.length; i++){
      let account = accounts[i]
      let user = account.user
      let password = account.password
      let cids = [3833,4125,4255,4257]
      await handleCreateDb( cids, user, password)
      await handleLearnCourses( cids, user, password)
    }


    // 按顺序学习每门课程
  })
program.parse(process.argv)

if (program.user) console.log(`- ${program.user}`);
if (program.password) console.log(`- ${program.password}`);


async function getAccountsJsonByKey( filename ){
  // 检查当前时间 2020-01-01

  let accounts = []
  // if( isNetwork ){
  //
  // }
  filename = filename || 'account.json'
  if( filename ){
    try{
      let data = fs.readFileSync(filename, "utf-8")
      if (data != null) {

        let res = JSON.parse(data);
        accounts= res.accounts || [];
      } else {
        console.error(`无法读取账户文件 ${filename}`);
      }
    }catch(ex){
      console.error(`无法读取账户文件 ${filename}`, ex );
    }
  }
  return accounts
}

// 软件是否可用
function isAvaible(){
  let availabe = new Date('2020-01-01')
  let now = new Date()

  if( now< availabe){
    return true
  }else{
    return false
  }
}
