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
    ToLog("Start num = 0", 2);
}

global.RewriteAllTransactions = RewriteAllTransactions;
function RewriteAllTransactions(bSilent)
{
    
    var StateTX = DApps.Accounts.DBStateTX.Read(0);
    var MinimalValidBlock = StateTX.BlockNumMin;
    if(MinimalValidBlock > 0)
    {
        if(!bSilent)
            ToLog("*************Cant run RewriteAllTransactions, MinimalValidBlock:" + MinimalValidBlock, 2);
        return 0;
    }
    
    if(!bSilent)
        ToLog("*************RewriteAllTransactions");
    
    ClearDataBase();
    return 1;
}

global.ReWriteDAppTransactions = ReWriteDAppTransactions;
function ReWriteDAppTransactions(Params,bSilent)
{
    StopTxProcess = 0;
    
    var StartNum = Params.StartNum;
    var EndNum = Params.EndNum;
    if(!bSilent)
        ToLog("ReWriteDAppTransactions: " + StartNum + " - " + EndNum);
    
    while(1)
    {
        var LastBlockNum = DApps.Accounts.GetLastBlockNumAct();
        if(LastBlockNum <= 0)
        {
            ToLog("Find LastBlockNum=" + LastBlockNum);
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
    
    ToLog("Start num = " + StartNum, 2);
    
    DApps.Accounts.ErrSumHashCount = 0;
}





class CTXProcess
{
    constructor()
    {
        
        var LastBlockNum = DApps.Accounts.GetLastBlockNumAct();
        ToLog("Init CTXProcess: " + LastBlockNum)
        
        ReWriteDAppTransactions({StartNum:LastBlockNum - 10, EndNum:LastBlockNum}, 1)
        
        this.ErrorAccHash = 0
        this.TimeWait = 0
    }
    
    CheckError()
    {
        if(DApps.Accounts.ErrSumHashCount >= 1000)
        {
            if(!this.WasSetRecalc)
                setTimeout(function ()
                {
                    ToLog("#SUMHASH: Recalc Mercle Trr. Err count=" + DApps.Accounts.ErrSumHashCount)
                    DApps.Accounts.CalcMerkleTree(1)
                }, 2000)
            this.WasSetRecalc = 1
            return 0;
        }
        else
        {
            this.WasSetRecalc = 0
            return 1;
        }
    }
    Run()
    {
        if(StopTxProcess)
            return;
        
        if(!this.CheckError())
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
            this.ErrorAccHash = 0
            ToLog("FORCE CalcMerkleTree")
            DApps.Accounts.CalcMerkleTree(1)
            return;
        }
        
        var StateTX = DApps.Accounts.DBStateTX.Read(0);
        var MinimalValidBlock = StateTX.BlockNumMin;
        
        for(var i = 0; i < 500; i++)
        {
            var Result = this.RunItem(MinimalValidBlock);
            if(!Result)
            {
                this.TimeWait = Date.now()
                return;
            }
            
            if(Date.now() - StartTime > 1000)
                return;
        }
    }
    
    RunItem(MinimalValidBlock)
    {
        
        var LastItem = DApps.Accounts.GetLastBlockNumItem();
        if(!LastItem)
        {
            if(SERVER.GetMaxNumBlockDB() < BLOCK_PROCESSING_LENGTH2)
                return 0;
            
            var NextBlockNum = MinimalValidBlock;
            if(NextBlockNum <= 0)
                NextBlockNum = 1
            return this.DoBlock(NextBlockNum, 0, ZERO_ARR_32, undefined, 1);
        }
        
        var PrevBlockNum = LastItem.BlockNum;
        var NextBlockNum = PrevBlockNum + 1;
        var PrevBlock = SERVER.ReadBlockHeaderDB(PrevBlockNum);
        if(!PrevBlock)
        {
            if(bShowDetail)
                ToLog("Block:DeleteTX on Block=" + PrevBlockNum)
            BlockDeleteTX(PrevBlockNum)
            return 0;
        }
        
        var ForcePrevSumHash;
        if(NextBlockNum < MinimalValidBlock + BLOCK_PROCESSING_LENGTH2)
            ForcePrevSumHash = 1
        
        return this.DoBlock(NextBlockNum, PrevBlockNum, PrevBlock.SumHash, LastItem.HashData, ForcePrevSumHash);
    }
    
    DoBlock(BlockNum, PrevBlockNum, PrevSumHash, PrevHashData, ForcePrevSumHash)
    {
        if(global.glStopTxProcessNum && BlockNum >= global.glStopTxProcessNum)
        {
            if(global.WasStopTxProcessNum !== BlockNum)
                ToLog("--------------------------------Stop TX AT NUM: " + BlockNum)
            global.WasStopTxProcessNum = BlockNum
            return 0;
        }
        
        if(!ForcePrevSumHash && PrevBlockNum && PrevHashData)
        {
            if(!IsEqArr(PrevHashData.SumHash, PrevSumHash))
            {
                if(bShowDetail)
                    ToLog("SumHash:DeleteTX on Block=" + PrevBlockNum, 2)
                
                BlockDeleteTX(PrevBlockNum)
                return 0;
            }
            
            var AccHash = DApps.Accounts.GetCalcHash();
            if(!IsEqArr(PrevHashData.AccHash, AccHash))
            {
                ToLog("AccHash:DeleteTX on Block=" + PrevBlockNum, 2)
                
                this.ErrorAccHash++
                BlockDeleteTX(PrevBlockNum)
                return 0;
            }
        }
        
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(!Block)
            return 0;
        
        if(Block.BlockNum !== BlockNum)
        {
            ToLogOne("Error read block on " + BlockNum)
            return 0;
        }
        
        Block.PrevSumHash = PrevSumHash
        
        this.ErrorAccHash = 0
        Block.NoChechkSumHash = ForcePrevSumHash
        Block.ForcePrevSumHash = ForcePrevSumHash
        
        if(BlockNum % 100000 === 0 || bShowDetail)
            ToLog("CALC: " + BlockNum)
        
        SERVER.BlockProcessTX(Block)
        
        return 1;
    }
};

function BlockDeleteTX(BlockNum)
{
    SERVER.BlockDeleteTX({BlockNum:BlockNum});
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
