## 生成EXE文件
pkg .


3833    4125    4257    4255
maogai  zhinan  sixiu   mao
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

###生成学习用moduleids 文件
node app.js --type=video createModuleFile 习近平新时代中国特色社会主义思想

node app.js  --username=1921101203721 --password=19930930 lmodule 习近平新时代中国特色社会主义思想 438064

node app.js  --account=accountx.csv --type=video lmodules 习近平新时代中国特色社会主义思想

### 操作步骤
1. node app.js  --username=1921101201025 --password=19941130 createlog 国家开放大学学习指南
2. node app.js --type=video createModuleFile 习近平新时代中国特色社会主义思想
3. node app.js  --account=account.json --type=video lmodules 毛泽东思想和中国特色社会主义理论体系概论
