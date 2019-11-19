const program = require('commander')
const {
  handleCreateLog,
  handleLearnCourse,
  handleLearnByCodeModule
} = require('./src/index')

// example: node app.js -- createlog 4255 #毛泽东思想和中国特色社会主义理论体

program
  .command('learn <couse>', 'learn one or more couse')
  .version('0.0.1')
  .option('-u, --user [user]', 'user name')
  .option('-p, --password [password]', 'user password')
  .action(function( couse ){

  })

program.command('createlog <couse>')
  .description('handleCreateLog')
  .action(function(couse) {
    console.log("handleCreateLog ", couse)
    handleCreateLog(couse)
  })
program.command('lcouse <couse>')
  .description('learn all module')
  .action(function(couse) {
    console.log("handleLearnCourse ", couse)
    handleLearnCourse(couse)
  })

program.command('lmodule <couse> <module>')
  .description('learn by code module')
  .action(function(couse, moduleCode) {
    console.log("handleLearnByCodeModule ", moduleCode)
    handleLearnByCodeModule(couse, moduleCode)
  })

program.parse(process.argv)
