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
  let codeImage = await driver.findElement(By.css(selector))
  //取得图片所在位置
  let rect = await codeImage.getRect()
  const encoded = await driver.takeScreenshot()
  let buffer = new Buffer.from(encoded, 'base64');
  //let binaryString = buff.toString('binary');
  let codeBuffer = await sharp(buffer).extract({ width: rect.width, height: rect.height, left: parseInt(rect.x), top: parseInt(rect.y) }).toBuffer()
  let code = await Tesseract.recognize(codeBuffer)
  return code
}

module.exports = {
  getVerifyCode
}
