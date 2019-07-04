const program = require('commander')

program
    .command('profile [couse]', 'generate profile of couse')
    .command('install [name]', 'install one or more packages')
    .command('search [query]', 'search with optional query')
    .version('0.0.1')
    .option('-l, --list [list]', 'list of customers in CSV file')
    .parse(process.argv)

console.log(program.list)
