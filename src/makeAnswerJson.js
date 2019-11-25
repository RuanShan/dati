const readline = require('readline');
//Readline是Node.js里实现标准输入输出的封装好的模块，通过这个模块我们可以以逐行的方式读取数据流。使用require(“readline”)可以引用模块。
const fs = require('fs');
const r1 = readline.createInterface({
  input: fs.createReadStream("../demo/demo/xi.txt")
});

var i = 1; //txt中的行数

let answerList = []
let keyWords1 = ['一','二','三','四'];
let keyWords2 = ['1','2','3','4','5','6','7','8','9',]

let level_1 = 0;
let level_2 = 0;
r1.on('line', function(line) { //事件监听
  i += 1;
  if (line.length > 0) {
    if(keyWords1.indexOf(line[0])!=-1){
      answerList[level_1-1].push([])
      level_2++;
    }else if (keyWords2.indexOf(line[0])!=-1) {
      let left_key = line.indexOf('（')+1
      let right_key = line.indexOf('）')
      let question = line.substring(0,left_key)+line.substring(right_key)
      let answer = line.substring(left_key,right_key)
      let param = {
        question:question,
        answer:answer
      }
      answerList[level_1-1][level_2-1].push(param)
    }else {
      level_2 = 0
      answerList.push([]);
      level_1++;
    }
  }

})


r1.on('close', ()=>{
	console.log('answerList----:',answerList);
  console.log(answerList[0][1]);
});
