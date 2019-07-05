const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const { scrollToBottom, playVideo }  = require('./util')
const { getVerifyCode }  = require('./ocr')

class Bot{

  constructor( driver){
    this.driver = driver
  }

  autologin(){
     //

  }

  async learnCouse( couseCode){
    //// 分析课程信息文件
    ////
  }


  async learnModule( code ){

  /// text, video, quiz,
  /// do work

  }


  async learnText( driver ){

  }

  async learnVideo( driver ){

  }


  async handleVerifyCode( driver ){

    let code  = await getVerifyCode( driver )
    let text = /[\w]+/.exec(code.text).toString()
    console.log( "text=", text )
    await driver.findElement(By.id('checkCode')).sendKeys( text );
    await driver.findElement(By.id('btnLogin')).click()

  }

}
function autologin(){
   //

}

function learnCouse( couseCode){
  //// 分析课程信息文件
  ////
}


function learnModule( code ){

/// text, video, quiz,
/// do work

}


function learnText( driver ){

}

function learnVideo( driver ){

}


async function handleVerifyCode( driver ){

  let code  = await getVerifyCode( driver )
  let text = /[\w]+/.exec(code.text).toString()
  console.log( "text=", text )
  await driver.findElement(By.id('checkCode')).sendKeys( text );
  await driver.findElement(By.id('btnLogin')).click()

}


module.exports = {
  Bot,
  handleVerifyCode,
  learnVideo,
  learnText
}
