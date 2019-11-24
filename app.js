const program = require('commander')
const {
  handleCreateLog,
  handleLearnCourse,
  handleLearnByCodeModule
} = require('./src/index')

// example: node app.js -- createlog 4255 #毛泽东思想和中国特色社会主义理论体

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

program.parse(process.argv)

if (program.user) console.log(`- ${program.user}`);
if (program.password) console.log(`- ${program.password}`);
