/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

const fs = require('fs');

const DBFileMap = {};
const DBMapCheckProcess = {};

module.exports = class 
{
    constructor()
    {
    }
    
    CheckPathDB()
    {
        var Path = GetDataPath("DB/Run");
        CheckCreateDir(Path)
    }
    
    CloseDBFile(name, bdelete)
    {
        
        var Item = DBFileMap[name];
        if(Item)
        {
            let bDelete = bdelete;
            let Name = name;
            fs.close(Item.fd, function (err)
            {
                if(!err)
                {
                    if(bDelete)
                    {
                        var fname = GetDataPath("DB/" + Name);
                        fs.unlink(fname, function (err)
                        {
                            if(err)
                                ToLog(err)
                        })
                    }
                }
                else
                {
                    ToLog(err)
                }
            })
            delete DBFileMap[name]
        }
    }
    OpenDBFile(name, bWrite, bExist)
    {
        if(bWrite)
        {
            if(!this.WasCheckPathDB)
            {
                this.CheckPathDB()
                this.WasCheckPathDB = true
            }
            
            if(global.READ_ONLY_DB)
            {
                ToLog("CANNOT WRITE - DB IN READ_ONLY MODE!!!")
                process.exit()
            }
            
            CheckStartOneProcess("Run/" + name + "-run")
        }
        
        var Item = DBFileMap[name];
        if(Item === undefined)
        {
            var fname = GetDataPath("DB/" + name);
            
            if(!fs.existsSync(fname))
            {
                if(bExist)
                {
                    DBFileMap[name] = null
                    return null;
                }
                var fd = fs.openSync(fname, "w+");
                fs.closeSync(fd)
            }
            
            var fd = fs.openSync(fname, "r+");
            
            var stat = fs.statSync(fname);
            var size = stat.size;
            
            Item = {name:name, fname:fname, fd:fd, size:size, FillRows:0, CountRows:0, }
            
            DBFileMap[name] = Item
        }
        
        return Item;
    }
};

const LibDBFile = new module.exports();

function CheckStartOneProcess(Name)
{
    if(global.READ_ONLY_DB || DBMapCheckProcess[Name])
        return;
    DBMapCheckProcess[Name] = 1;
    var path = GetDataPath("DB/" + Name);
    if(fs.existsSync(path))
    {
        fs.unlinkSync(path);
    }
    
    try
    {
        LibDBFile.OpenDBFile(Name);
    }
    catch(e)
    {
        ToLog("****** DETECT START ANOTHER PROCESS for: " + Name + " - EXIT!");
        process.exit();
    }
}
