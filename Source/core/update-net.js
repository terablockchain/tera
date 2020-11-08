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

global.UpdateCodeFiles = function (StartNum)
{
    var fname = GetDataPath("Update");
    if(!fs.existsSync(fname))
        return 0;
    
    var arr = fs.readdirSync(fname);
    var arr2 = [];
    for(var i = 0; i < arr.length; i++)
    {
        if(arr[i].substr(0, 7) === "wallet-")
        {
            arr2.push(parseInt(arr[i].substr(7)));
        }
    }
    arr2.sort(function (a,b)
    {
        return a - b;
    });
    
    for(var i = 0; i < arr2.length; i++)
    {
        var Num = arr2[i];
        var Name = "wallet-" + Num + ".zip";
        var Path = fname + "/" + Name;
        
        ToLog("Check file:" + Name);
        
        if(fs.existsSync(Path))
        {
            if(StartNum === Num)
            {
                ToLog("UnpackCodeFile:" + Name);
                UnpackCodeFile(Path);
                
                if(StartNum % 2 === 0)
                {
                    global.RestartNode(1);
                }
                else
                {
                }
                
                return 1;
            }
            else
            {
                ToLog("Delete old file update:" + Name);
                fs.unlinkSync(Path);
            }
        }
    }
    
    return 0;
}

global.UnpackCodeFile = function (fname,bLog)
{
    
    var data = fs.readFileSync(fname);
    var reader = ZIP.Reader(data);
    
    reader.forEach(function (entry)
    {
        var Name = entry.getName();
        var Path = GetCodePath(Name);
        
        if(entry.isFile())
        {
            if(global.DEV_MODE)
            {
                ToLog("emulate unpack: " + Path);
                return;
            }
            if(bLog)
                ToLog(Path);
            
            var buf = entry.getData();
            CheckCreateDir(Path, true, true);
            
            var file_handle = fs.openSync(Path, "w");
            fs.writeSync(file_handle, buf, 0, buf.length);
            fs.closeSync(file_handle);
        }
        else
        {
        }
    });
    reader.close();
}

global.RestartNode = function RestartNode(bForce)
{
    global.NeedRestart = 1;
    setTimeout(DoExit, 5000);
    
    if(global.nw || global.NWMODE)
    {
    }
    else
    {
        StopChildProcess();
        ToLog("********************************** FORCE RESTART!!!");
        return;
    }
    
    if(this.ActualNodes)
    {
        var it = this.ActualNodes.iterator(), Node;
        while((Node = it.next()) !== null)
        {
            if(Node.Socket)
                CloseSocket(Node.Socket, "Restart");
        }
    }
    
    SERVER.StopServer();
    SERVER.StopNode();
    StopChildProcess();
    
    ToLog("****************************************** RESTART!!!");
    ToLog("EXIT 1");
}

function DoExit()
{
    ToLog("EXIT 2");
    if(global.nw || global.NWMODE)
    {
        ToLog("RESTART NW");
        
        var StrRun = '"' + process.argv[0] + '" --user-data-dir="..\\DATA\\Local" .\n';
        StrRun += StrRun;
        SaveToFile("run-next.bat", StrRun);
        
        const child_process = require('child_process');
        child_process.exec("run-next.bat", {shell:true});
    }
    
    ToLog("EXIT 3");
    process.exit(0);
}

function GetRunLine()
{
    var StrRun = "";
    for(var i = 0; i < process.argv.length; i++)
        StrRun += '"' + process.argv[i] + '" ';
    return StrRun;
}
