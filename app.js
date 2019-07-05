const program = require('commander')
const { handleCommandProfile,handleCommandModule } = require('./src/index')

program
    .command('learn <couse>', 'learn one or more couse')
    .version('0.0.1')
    .option('-u, --user [user]', 'user name')
    .option('-p, --password [password]', 'user password')

program.command('profile <couse>')
  .description( 'generate profile of couse')
  .action(function( couse ){
    console.log( "handleCommandProfile ", couse )
    handleCommandProfile( couse )
  })
program.command('lmodule <module>')
  .description( 'learn module')
  .action(function( moduleCode ){
    console.log( "handleCommandModule ", moduleCode )
    handleCommandModule( moduleCode )
  })

program.parse(process.argv)
