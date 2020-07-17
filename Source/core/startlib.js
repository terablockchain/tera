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
