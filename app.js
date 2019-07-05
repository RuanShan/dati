const program = require('commander')
const { handleCommandProfile } = require('./src/index')

program
    .command('learn <couse>', 'learn one or more couse')
    .command('lmodule <module>', 'learn module')
    .version('0.0.1')
    .option('-u, --user [user]', 'user name')
    .option('-p, --password [password]', 'user password')

program.command('profile <couse>')
  .description( 'generate profile of couse')
  .action(function( couse ){
    console.log( "handleCommandProfile ", couse )
    handleCommandProfile( couse )
  })

program.parse(process.argv)
