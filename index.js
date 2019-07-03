const {
  Builder,
  By,
  Key,
  until
} = require('selenium-webdriver');

(async function example() {
  let driver = await new Builder().forBrowser('chrome').build();
  //driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS);

  try {
    await driver.get('http://sso.ouchn.cn/Passport/Login?ru=http%3a%2f%2fshome.ouchn.cn%2f&to=-2&aid=6&ip=100.125.68.16&lou=http%3a%2f%2fshome.ouchn.cn%2f6%2fMCSAuthenticateLogOff.axd&sf=4968909290f6c894');
    await driver.findElement(By.id('username')).sendKeys('1821001453342');
    await driver.findElement(By.id('password')).sendKeys('19830526');
    await driver.wait(until.titleIs('学生空间'), 1000000);
    await driver.findElement(By.className('jbox-close')).click();
    console.log('Login Success!!!');

    handleCouseLinks(driver)

  } finally {
    //await driver.quit();
  }
})();



async function getCousesLinks(driver) {
  // div id = LearningCourseDiv
  // text = 进入课程
  let div = await driver.findElement(By.id('LearningCourseDiv'));
  let links = await div.findElements(By.linkText('进入课程'));
  // links.forEach(async (a)=>{
  //   await a.click()
  //   // generate a.href
  // })

  links[5].click()
  return links

}

async function handleCouseLinks(driver) {
  let mainHandle = await driver.getWindowHandle()
  let links = await getCousesLinks(driver);
  let promises = links.map(async (a) => {
    return await a.getAttribute('href')
  })

  let hrefs = await Promise.all(promises)
  console.log('all tab opened, hrefs', hrefs);
  let handles = await driver.getAllWindowHandles()
  console.log("getAllWindowHandles", handles)

  for (let i = 0; i < handles.length; i++) {
    let handle = handles[i]
    console.log("mainHandle", mainHandle, "handle = ", handle)
    if (mainHandle != handle) {
      let locator = driver.switchTo()
      await locator.window(handle)
      await handleCouse(driver)
    }
  }

}

async function handleCouse(driver) {
  // 毛泽东思想和中国特色社会主义理论体系概论, 统计学原理   思想道德修养与法律基础  管理学基础
  //  经济数学基础  计算机应用基础

  console.log(" tab.title0 ")
  let title = await driver.getTitle()
  console.log(" tab.title1 ", title)
  if (title.search('毛泽东思想和中国特色社会主义理论体系概论') >= 0) {
    await handleCouseMaoGai(driver)
  }
}

async function handleCouseMaoGai(driver) {
  let progressPath = "//div[@class='progress-bar']/span"
  let sectionl1Path = "//ul[@class='flexsections flexsections-level-1']/li"
  let sectionl2Path = "//ul[@class='flexsections flexsections-level-2']/li"
  let sectionl2Css = "li.activity"
  let sectionl2LinkCss = "a"

  let url = await driver.getCurrentUrl()

  let levelOne = await driver.findElements(By.xpath(sectionl1Path))
  let progressContainer = await driver.findElement(By.xpath(progressPath))
  let progress = await progressContainer.getText()
  console.log(`毛泽东思想和中国特色社会主义理论体系概论  ${progress}`)

  let incompleted = []

  for (let i = 0; i < levelOne.length; i++) {
    let a = levelOne[i]
    let text = await a.getText()
    let id = await a.getAttribute('id')
    console.log(`levelOne.text ${i} ${id} ${text}`)

    // li.activity url modtype_url| activity page modtype_page
    let levelTwo = await a.findElements(By.css(sectionl2Css))
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
      let link = await b.findElement(By.css(sectionl2LinkCss))
      let href = await link.getAttribute('href')
      let img = await b.findElements(By.tagName('img'))
      let alt = await img[1].getAttribute('alt')
      if (alt.startsWith("未完成")) {
        console.log(`levelTwo.text ${j} ${id} ${text} ${href} ${alt}`)
        incompleted.push({
          href
        })
      }
    }

  }

  console.log("incompleted= ", incompleted)
  for (let k = 0; k < incompleted.length; k++) {
    let work = incompleted[k]
    let href = work.href
    await driver.get(href);
    let title = await driver.getTitle()
    console.log("title1= ", title);

  }
  await driver.get(url)
  title = await driver.getTitle()
  console.log(" title2= ", title);

  console.log(" handleCouseMaoGai ")

}
