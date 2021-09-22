/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
/**
 *
 * The module is designed for auto updating when
 *
 **/

var fs = require("fs");

module.exports.Init = Init;

global.START_LOAD_CODE = {StartLoadVersionNum:0};

function Init(Engine)
{
    global.CODE_VERSION = {BlockNum:0, addrArr:[], LevelUpdate:0, BlockPeriod:0, VersionNum:UPDATE_CODE_VERSION_NUM, Hash:[], Sign:[],
        StartLoadVersionNum:0};
    
    Engine.VERSION_SEND = {VersionNum:"uint"};
    Engine.VERSION_RET = {BlockNum:"uint", addrArr:"arr32", LevelUpdate:"byte", BlockPeriod:"uint", VersionNum:"uint", Hash:"hash",
        Sign:"arr64"};
    
    Engine.ProcessNewVersionNum = function (Child,CodeVersionNum)
    {
        Child.CodeVersionNum = CodeVersionNum;
        
        if(Engine.StartGetNewVersion && (CodeVersionNum > CODE_VERSION.VersionNum || CodeVersionNum === CODE_VERSION.VersionNum && IsZeroArr(CODE_VERSION.Hash)))
        {
            Engine.StartGetNewVersion(Child, CodeVersionNum);
        }
    };
    Engine.StartGetNewVersion = function (Child,VersionNum)
    {
        var Delta = Date.now() - Child.LastGetCodeVersion;
        if(Delta < 15000)
            return;
        
        Child.LastGetCodeVersion = Date.now();
        
        Engine.Send("VERSION", Child, {VersionNum:VersionNum}, function (Child,Data)
        {
            if(!Data)
                return;
            
            Child.LastGetCodeVersion = Date.now();
            
            if(Data.VersionNum > CODE_VERSION.VersionNum || VersionNum === CODE_VERSION.VersionNum && IsZeroArr(CODE_VERSION.Hash))
            {
                Engine.CheckCodeVersion(Data, Child);
            }
        });
    };
    
    Engine.VERSION = function (Child,Data)
    {
        return CODE_VERSION;
    };
    
    Engine.CheckCodeVersion = function (CodeVersion,Child)
    {
        
        var bLoadVer = 0;
        if(CodeVersion.BlockNum && (CodeVersion.BlockNum <= GetCurrentBlockNumByTime() || CodeVersion.BlockPeriod === 0) && (CodeVersion.BlockNum > CODE_VERSION.BlockNum || CodeVersion.BlockNum === 1) && !IsZeroArr(CodeVersion.Hash) && (CodeVersion.VersionNum > CODE_VERSION.VersionNum && CodeVersion.VersionNum > START_LOAD_CODE.StartLoadVersionNum || CodeVersion.VersionNum === CODE_VERSION.VersionNum && IsZeroArr(CODE_VERSION.Hash)))
        {
            bLoadVer = 1;
        }
        
        if(bLoadVer)
        {
            var Level = Child.Level;
            if(CodeVersion.BlockPeriod)
            {
                var Delta = GetCurrentBlockNumByTime() - CodeVersion.BlockNum;
                Level += Delta / CodeVersion.BlockPeriod;
            }
            
            if(Level >= CodeVersion.LevelUpdate)
            {
                var SignArr = arr2(CodeVersion.Hash, GetArrFromValue(CodeVersion.VersionNum));
                if(CheckDevelopSign(SignArr, CodeVersion.Sign))
                {
                    ToLog("Got new CodeVersion = " + CodeVersion.VersionNum + " HASH:" + GetHexFromArr(CodeVersion.Hash).substr(0, 20), 2);
                    
                    if(CodeVersion.VersionNum > CODE_VERSION.VersionNum && CodeVersion.VersionNum > START_LOAD_CODE.StartLoadVersionNum)
                    {
                        SERVER.StartLoadCode(Child, CodeVersion);
                    }
                    else
                    {
                        global.CODE_VERSION = CodeVersion;
                    }
                }
                else
                {
                    Child.ToLog("Error Sign CodeVersion=" + CodeVersion.VersionNum + " HASH:" + GetHexFromArr(CodeVersion.Hash).substr(0, 20));
                    ToLog(JSON.stringify(CodeVersion));
                    Engine.AddCheckErrCount(Child, 10, "Error Sign CodeVersion");
                }
            }
        }
    };
    
    Engine.CODE_SEND = {VersionNum:"uint"};
    Engine.CODE_RET = {result:"byte", VersionNum:"uint", file:"buffer"};
    
    Engine.StartGetNewCode = function (Child,VersionNum)
    {
        var Delta = Date.now() - Child.LastGetCode;
        if(Delta < 40000)
            return;
        
        Child.LastGetCode = Date.now();
        
        Engine.Send("CODE", Child, {VersionNum:VersionNum}, function (Child,Data)
        {
            if(!Data)
                return;
            
            Child.LastGetCode = Date.now();
            
            if(!Data.result || Data.VersionNum !== VersionNum || !START_LOAD_CODE.StartLoad)
                return;
            
            if(!SERVER.DownloadingNewCodeToPath(Child, Data.file, VersionNum))
                Engine.AddCheckErrCount(Child, 1, "Error check hash of version code");
        });
    };
    
    Engine.CODE = function (Child,Data)
    {
        if(!Data)
            return;
        
        var VersionNum = Data.VersionNum;
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(fs.existsSync(fname))
        {
            ToLog("GET CODE VersionNum:" + VersionNum + " send file: " + fname);
            var data = fs.readFileSync(fname);
            return {result:1, VersionNum:VersionNum, file:data};
        }
        return {result:0, file:[]};
    };
    
    SERVER.StartGetNewCode = Engine.StartGetNewCode;
}
