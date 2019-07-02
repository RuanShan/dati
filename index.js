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
    // let a = await driver.findElement(By.id('LearningCourseDiv'));
    // console.log('a---:', a);
    // let b = await a.findElement(By.tagName('ul'));
    // console.log('b---:', b);
    // let c = await b.findElements(By.tagName('li'));
    // console.log('c---:', c,'-----',c.length);
    // let d = await c[0].findElements(By.tagName('p'));
    // console.log('d[1]---:',await d[1].getTagName());
    // d[1].click();
    // for(var i=0;i<c.length;i++){
    //   let d = await c[i].findElements(By.tagName('p'));
    //   let e = d[1].click();
    //   console.log('d---:', d,'-----',d.length);
    // }

    // await driver.findElement(By.id('checkCode')).sendKeys('');
    // await driver.findElement(By.id('btnLogin')).click();
    console.log('Login Success!!!');

    handleCouseLinks( driver )

  } finally {
    // await driver.quit();
  }
})();



async function getCousesLinks( driver ){
  // div id = LearningCourseDiv
  // text = 进入课程
  let div = await driver.findElement(By.id('LearningCourseDiv'));
  let links = await div.findElements(By.linkText('进入课程'));
  // let lis = await div.findElements(By.tagName('li'));
  // lis.forEach(async (a)=>{
  //   let text = await a.getText()
  //   console.log( " couse.link ", text )
  // })
  // let hrefs = links.map(async (a)=>{
  //   return await a.getAttribute( 'href')
  // })

  return links

}

async function handleCouseLinks( driver ){
  let links = await getCousesLinks( driver );

   await links[5].click()
   console.log('title--:',await driver.getTitle());
   await handleCouse( driver )
   let mainHandle = await driver.getWindowHandle()
   let handles = await  driver.getAllWindowHandles()
   console.log("getAllWindowHandles", handles )

   // let a = await driver.findElements(By.xpath("//li[contains(@class,‘section’)]"));
   let a = await driver.findElements(By.xpath("//*[@class='course-content']"));
   console.log('a-----:',a.length);

  // links.forEach(async (link)=>{
  //   console.log( "click link0")
  //   await link.click()
  //   console.log( "click link1")
  // })
  // let currentUrl = await driver.getCurrentUrl()
  // let url = links[0]
  // driver.navigate.to( url )
  // await driver.wait(until.urlIs(url), 10000);
  //

  //
  //
  // handles.forEach(async (handle)=>{
  //   console.log("mainHandle", mainHandle, "handle = ", handle )
  //   if( mainHandle != handle ){
  //     await driver.switchTo().window(handle)
  //     await handleCouse(driver)
  //   }
  // })
  // driver.switchTo().window(mainHandle)

}

async function handleCouse( driver ){
  console.log( " tab.title0 " )
  let title = await driver.getTitle()
  console.log( " tab.title1 ", title )

}
