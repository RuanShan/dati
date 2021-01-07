
const { PuppeteerDriver } = require( './src/puppeteer.js')

let url = "https://www.botiku.com/forum.php?mod=attachment&aid=ODAzM3w3OWYxMWYzNXwxNjA4OTU1MTE5fDQ5NjkzN3w5NTIy"

let aid = "ODAzM3w3OWYxMWYzNXwxNjA4OTU1MTE5fDQ5NjkzN3w5NTIy"

// 转为base64
// var strToBase64 = Buffer.from(aid).toString('base64');

//console.debug("strToBase64", strToBase64 )

// base64反解析为字符串
let base64ToStr = Buffer.from( aid , 'base64').toString();
console.debug("base64ToStr", base64ToStr )




async function main(  ){

    let driver = new PuppeteerDriver();
    // 8033|24d9a422|1608974107|496937|9522
    //"8033|79f11f35|1608955119|496937|9522"
    for( let i=0; i<5; i++){
    
        let aid = `8033|79f11f35|1608955119|${i+1}|9522`
        let aidbase64 = strToBase64 = Buffer.from(aid).toString('base64');
    
        let url = `https://www.botiku.com/forum.php?mod=attachment&aid=${aidbase64}`
        //let url = `https://www.botiku.com/?${i+1}`
        //console.debug( i, aidbase64, url )
        
        let page = await driver.get( url )
        
        let text = await page.$eval( '#messagetext p', node=> node.innerText )
        //let text = await page.$eval( '#uhd h2', node=> node.innerText )

        console.debug( `${i} `, text )
        
    }
}

main()