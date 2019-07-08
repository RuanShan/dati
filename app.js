const program = require('commander')
const {
  handleCreateLog,
  handleLearnAllModule,
  handleLearnByCodeModule
} = require('./src/index')

program
  .command('learn <couse>', 'learn one or more couse')
  .version('0.0.1')
  .option('-u, --user [user]', 'user name')
  .option('-p, --password [password]', 'user password')

program.command('createlog <couse>')
  .description('handleCreateLog')
  .action(function(couse) {
    console.log("handleCreateLog ", couse)
    handleCreateLog(couse)
  })
program.command('lallmodule <module>')
  .description('learn all module')
  .action(function(moduleCode) {
    console.log("handleLearnAllModule ", moduleCode)
    handleLearnAllModule(moduleCode)
  })

program.command('lonemodule <module>')
  .description('learn by code module')
  .action(function(moduleCode) {
    console.log("handleLearnByCodeModule ", moduleCode)
    handleLearnByCodeModule(moduleCode)
  })

program.parse(process.argv)
