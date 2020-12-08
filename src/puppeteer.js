const puppeteer = require('puppeteer');
const iPhone = puppeteer.devices['iPhone 6'];

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
  ]
};

const PAGE_PUPPETEER_OPTS = {
  networkIdle2Timeout: 5000,
  waitUntil: 'networkidle2',
  timeout: 3000000
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

  async login( username, password){

  }
  // return Page
  async get( url ){
    if (!this.browser) {
      await this.initBrowser();
    }
    // 如果没有打开的再创建
    const pages = await this.browser.pages()
    let newPage = null;
    if( pages.length == 0 ){
      newPage = await this.browser.newPage();
    }else{
      newPage = pages[0]
    }
    console.log( '准备打开：', url )
    
    await Promise.all( [ newPage.goto(url, PAGE_PUPPETEER_OPTS), newPage.waitForNavigation()]).catch(async e=>{
      // 试试重新加载, 不能使用reload， 这样页面并不是新页面
      console.error( '无法打开：', url )
      await newPage.goto(url, PAGE_PUPPETEER_OPTS)
      
    });
    return newPage
  }

  async pages( ){
    const pages = await this.browser.pages();
    return pages
  }

  async quit( ){
    this.closeBrowser();
  }

  async getPageContent(url, suburls=[]) {
    if (!this.browser) {
      await this.initBrowser();
    }
    
    try {
      let hasJson = false;
      let subcontent = [];
      const page = await this.browser.newPage();
      await page.emulate(iPhone); // emulate的配置有Viewport，UserAgent等等。之前的setUserAgent等方法是它的语法糖。

      await page.setRequestInterception(true);
      page.on('request', (req) => {
          if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
              req.abort();
          } else {
            
            req.continue();
          }
      });
      page.on('response', async res => {
        //get and parse the url for later filtering
        let requrl = res.url()
        let i = suburls.findIndex((regx)=>regx.test( requrl))
        if( i>=0 ){
          

          let json = await res.json()
          subcontent[i] = json.data
        }
        
      })

      await page.goto(url, PAGE_PUPPETEER_OPTS);
      const pageContent = await page.content();

      //await page.screenshot({type: 'png', path: `example.png`})
      page.close();

      return { pageContent, subcontent };
    } catch (err) {
      throw err;
    }
  }

}

module.exports = { PuppeteerDriver }