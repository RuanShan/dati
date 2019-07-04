var Tesseract = require('tesseract.js')

async function getVerifyCode( driver ){
  let selector = "v-code"
  //取得图片所在位置
  let codeImage = await driver.findElement(By.css(selector))
  let rect = await image.getRect()

  const encoded = await driver.takeScreenshot()

  let buff = new Buffer(encoded, 'base64');
  let binaryString = buff.toString('binary');

  let codeBuffer = await sharp(binaryString).extract({ width: rect.width, height: rect.height, left: rect.x, top: rect.y }).toBuffer()
  let code = await Tesseract.recognize(codeBuffer)

}
