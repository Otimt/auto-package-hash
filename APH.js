//从package.php里 读取文//件并添加hash
// var SHA1 = require("crypto-js/ripemd160");
// var crypto = require('crypto');
// var md5sum = crypto.createHash('md5');
const md5File = require('md5-file')
var fs = require('fs');
// var file = 'D:\\Program Files\\Adobe\\Acrobat 10.0\\Acrobat\\acadres\\MyriadCAD.otf'
var file = 'C:\\Users\\yongzhen.shang\\Desktop\\packages.php'
var trueApplicationFile = "E:\\workspace_dd\\www\\z3.0\\develop\\protected\\config\\packages.php";
var trueWwwFile = "E:\\workspace_dd\\www\\z3.0\\develop\\public\\www\\protected\\config\\packages.php";
var rewritableTime = new Date(2017,2,28,12,0,0);//这个时间之后变化过的文件，允许重写hash值
var applicationPath;//全站更目录
var webrootPath;//当前站点目录
// var file = 'E:\\workspace_dd\\everyone\\dwz\\auto-package-hash\\APH.js';
var arguments = process.argv.splice(2);//获取参数
//console.log("arguments:"+arguments.splice(2));
// console.log("SHA1:"+SHA1("msa"));

var hashFileMap = {};//暂时存储文件hash值，已hash过的文件hash值不重新计算

readPackage(trueWwwFile);//www站点
readPackage(trueApplicationFile);//全局





//createHash(file)

//生成读package文件================================================================================================================
function readPackage(file){
    if(!fs.existsSync(file)){
        console.log("pacakge文件["+file+"]不存在");
    }else{
        var startTime = new Date().getTime();;
        applicationPath = getApplicationPath(file);
        webrootPath = getWebrootPath(file);
        var contentText = fs.readFileSync(file,'utf-8');
        // 解析package 文件，抽取里面的而文件路径
        var fileHashOrderList = analysisPackage(contentText);
        //将fileHashOrderList 中的hash值填充到package文件
        var contentTextWithNewHash = fillContentTextWithHash(contentText,fileHashOrderList);
        // 将填充了hash值的文本写回packages文件
        writeTextBackToPackage(file,contentTextWithNewHash);
        var endTime = new Date().getTime();;
        outStr =file + " ---- 执行时间："+(endTime - startTime)+"ms";
        console.log(outStr);
    }
}
/**
 * 方法：解析package 文件，抽取里面的而文件路径
 */
function analysisPackage(str){
    var fileHashOrderList = [];//文件hash顺序列表
    var clearStr = str;
    clearStr = clearStr.replace(/\/\/.*/g,"");//删掉//注释
    // console.log(clearStr);
    clearStr = clearStr.replace(/\s/g,"");//删掉空格
    // console.log(clearStr);
    clearStr = clearStr.replace(/\/\*.*?\*\//g,"");//删掉/**/注释
    clearStr = clearStr.replace(/"|'/g,"");//去掉引号
    //console.log("光光的文件："+clearStr);

    var strStack = [""];//字符串处理栈
    var stackTop = getStrStackTop();//栈顶

    //临时变量Temporary variables

    var basePath = null;//文件基础路径

    var fileNameStr = "";//文件名数组字符串
    var fileNameArr = [];//文件名数组

    var basePathNum = 0;
    var fileNum = 0;
    for(var i=0,il=clearStr.length;i<il;i++){
        var char = clearStr[i];
        if(char!="("&&char!="["&&char!="]"&&char!=")"){
            //普通字符 写入栈顶
            strStack[strStack.length-1] += char;
        }else if(char=="(" || char=="["){
            //把非注释的([压栈
            strStack.push(char);
            strStack.push("");
        }else if(char==")" || char=="]"){
            //遇到)]出栈， 不检查() [] 不匹配的情况
            var content = strStack.pop();//内容
            var splitChar = strStack.pop();//分割
            if((char==")"&&splitChar=="[")||(char=="]"&&splitChar=="(")){
                console.log("文件语法错误，()或[]不匹配");
                return;
            }
            var typeStr = getStrStackTop();//类型字符串，识别"js" "css" 'js' 'css' "basePath" 'basePath'
            if(/basePath=>/.test(content)){
                console.log("content----"+content)
                basePath = content.match(/(basePath)=>.*?(,|\)|$)/g)[0].replace(/,|\)/g,"").replace("basePath=>","");
                console.log("一个文件包:"+basePath+"---------------------");
                console.log("fileNameArr文件名数组-----"+fileNameArr);
                hashFiles(basePath,fileNameArr);
                console.log("-------------------------"+ basePathNum++ +"\n")

                // console.log("content----"+content)
            }else if(/(js=>)|(css=>)/.test(typeStr)){
                fileNameArr = fileNameArr.concat(content.split(","));
                // console.log("typeStr----"+typeStr)
                typeStr = typeStr.replace(/(js=>)|(css=>)/g,"");
                setStrStackTop(typeStr);

            }else{

            }

        }
    }
    console.log("一共"+fileNum+"个文件")
    return fileHashOrderList;

    function getStrStackTop(){
        return strStack[strStack.length-1];
    }
    function setStrStackTop(value){
        strStack[strStack.length-1] = value;
    }

    /**
     * 方法：对basePath 下的file，执行hash
     */
    function hashFiles(basePath,fileNameArr){
        basePath = basePath.replace(/\./g,"\\").replace(/^application/g,applicationPath).replace(/^webroot/g,webrootPath)
        for(var i=0,il=fileNameArr.length;i<il;i++){
            if(fileNameArr[i]=="")continue;
            var fileName = (fileNameArr[i].split("/").join("\\").replace(/\?.*$/,""));
            var file = basePath+"\\"+fileName;
            fileNum++;
            var rewritable = false;
            if(fs.existsSync(file)){
                var stat = fs.statSync(file);
                // console.log("修改时间："+stat.mtime)
                if(stat.mtime > rewritableTime){
                    //根据各种条件（文件修改时间） 决定是否，重写hash值
                    var hash = createHashOutStr(file)
                    rewritable = true;
                }
            }else{
                hash = "NotFound";//FNE file not exist
                rewritable = true;
            }
            fileHashOrderList.push({fileName:fileName,hash:hash,fileFullPth:file,rewritable:rewritable});
        }
        clearTemporaryVariables();
    }

    /**
     * 方法：清理临时变量
     */
    function clearTemporaryVariables(){
        basePath = null;
        fileNameArr = []
    }
}
/**
 * 方法：将fileHashOrderList 中的hash值填充到package文件
 */
function fillContentTextWithHash(contentText,fileHashOrderList){
    var reStr = contentText;
    console.log("将fileHashOrderList 中的hash值填充到package文件--------------------------------");
    //防止 重名文件无法替换
    for(var i=0,il=fileHashOrderList.length;i<il;i++){
        var fileHashObj = fileHashOrderList[i]
        var fileName = fileHashObj.fileName.split("\\").join("/").split(".").join("\\.");
        var hash = fileHashObj.hash
        var rewritable = fileHashObj.rewritable
        var fileNameReg = new RegExp("('"+fileName+".*?')|(\""+fileName+".*?\")")
        if(!rewritable){
            //如果不应重写 文件名，记录原名
            fileHashObj.origFileName = reStr.match(fileNameReg)[0];
        }
        reStr = reStr.replace(fileNameReg,"_|_|_|_");

    }
    //重写文件名及hash值
    for(var i=0,il=fileHashOrderList.length;i<il;i++){
        var fileHashObj = fileHashOrderList[i]
        var fileName = fileHashObj.fileName.split("\\").join("/")
        var hash = fileHashObj.hash
        var rewritable = fileHashObj.rewritable
        if(rewritable){
            console.log("{fileName:"+fileName+",hash:"+hash+"}")
            reStr = reStr.replace("_|_|_|_","'"+fileName+"?v="+hash+"'")
        }else{
            var origFileName = fileHashObj.origFileName
            reStr = reStr.replace("_|_|_|_",origFileName);
        }

    }
    console.log("将fileHashOrderList 中的hash值"+fileHashOrderList.length+"个填充完毕--------------------------------");
    console.log("输出内容："+reStr)
    return reStr;
}

function writeTextBackToPackage(file,str){
    // 加载编码转换模块
    // var iconv = require('iconv-lite');
    // 测试用的中文
    // var str = "\r\n我是一个人Hello myself!";
    // 把中文转换成字节数组
    // var arr = iconv.encode(str, 'utf8');
    // console.log(arr);

    // appendFile，如果文件不存在，会自动创建新文件
    // 如果用writeFile，那么会删除旧文件，直接写新文件
    fs.writeFile(file, str, function(err){
        if(err)
            console.log("fail " + err);
        else
            console.log("写入文件ok");
    });
}
//生成hash================================================================================================================
function getApplicationPath(path){
    // var trueApplicationFile = "E:\\workspace_dd\\www\\z3.0\\develop\\protected\\config\\packages.php";
    var applicationPath = path.match(/^.*?\\develop\\/)
    if(applicationPath){
        return applicationPath[0]+"protected";
    }else{
        console.log("文件不在yii文件序列里");
        process.exit();
    }
}
function getWebrootPath(path){
    // var trueWwwFile = "E:\\workspace_dd\\www\\z3.0\\develop\\public\\www\\protected\\config\\packages.php";
    var webrootPath = path.match(/.*?\\public\\.*?\\/);
    if(webrootPath){
        var webrootPathStr = webrootPath[0]
        //有问题 获取的不对
        return webrootPathStr.substr(0,webrootPathStr.length-1)
    }else{
        return " ";
    }
}
/**
 * 方法：根据文件路径生成文件指纹产生提示文本，临时方法
 * @param file
 */
function createHashOutStr(file){
    var startTime = new Date().getTime();;
    var hash = createHash(file)
    var endTime = new Date().getTime();;
    outStr =file + " -- " +hash+" -- 执行时间："+(endTime - startTime)+"ms";
    console.log(outStr);
    return hash;
}
/**
 * 方法：根据文件路径生成文件指纹
 * @param file
 */
function createHash(file){
    var hash = hashFileMap[file];
    if(typeof(hash) !="undefined"){
        return hash;
    }
    if(!fs.existsSync(file)){
        hash = "NotFound";//FNE file not exist
    }else{
        try{
            hash = md5File.sync(file).substr(0,8)
            hashFileMap[file] = hash;
        }catch(e){
            hash = "HashError"//
        }
    }
    return hash
}
process.on('uncaughtException', function (err) {
    console.log(err);
    // console.error(111+err.stack);
});