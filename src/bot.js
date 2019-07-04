const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const { scrollToBottom, playVideo }  = require('./util')
const { getVerifyCode }  = require('./ocr')

function learnText( driver ){

}

function learnVideo( driver ){

}


async function handleVerifyCode( driver ){

  let code  = await getVerifyCode( driver )
  let text = code.text.replace('\n', '')
  console.log( "code = ", code )
  await driver.findElement(By.id('checkCode')).sendKeys('text');
  await driver.findElement(By.id('btnLogin')).click()
}


module.exports = {
  handleVerifyCode,
  learnVideo,
  learnText
}
