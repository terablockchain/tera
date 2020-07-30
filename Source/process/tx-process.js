/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


global.PROCESS_NAME = "TX";

const crypto = require('crypto');
const fs = require('fs');

require("../core/constant");
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
require("../core/library");



global.READ_ONLY_DB = 0;
require("../system");

require("./child-process");

process.on('message', function (msg)
{
    switch(msg.cmd)
    {
        case "FindTX":
            global.TreeFindTX.SaveValue(msg.TX, msg);
            break;
        case "SetSmartEvent":
            global.TreeFindTX.SaveValue("Smart:" + msg.Smart, 1);
            break;
            
        default:
            break;
    }
}
);

setInterval(PrepareStatEverySecond, 1000);

global.SetStatMode = function (Val)
{
    global.STAT_MODE = Val;
    return global.STAT_MODE;
}

global.TreeFindTX = new STreeBuffer(30 * 1000, CompareItemHashSimple, "string");



var JinnLib = require("../jinn/tera");
var Map = {"Block":1, "BlockDB":1, "Log":1, };
JinnLib.Create(Map);

global.bShowDetail = 0;
global.StopTxProcess = 0;


global.ClearDataBase = ClearDataBase;
function ClearDataBase()
{
    for(var key in DApps)
    {
        DApps[key].ClearDataBase();
    }
    
    if(global.Engine)
        global.Engine.DBResult.Clear();
    ToErrorTx("Start num = 0", 2);
}

global.RewriteAllTransactions = RewriteAllTransactions;
function RewriteAllTransactions(bSilent)
{
    if(!bSilent)
        ToErrorTx("*************RewriteAllTransactions");
    
    ClearDataBase();
    return 1;
}

global.ReWriteDAppTransactions = ReWriteDAppTransactions;
function ReWriteDAppTransactions(Params,bSilent)
{
    StopTxProcess = 0;
    
    var StartNum = Params.StartNum;
    if(!bSilent)
    {
        ToErrorTx("ReWriteDAppTransactions from: " + StartNum);
    }
    
    while(1)
    {
        var LastBlockNum = DApps.Accounts.GetLastBlockNumAct();
        if(LastBlockNum <= 0)
        {
            ToErrorTx("Find LastBlockNum=" + LastBlockNum);
            RewriteAllTransactions(1);
            return;
        }
        if(LastBlockNum >= StartNum)
        {
            BlockDeleteTX(LastBlockNum);
        }
        else
        {
            break;
        }
    }
}





class CTXProcess
{
    constructor()
    {
        
        var LastBlockNum = DApps.Accounts.GetLastBlockNumAct();
        ToErrorTx("Init CTXProcess: " + LastBlockNum)
        
        ReWriteDAppTransactions({StartNum:LastBlockNum - 10}, 1)
        
        this.ErrorAccHash = 0
        this.TimeWait = 0
    }
    
    Run()
    {
        if(StopTxProcess)
            return;
        
        var StartTime = Date.now();
        if(this.TimeWait)
        {
            if(StartTime - this.TimeWait < 600)
                return;
        }
        this.TimeWait = 0
        if(this.ErrorAccHash >= 10000)
        {
            ToErrorTx("FORCE CalcMerkleTree")
            DApps.Accounts.CalcMerkleTree(1)
            this.ErrorAccHash = 0
            return;
        }
        
        for(var i = 0; i < 500; i++)
        {
            var Result = this.RunItem();
            if(!Result)
            {
                this.TimeWait = Date.now()
                return;
            }
            
            if(Date.now() - StartTime > 1000)
                return;
        }
    }
    
    RunItem()
    {
        
        var LastItem = DApps.Accounts.GetLastBlockNumItem();
        if(!LastItem)
        {
            if(SERVER.GetMaxNumBlockDB() < BLOCK_PROCESSING_LENGTH2)
                return 0;
            
            return this.DoBlock(1);
        }
        
        var PrevBlockNum = LastItem.BlockNum;
        var NextBlockNum = PrevBlockNum + 1;
        var Block = SERVER.ReadBlockHeaderDB(NextBlockNum);
        if(!Block)
            return 0;
        
        return this.DoBlock(NextBlockNum, Block.PrevSumHash, LastItem.HashData);
    }
    
    DoBlock(BlockNum, CheckSumHash, LastHashData)
    {
        var PrevBlockNum = BlockNum - 1;
        if(global.glStopTxProcessNum && BlockNum >= global.glStopTxProcessNum)
        {
            if(global.WasStopTxProcessNum !== BlockNum)
                ToErrorTx("--------------------------------Stop TX AT NUM: " + BlockNum)
            global.WasStopTxProcessNum = BlockNum
            return 0;
        }
        
        if(BlockNum >= BLOCK_PROCESSING_LENGTH2 && PrevBlockNum && LastHashData)
        {
            if(!IsEqArr(LastHashData.SumHash, CheckSumHash))
            {
                ToErrorTx("SumHash:DeleteTX on Block=" + PrevBlockNum, 5)
                
                BlockDeleteTX(PrevBlockNum)
                return 0;
            }
            
            var AccHash = DApps.Accounts.GetCalcHash();
            if(!IsEqArr(LastHashData.AccHash, AccHash))
            {
                ToErrorTx("AccHash:DeleteTX on Block=" + PrevBlockNum, 3)
                
                this.ErrorAccHash++
                BlockDeleteTX(PrevBlockNum)
                return 0;
            }
        }
        
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(!Block)
            return 0;
        
        if(CheckSumHash && !IsEqArr(Block.PrevSumHash, CheckSumHash))
        {
            ToErrorTx("DB was rewrited on Block=" + BlockNum, 2)
            return 0;
        }
        
        if(Block.BlockNum !== BlockNum)
        {
            ToLogOne("Error read block on " + BlockNum)
            return 0;
        }
        
        this.ErrorAccHash = 0
        
        if(BlockNum % 100000 === 0 || bShowDetail)
            ToErrorTx("CALC: " + BlockNum)
        
        SERVER.BlockProcessTX(Block)
        
        return 1;
    }
};

function BlockDeleteTX(BlockNum)
{
    SERVER.BlockDeleteTX({BlockNum:BlockNum});
}

function CheckActDB()
{
    if(!SERVER)
        return;
    
    SERVER.Close();
    
    var DBAct = DApps.Accounts.DBAct;
    var MaxNum = DBAct.GetMaxNum();
    var Num = MaxNum - 100;
    if(Num < 0)
        Num = 0;
    var Item = DBAct.Read(Num);
    if(!Item)
        return;
    ToErrorTx("Check " + Item.BlockNum, 5);
    while(1)
    {
        var Item = DBAct.Read(Num);
        if(!Item)
            return;
        
        if(Item.Mode === 200)
        {
            Item.HashData = DApps.Accounts.GetActHashesFromBuffer(Item.PrevValue.Data);
            if(Item)
            {
                var Block = SERVER.ReadBlockHeaderDB(Item.BlockNum);
                if(!Block)
                    return;
                if(!IsEqArr(Block.SumHash, Item.HashData.SumHash))
                {
                    ToErrorTx("Error SumHash on BlockNum=" + Item.BlockNum, 4);
                    ReWriteDAppTransactions({StartNum:Item.BlockNum}, 1);
                    
                    return;
                }
            }
        }
        
        Num++;
    }
}

var TxProcess = new CTXProcess();

setInterval(function ()
{
    if(SERVER)
    {
        SERVER.Close();
    }
    
    TxProcess.Run();
}
, 50);

setInterval(function ()
{
    CheckActDB();
}
, 60 * 1000);
