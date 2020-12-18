const puppeteer = require('puppeteer');
const iPhone = puppeteer.devices['iPhone 6'];
const { log } = require('./logger');

const LAUNCH_PUPPETEER_OPTS = {
  executablePath: './chromium/chrome.exe',
  headless: false,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    //'–no-first-run',
		//'–no-zygote',
    //'–single-process',
    "--proxy-server='direct://'", 
    '--proxy-bypass-list=*'
  ],
  defaultViewport:{ width: 1024, height:768 }
};

const PAGE_PUPPETEER_OPTS = {
  networkIdle2Timeout: 10000,
  waitUntil: 'networkidle2',
  timeout: 5000000
};

class PuppeteerDriver {
  constructor() {
    this.browser = null;
  }
  async initBrowser() {
    
    this.browser = await puppeteer.launch(LAUNCH_PUPPETEER_OPTS);

    // # 是否启用js
    // await page.setJavaScriptEnabled(enabled=True)

    // await page.evaluate(
    //     '''() =>{ Object.defineProperties(navigator,{ webdriver:{ get: () => false } }) }''')  # 以下为插入中间js，将淘宝会为了检测浏览器而调用的js修改其结果。
    // await page.evaluate('''() =>{ window.navigator.chrome = { runtime: {},  }; }''')
    // await page.evaluate(
    //     '''() =>{ Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] }); }''')
    // await page.evaluate(
    //     '''() =>{ Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5,6], }); }''')
  }
  async closeBrowser() {
    if( this.browser ){
      await this.browser.close();
    }
  }
 
  // return Page
  async get( url ){
    if (!this.browser) {
      await this.initBrowser();
    }
    // 如果没有打开的再创建
    let newPage = await this.browser.newPage();
    
    log.debug( '准备打开', url )
    
    await Promise.all( [ newPage.waitForNavigation(), newPage.goto(url, PAGE_PUPPETEER_OPTS)]).catch(async e=>{
      // 试试重新加载, 不能使用reload， 这样页面并不是新页面
      log.error( '无法打开', url )
      await newPage.goto(url, PAGE_PUPPETEER_OPTS)
      
    });

    // 关闭其他pages
    const pages = await this.browser.pages()
    for( let i=0; i<pages.length; i++){
      let page = pages[i]
      if( page != newPage ){
        await page.close()
      }
    }

    return newPage
  }

  async pages( ){
    const pages = await this.browser.pages();
    return pages
  }

  async quit( ){
    this.closeBrowser();
  }

   

}

module.exports = { PuppeteerDriver }