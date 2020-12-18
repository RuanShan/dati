const fs = require('fs');

// 添加课程数据到课程数据库
function addCouseIntoTable(couse){

    let {code, title} = couse 
    let dbfile = `./db/tables/couses.json`
    let data = fs.readFileSync(dbfile, "utf-8")
    let records = JSON.parse(data);
    let couseFullname = `${code}_${title}`
  
    records[code] = couseFullname
    fs.writeFileSync(dbfile, JSON.stringify(records))
  
  }

    /**
   * 查询学生数据在学生数据库, key=username
   * @param {*} account { username, password, subject, } 
   */
function getAccount(username){
    let account = null;
    let dbfile = `./db/tables/accounts.json`
    let exists = fs.existsSync(dbfile)
    if( exists){
        let data = fs.readFileSync(dbfile, "utf-8")
        let records = JSON.parse(data);
        account = records[username];    
    }

    return account
  
  }
  
  /**
   * 添加学生数据到学生数据库
   * @param {*} account { username, password, subject, } 
   */
function addAccount(account){

    let dbfile = `./db/tables/accounts.json`
    let exists = fs.existsSync(dbfile)
    let records = {}
    if( exists){
        let data = fs.readFileSync(dbfile, "utf-8")
        records = JSON.parse(data);
    }
    let key = account.username + '_'+ account. code
    records[key] = account
    fs.writeFileSync(dbfile, JSON.stringify(records))
  
  }

  module.exports = {
    addCouseIntoTable,
    addAccount,
    getAccount
  }