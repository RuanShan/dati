const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
const Tesseract = require('tesseract.js')
const sharp = require('sharp');
async function getVerifyCode( driver ){
  let selector = ".v-code"
  //取得图片所在位置
  let codeImage = await driver.findElement(By.css(selector))

  console.log( "codeImage=",codeImage)
  let rect = await codeImage.getRect()

  console.log( "rect=",rect)
  const encoded = await driver.takeScreenshot()

  let buffer = new Buffer.from(encoded, 'base64');
  //let binaryString = buff.toString('binary');

  console.log( "binaryString")
  let codeBuffer = await sharp(buffer).extract({ width: rect.width, height: rect.height, left: rect.x, top: rect.y }).toBuffer()
  console.log( "codeBuffer")
  let code = await Tesseract.recognize(codeBuffer)
  return code
}

module.exports = {
  getVerifyCode
}
