const program = require('commander')

program
    .command('profile [couse]', 'generate profile of couse')
    .command('learn [couse]', 'learn one or more couse')
    .command('lmodule [module]', 'learn module')
    .version('0.0.1')
    .option('-u, --user [user]', 'user name')
    .option('-p, --password [password]', 'user password')
    .parse(process.argv)

console.log(program.u)
