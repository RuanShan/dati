## 可以学习的课程
行政管理(专科)： 办公室管理,公共行政学,社会调查研究与方法

计算机网络技术（网页设计方向专科）: Java语言程序设计,Dreamweaver网页设计,形势与政策,计算机应用基础

计算机科学与技术: 操作系统,计算机专业英语阅读, 计算机导论＃,数据结构（本）,计算机组成原理
法律事务: 宪法学,人文英语1
药学: 人体解剖生理学（本）,病理生理学,社会心理适应 
护理(专科)：人体解剖学与组织胚胎学
财务管理(本科)：商务英语4,纳税筹划,市场营销学
会计(专科)：成本会计,市场营销学
行政管理(本科):
小学教育(本科):比较初等教育
工商管理(专升本):金融学
## 生成EXE文件
pkg .


## 常用命令行

node app.js  --username=1921101201025 --password=19941130 createlog 国家开放大学学习指南
node app.js  --username=1921101201025 --password=19941130 lcourse 国家开放大学学习指南
node app.js  --username=1934001474084 --password=19930902 lcourse 3833
node app.js  --username=1934001474055 --password=19980324 lmodule 3833 472358
node app.js  --username=1934001474055 --password=19980324 readscore 3833
node app.js all
node app.js all --type=video
node app.js initdb
node app.js learn --type=video
node app.js --account=account.json lfinal  //learn final 
node app.js getcode account.json   //生成科目code 
###生成学习用moduleids 文件
node app.js --type=video createModuleFile 习近平新时代中国特色社会主义思想

node app.js  --username=1921101203721 --password=19930930 lmodule 习近平新时代中国特色社会主义思想 438064

node app.js  --account=accountx.csv --type=video lmodules 习近平新时代中国特色社会主义思想
 

node app.js  --account=account.json --type=quiz --submitquiz=yes lmodules 3945

# 提交空白测试
node appplus.js  --account=202012/accounts0.csv submitquiz 2
# 生成形考答案
node appplus.js  --account=202012/accounts0.csv genxingkao byreview
# 形考答题
node appplus.js  --account=20201229/accounts0.csv --type=xingkao --submitquiz=yes simplelearn

node appplus.js  --account=20210408/account.csv --type='page,video,ppt' simplelearn

### 操作步骤
1. node app.js  --username=2021101401106 --password=19700221 createlog 国家开放大学学习指南
2. node app.js --type=video createModuleFile 3945_习近平新时代中国特色社会主义思想
3. node app.js  --account=account.json --type=video lmodules 3945_习近平新时代中国特色社会主义思想
4. node app.js  --account=account.json --type=quiz --submitquiz=yes lmodules 3945_习近平新时代中国特色社会主义思想
5. node app.js  --account=account.json   lfinal 3945_习近平新时代中国特色社会主义思想

0. node app.js  --account=db/courses.csv gensubject
0. node app.js  --account=account.json genaccount
# 获取账号的所有课程数据信息
node appplus.js  --account=20210408/student.csv getcouses
# 解析生成的课程CSV
node appplus.js  parsecsv

# 学习答题
0. node appplus.js  --account=db/courses.csv --type=quiz --submitquiz=yes  simplelearn
# 查成绩
node appplus.js --account=bin/plus/accounts.csv --base=. summary
# 生成测试题库
0. node appplus.js  --account=--account=db/20201126a.csv  genquiz
# 生成形考题库
node appplus.js  --account=20201229/accounts0.csv --type=xingkao  genxingkao byreview
# 形考论坛发帖
node appplus.js  --account=20201229/accounts1.csv --type=xingkaoforum --submitquiz=yes simplelearn
# 形考论述题
node appplus.js  --account=20201229/accounts1.csv --type=xingkaofinal --submitquiz=yes simplelearn

node appplus.js  --account=20210517/1.csv --type=xingkaofinal --keyword=电子支付工具的使用 simplelearn

### TODO
1. 添加功能，给定格式文件 生成这个课程的内容数据文件
2. 添加功能，给定格式文件 生成这个课程的所有答案文件

### 测试
node app.js  --username=1921001419929 --password=19890412 createlog 习近平新时代中国特色社会主义思想
node app.js  --type=video createModuleFile 4609_习近平新时代中国特色社会主义思想

node app.js  --username=1921001419929 --password=19890412 --type=video lmodules 4488_习近平新时代中国特色社会主义思想
node app.js  --username=1921001419929 --password=19890412 --type=quiz lmodules 4488_习近平新时代中国特色社会主义思想
node app.js  --username=1821101252966 --password=19870317 --type=video lmodules 4611_习近平新时代中国特色社会主义思想


node app.js  --username=2021101201499 --password=19810701 createlog 马克思主义基本原理概论
node app.js  --type=video createModuleFile 4609_马克思主义基本原理概论
node app.js  --username=2021101201499 --password=19810701 --type=video lmodules 4609_马克思主义基本原理概论
node app.js  --username=2021101201499 --password=19810701 --type=quiz lmodules 4609_马克思主义基本原理概论

node app.js  --username=2021101200093 --password=19900122 createlog 中国近现代史纲要
node app.js  --username=1821101252843 --password=19910612 createlog 中国近现代史纲要
node app.js  --type=video createModuleFile 4615_中国近现代史纲要
node app.js  --username=2021101200093 --password=19900122 --type=video lmodules  4615_中国近现代史纲要


node app.js  --username=1821101452849 --password=19811224 createlog 思想道德修养与法律基础
node app.js  --type=video createModuleFile 4614_思想道德修养与法律基础
node app.js  --username=2021101401507 --password=20020315 --type=quiz lmodules 4614_思想道德修养与法律基础
node app.js  --username=2021001412030 --password=19840223 createlog 思想道德修养与法律基础
node app.js  --type=video createModuleFile 4491_思想道德修养与法律基础


node app.js  --username=2021101401012 --password=19810210 createlog 毛泽东思想和中国特色社会主义理论体系概论
node app.js  --type=video createModuleFile 4485_毛泽东思想和中国特色社会主义理论体系概论
node app.js  --username=1921001460543 --password=19950209 createlog 毛泽东思想和中国特色社会主义理论体系概论
node app.js  --type=video createModuleFile 4487_毛泽东思想和中国特色社会主义理论体系概论

node app.js  --username=1921001407254 --password=19900226 createlog 国家开放大学学习指南
node app.js  --type=video createModuleFile 4628_国家开放大学学习指南


### pkg puppeteer

https://stackoverflow.com/questions/49538076/how-do-you-package-a-puppeteer-app

xcopy node_modules\puppeteer\.local-chromium\win64-818858\chrome-win\ chromium /E /H /I


https://stackoverflow.com/questions/59021700/passed-function-is-not-well-serializable


