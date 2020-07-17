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

class DApp
{
    constructor()
    {
    }
    Name()
    {
        return "";
    }
    SendMessage(Body, ToAddr)
    {
        SERVER.SendMessage(Body, ToAddr)
    }
    AddTransaction(Tr)
    {
        SERVER.AddTransaction(Tr)
    }
    
    GetFormatTransaction()
    {
        return "";
    }
    
    GetObjectTransaction(Body)
    {
        var Type = Body[0];
        var format = GetFormatTransactionCommon(Type);
        if(!format)
            return {"Type":Type, Data:GetHexFromArr(Body)};
        
        var TR;
        try
        {
            TR = BufLib.GetObjectFromBuffer(Body, format, {})
        }
        catch(e)
        {
        }
        return TR;
    }
    
    GetScriptTransaction(Body)
    {
        var Type = Body[0];
        var format = GetFormatTransactionCommon(Type);
        if(!format)
            return GetHexFromArr(Body);
        
        var TR = BufLib.GetObjectFromBuffer(Body, format, {});
        
        if(Type === 111 && TR.Body && TR.Body.length)
        {
            var App = DAppByType[TR.Body[0]];
            if(App)
            {
                TR.Body = JSON.parse(App.GetScriptTransaction(TR.Body))
            }
        }
        
        ConvertBufferToStr(TR)
        return JSON.stringify(TR, "", 2);
    }
    
    GetVerifyTransaction(Block, BlockNum, TrNum, Body)
    {
        return 1;
    }
    
    ClearDataBase()
    {
    }
    GetSenderNum(BlockNum, Body)
    {
        return 0;
    }
    GetSenderOperationID(BlockNum, Body)
    {
        return 0;
    }
    CheckSignTransferTx(BlockNum, Body)
    {
        return 0;
    }
    
    CheckSignAccountTx(BlockNum, Body)
    {
        var FromNum = this.GetSenderNum(BlockNum, Body);
        if(!FromNum)
            return 0;
        var AccountFrom = DApps.Accounts.ReadState(FromNum);
        if(!AccountFrom)
            return 0;
        
        var hash = Buffer.from(sha3(Body.slice(0, Body.length - 64)));
        var Sign = Buffer.from(Body.slice(Body.length - 64));
        var Result = 0;
        if(AccountFrom.PubKey[0] === 2 || AccountFrom.PubKey[0] === 3)
            try
            {
                Result = secp256k1.verify(hash, Sign, AccountFrom.PubKey)
            }
            catch(e)
            {
                ToLog("" + e)
            }
        
        return Result;
    }
    OnWriteBlockStart(Block)
    {
    }
    OnWriteBlockFinish(Block)
    {
    }
    OnDeleteBlock(Block)
    {
    }
    OnWriteTransaction(Block, Body, BlockNum, TrNum)
    {
    }
    OnMessage(Msg)
    {
    }
};
module.exports = DApp;

function GetFormatTransactionCommon(Type)
{
    var App = DAppByType[Type];
    if(App)
        return App.GetFormatTransaction(Type);
    else
        return "";
}

function ReqDir(Path)
{
    if(fs.existsSync(Path))
    {
        var arr = fs.readdirSync(Path);
        for(var i = 0; i < arr.length; i++)
        {
            var name = arr[i];
            ToLog("Reg: " + name);
            var name2 = Path + "/" + arr[i];
            require(name2);
        }
    }
}


global.DApps = {};
global.DAppByType = {};

