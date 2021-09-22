/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

var fs = require("fs");

require("../../core/update-net");

module.exports.Init = Init;

function Init(Engine)
{
    SERVER.LastEvalCodeNum = 0;
    
    SERVER.CheckLoadCodeTime = function ()
    {
        if(START_LOAD_CODE.StartLoadNode && START_LOAD_CODE.StartLoadVersionNum)
        {
            var Delta = new Date() - START_LOAD_CODE.StartLoadVersionNumTime;
            if(Delta > 20 * 1000)
            {
                ToError("Cannot load code version:" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + START_LOAD_CODE.StartLoadNode.ip + ":" + START_LOAD_CODE.StartLoadNode.port);
                SERVER.ClearLoadCode();
            }
        }
    };
    SERVER.ClearLoadCode = function ()
    {
        START_LOAD_CODE.StartLoad = undefined;
        START_LOAD_CODE.StartLoadVersionNum = 0;
        START_LOAD_CODE.StartLoadVersionNumTime = 0;
    };
    
    SERVER.StartLoadCode = function (Node,CodeVersion)
    {
        
        var VersionNum = CodeVersion.VersionNum;
        
        START_LOAD_CODE.StartLoad = CodeVersion;
        START_LOAD_CODE.StartLoadNode = Node;
        START_LOAD_CODE.StartLoadVersionNum = VersionNum;
        START_LOAD_CODE.StartLoadVersionNumTime = new Date();
        
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(fs.existsSync(fname))
        {
            SERVER.UseCode(VersionNum, false);
        }
        else
        {
            SERVER.StartGetNewCode(Node, VersionNum);
        }
    };
    
    SERVER.DownloadingNewCodeToPath = function (Node,Data,VersionNum)
    {
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(!fs.existsSync(fname))
        {
            var Hash = shaarr(Data);
            if(CompareArr(Hash, START_LOAD_CODE.StartLoad.Hash) === 0)
            {
                var file_handle = fs.openSync(fname, "w");
                fs.writeSync(file_handle, Data, 0, Data.length);
                fs.closeSync(file_handle);
                fname = GetDataPath("Update/wallet.zip");
                file_handle = fs.openSync(fname, "w");
                fs.writeSync(file_handle, Data, 0, Data.length);
                fs.closeSync(file_handle);
                
                SERVER.UseCode(VersionNum, global.USE_AUTO_UPDATE);
                
                return 1;
            }
            else
            {
                ToError("Error check hash of version code :" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + Node.ip + ":" + Node.port);
                SERVER.ClearLoadCode();
                return 0;
            }
        }
        return 1;
    };
    
    SERVER.UseCode = function (VersionNum,bUpdate)
    {
        if(bUpdate)
        {
            UpdateCodeFiles(VersionNum);
        }
        
        if(global.START_LOAD_CODE.StartLoad)
        {
            global.CODE_VERSION = START_LOAD_CODE.StartLoad;
            SERVER.ClearLoadCode();
        }
    };
    
    SERVER.SetNewCodeVersion = function (Data,PrivateKey)
    {
        
        var fname = GetDataPath("ToUpdate/wallet.zip");
        if(fs.existsSync(fname))
        {
            var fname2 = GetDataPath("Update/wallet-" + Data.VersionNum + ".zip");
            if(fs.existsSync(fname2))
            {
                fs.unlinkSync(fname2);
            }
            
            var data = fs.readFileSync(fname);
            var Hash = shaarr(data);
            
            var file_handle = fs.openSync(fname2, "w");
            fs.writeSync(file_handle, data, 0, data.length);
            fs.closeSync(file_handle);
            
            var SignArr = arr2(Hash, GetArrFromValue(Data.VersionNum));
            var Sign = secp256k1.sign(SHA3BUF(SignArr), PrivateKey).signature;
            global.CODE_VERSION = Data;
            global.CODE_VERSION.Hash = Hash;
            global.CODE_VERSION.Sign = Sign;
            return "OK Set new code version=" + Data.VersionNum;
        }
        else
        {
            return "File not exist: " + fname;
        }
    };
    setInterval(SERVER.CheckLoadCodeTime, 10 * 1000);
    CheckCreateDir(GetDataPath("Update"));
}
