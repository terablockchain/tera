/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var fs = require("fs");

global.GetDataPath = function GetDataPath(name)
{
    if(global.DATA_PATH.substr(global.DATA_PATH.length - 1, 1) !== "/")
        global.DATA_PATH = global.DATA_PATH + "/";
    return GetNormalPathString(global.DATA_PATH + name);
}
global.GetCodePath = function GetCodePath(name)
{
    if(global.CODE_PATH.substr(global.CODE_PATH.length - 1, 1) !== "/")
        global.CODE_PATH = global.CODE_PATH + "/";
    
    return GetNormalPathString(global.CODE_PATH + name);
}

global.GetNormalPathString = function (Str)
{
    return Str.split("\\").join('/');
}

global.CheckCreateDir = function (Path,bHidden,IsFile)
{
    Path = GetNormalPathString(Path);
    if(!fs.existsSync(Path))
    {
        if(!bHidden)
            console.log("Create: " + Path);
        
        var arr = Path.split('/');
        var CurPath = arr[0];
        if(IsFile)
        {
            arr.length--;
        }
        
        for(var i = 1; i < arr.length; i++)
        {
            
            CurPath += "/" + arr[i];
            if(!fs.existsSync(CurPath))
            {
                fs.mkdirSync(CurPath);
            }
        }
    }
}

global.CopyFiles = CopyFiles;
function CopyFiles(FromPath,ToPath,bRecursive)
{
    if(fs.existsSync(FromPath))
    {
        var arr = fs.readdirSync(FromPath);
        
        for(var i = 0; i < arr.length; i++)
        {
            var name1 = FromPath + "/" + arr[i];
            var name2 = ToPath + "/" + arr[i];
            if(fs.statSync(name1).isDirectory())
            {
                if(bRecursive)
                {
                    if(!fs.existsSync(name2))
                        fs.mkdirSync(name2);
                    CopyFiles(name1, name2, bRecursive);
                }
            }
            else
            {
                var data = fs.readFileSync(name1);
                var file_handle = fs.openSync(name2, "w");
                fs.writeSync(file_handle, data, 0, data.length);
                fs.closeSync(file_handle);
            }
        }
    }
}

if(!global.ToLog)
    global.ToLog = function (Str)
    {
        console.log(Str);
    };

global.FindBlockchainStartTime = function (bCheck)
{
    var Num = Math.trunc(Date.now() / CONSENSUS_PERIOD_TIME);
    var PathFile = global.DATA_PATH + "/DB/main-index";
    if(bCheck && !fs.existsSync(PathFile))
    {
        var StartTime = (Num - 16) * CONSENSUS_PERIOD_TIME;
        return StartTime;
    }
    
    try
    {
        var stat = fs.statSync(PathFile);
        var MaxNum = Math.trunc(stat.size / 6) - 11;
        if(!MaxNum)
            MaxNum = 0;
        
        var StartTime = (Num - MaxNum - 8) * CONSENSUS_PERIOD_TIME;
        console.log("****************************** RUN MODE IN CONTINUE_DB MaxNum:" + MaxNum + " TIME:" + StartTime);
        return StartTime;
    }
    catch(e)
    {
        console.log("****************************** CANNT RUN MODE IN CONTINUE_DB: " + e.stack);
        return 0;
    }
}


global.GetHexFromArr = function (arr)
{
    if(!arr)
        return "";
    else
        return Buffer.from(arr).toString('hex').toUpperCase();
}
global.GetHexFromArr8 = function (arr)
{
    return GetHexFromArr(arr).substr(0, 8);
}

global.GetArrFromHex = function (Str)
{
    var array = [];
    for(var i = 0; i < Str.length / 2; i++)
    {
        array[i] = parseInt(Str.substr(i * 2, 2), 16);
    }
    return array;
}

global.runcode = function (filename)
{
    var Str = fs.readFileSync(filename, "utf-8");
    eval(Str);
}
