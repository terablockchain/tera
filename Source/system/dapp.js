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
        throw "Need method Name()";
    }
    
    GetFormatTransaction(Type)
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
            TR = SerializeLib.GetObjectFromBuffer(Body, format, {})
        }
        catch(e)
        {
        }
        return TR;
    }
    
    GetScriptTransaction(Body, BlockNum, TxNum, bInner)
    {
        var Type = Body[0];
        var format = GetFormatTransactionCommon(Type,bInner);
        if(!format)
            return GetHexFromArr(Body);
        
        var TR = SerializeLib.GetObjectFromBuffer(Body, format, {});
        
        if((Type === TYPE_TRANSACTION_TRANSFER3 || Type === TYPE_TRANSACTION_TRANSFER5) && TR.Body && TR.Body.length)
        {
            var App = DAppByType[TR.Body[0]];
            if(App)
            {
                TR.Body = JSON.parse(App.GetScriptTransaction(TR.Body, BlockNum, TxNum,1))
            }
        }
        
        ConvertBufferToStr(TR)
        return JSON.stringify(TR, "", 2);
    }
    
    ClearDataBase()
    {
    }
    Close()
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
    
    CheckSignAccountTx(BlockNum, Body, OperationID)
    {
        var FromNum = this.GetSenderNum(BlockNum, Body);
        if(!FromNum)
            return {result:0, text:"Error sender num"};
        var Item = ACCOUNTS.ReadState(FromNum);
        if(!Item)
            return {result:0, text:"Error read sender"};
        
        if(OperationID !== undefined)
        {
            if(OperationID < Item.Value.OperationID)
                return {result:0, text:"Error OperationID (expected: " + Item.Value.OperationID + " for ID: " + FromNum + ")"};
            var MaxCountOperationID = 100;
            if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
                MaxCountOperationID = 1000000;
            if(OperationID > Item.Value.OperationID + MaxCountOperationID)
                return {result:0, text:"Error too much OperationID (expected max: " + (Item.Value.OperationID + MaxCountOperationID) + " for ID: " + FromNum + ")"};
        }

        var hash = Buffer.from(sha3(Body.slice(0, Body.length - 64)));
        var Sign = Buffer.from(Body.slice(Body.length - 64));
        var Result = CheckSign(hash, Sign, Item.PubKey);
        if(Result)
            return {result:1, text:"ok", ItemAccount:Item};
        else
            return {result:0, text:"Sign error"};
    }
    OnProcessBlockStart(Block)
    {
    }
    OnProcessBlockFinish(Block)
    {
    }
    OnDeleteBlock(BlockNum)
    {
    }
    OnProcessTransaction(Block, Body, BlockNum, TrNum)
    {
    }
    
    GetScrollList(DB, start, count)
    {
        var arr = [];
        for(var num = start; true; num++)
        {
            var Data = DB.Read(num);
            if(!Data)
                break;
            
            arr.push(Data)
            
            count--
            if(count < 1)
                break;
        }
        
        return arr;
    }
}
module.exports = DApp;

function GetFormatTransactionCommon(Type,bInner)
{
    var App = DAppByType[Type];
    if(App)
        return App.GetFormatTransaction(Type,bInner);
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

global.REGISTER_SYS_DAPP = function (App,Type)
{
    var Name = App.Name();
    
    DApps[Name] = App;
    if(DAppByType[Type])
    {
        throw "Error on registering app " + App.Name() + ": tx type = " + Type + " has already been registered in the app " + DAppByType[Type].Name();
    }
    
    DAppByType[Type] = App;
};
