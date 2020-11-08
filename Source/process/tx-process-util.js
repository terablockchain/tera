/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


"use strict";

const fs = require('fs');

global.RunDeleteOldDBFiles = function ()
{
    setTimeout(function ()
    {
        ToLog("=RunDeleteOldDBFiles=");
        
        var Path = GetDataPath("DB");
        DeleteOldFiles(Path);
    }, 2 * 1000);
}

function DeleteOldFiles(Path)
{
    if(Path.substr(Path.length - 1, 1) === "/")
        Path = Path.substr(0, Path.length - 1);
    
    try
    {
        var arr = fs.readdirSync(Path);
    }
    catch(e)
    {
        console.log(e);
        return;
    }
    
    var CurTime = Date.now();
    for(var i = 0; i < arr.length; i++)
    {
        var Stat;
        var name = Path + "/" + arr[i];
        try
        {
            Stat = fs.statSync(name);
        }
        catch(e)
        {
            console.log("Skip " + name);
            continue;
        }
        
        if(Stat.isDirectory())
        {
            DeleteOldFiles(name);
        }
        else
        {
            if(name.substr(name.length - 3) === "lst")
            {
                console.log("Skip: " + name);
                continue;
            }
            
            var Delta = Math.floor((CurTime - Stat.mtimeMs) / 3600 / 24 / 100) / 10;
            if(Delta > 7)
            {
                console.log("Can delete: " + name + "  Delta=" + Delta + " days");
            }
        }
    }
}

