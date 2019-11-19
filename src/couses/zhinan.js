
// 国家开放大学学习指南
const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');
async function parseCouseZhiNan(driver) {

  let progressPath = "//div[@class='progress-bar']/span"
  let sectionl1Path = "//ul[@class='flexsections flexsections-level-1']/li"
  let sectionl2Path = "//ul[@class='flexsections flexsections-level-2']/li"
  let sectionl2Css = "li.activity"
  let sectionl2LinkCss = "a"
  await driver.wait(until.elementLocated(By.className('progress-bar')), 10000);

  let url = await driver.getCurrentUrl()
  console.log('url----------------:', url);
  let classId = url.substring(url.indexOf('id=') + 3);
  console.log('classId----:', classId);


  let levelOne = await driver.findElements(By.xpath(sectionl1Path))
  let progressContainer = await driver.findElement(By.xpath(progressPath))
  let progress = await progressContainer.getText()

  let status = []
  let classinfo = {
    url: url,
    classId: classId,
    progress: progress
  }
  for (let i = 0; i < levelOne.length; i++) {
    let a = levelOne[i]
    let text = await a.getText()
    let id = await a.getAttribute('id')
    console.log(`levelOne.text ${i} ${id} ${text}`)
    let levelTwo = await a.findElements(By.css(sectionl2Css))
    if (levelTwo.length == 0) {
      console.log(`levelOne.text ${i} ${id} ${text} 没有内容。`)
      continue
    }
    let b = levelTwo[0]

    let isDisplayed = await b.isDisplayed()
    if (!isDisplayed) {
      // 显示下级内容
      a.click()
    }

    for (let j = 0; j < levelTwo.length; j++) {
      let b = levelTwo[j]
      let text = await b.getText()
      let id = await b.getAttribute('id')
      let imgs = await b.findElements(By.tagName('img'))
      let alt = "未完成"
      let href = ''
      if (imgs.length >= 2) {
        // 由于前面的内容没有学习，可能没有链接元素，后面没有圆圈图片
        alt = await imgs[1].getAttribute('alt')
        let link = await b.findElement(By.css(sectionl2LinkCss))
        href = await link.getAttribute('href')
      }
      let course = {
        title: text,
        isFinish: alt.substring(0, 3),
        url: href,
        id: id.substring(7)
      }
      status.push(course)
      if (alt.startsWith("未完成")) {
        console.log(`levelTwo.text ${j} ${id} ${text} ${href} ${alt}`)
      }
    }
  }
  let couseJson = {
    score: classinfo,
    status: status
  }

  return couseJson
}

module.exports={
  parseCouseZhiNan
}
