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

global.PROCESS_NAME = "TX";

const crypto = require('crypto');
const fs = require('fs');

require("../core/constant");
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
require("../core/library");

global.READ_ONLY_DB = 0;

global.TEST_ACC_HASH_MODE = 0;
var PathTestHash3 = GetDataPath("DB/accounts-hash3-test");
if(fs.existsSync(PathTestHash3))
{
    global.TEST_ACC_HASH_MODE = 1;
    ToLog("--------------------------");
    ToLog("===TEST_ACC_HASH_MOD ON===");
    ToLog("--------------------------");
}

var JinnLib = require("../jinn/tera");
var Map = {"Block":1, "BlockDB":1, "Log":1, };
JinnLib.Create(Map);

require("../system");
require("./child-process");

require("./tx-process-util");

global.TreeFindTX = new STreeBuffer(30 * 1000, CompareItemHashSimple, "string");

process.on('message', function (msg)
{
    switch(msg.cmd)
    {
        // case "FindTX":
        //     console.log("FindTX",JSON.stringify(msg,"",4));
        //     global.TreeFindTX.SaveValue(msg.TX, msg);
        //     break;
        case "SetSmartEvent":
            //console.log("Smart:" + msg.Smart);
            global.TreeFindTX.SaveValue("Smart:" + msg.Smart, 1);
            break;
            
        default:
            break;
    }
});

global.SetFindTX=function(Params,F)
{
    //console.log("SetFindTX",JSON.stringify(Params,"",4));
    Params.F=F;
    global.TreeFindTX.SaveValue(Params.TX, Params);
};

setInterval(PrepareStatEverySecond, 1000);

global.SetStatMode = function (Val)
{
    global.STAT_MODE = Val;
    return global.STAT_MODE;
};



global.bShowDetail = 0;
global.StopTxProcess = 0;


global.ClearDataBase = ClearDataBase;
function ClearDataBase()
{
    ToLogTx("=Dapps ClearDataBase=", 2);
    
    CLEAR_ALL_TR_BUFFER();
    COMMON_ACTS.ClearDataBase();
}

global.RewriteAllTransactions = RewriteAllTransactions;
function RewriteAllTransactions(bSilent)
{
    ToLogTx("*************RewriteAllTransactions");
    
    ClearDataBase();
    return 1;
}

global.ReWriteDAppTransactions = ReWriteDAppTransactions;
function ReWriteDAppTransactions(Params,bSilent)
{
    StopTxProcess = 0;
    var StartNum = Params.StartNum;
    
    ToLogTx("ReWriteDAppTransactions from: " + StartNum);
    
    ACCOUNTS.BadBlockNumChecked = SERVER.GetMaxNumBlockDB() - 1;
    ACCOUNTS.BadBlockNumHash = 0;
    
    CLEAR_ALL_TR_BUFFER();
    
    global.TR_DATABUF_COUNTER = 0;
    
    while(1)
    {
        var LastBlockNum = JOURNAL_DB.GetLastBlockNumAct();
        if(LastBlockNum < StartNum)
            break;
        if(LastBlockNum <= 0)
        {
            ToLogTrace("STOP ReWriteDAppTransactions. Find LastBlockNum=" + LastBlockNum);
            RewriteAllTransactions(1);
        }
        
        DeleteLastBlockTx();
    }
}

function DeleteLastBlockTx()
{
    var LastBlockNum = JOURNAL_DB.GetLastBlockNumAct();
    if(LastBlockNum > 0)
    {
        BLOCK_DELETE_TX(LastBlockNum);
    }
}



var ErrorInitCount = 0;
class CTXProcess
{
    constructor()
    {
        var LastItem = JOURNAL_DB.GetLastBlockNumItem();
        var JMaxNum = JOURNAL_DB.GetMaxNum();
        var AccountLastNum = ACCOUNTS.DBState.GetMaxNum();
        if(!LastItem && (AccountLastNum > 16 || JMaxNum !==  - 1))
        {
            ToLogTx("Error Init CTXProcess  AccountLastNum=" + AccountLastNum + "  JMaxNum=" + JMaxNum)
            ErrorInitCount++
            
            if(JMaxNum !==  - 1)
            {
                ToLogTx("Delete jrow at: " + JMaxNum)
                JOURNAL_DB.DBJournal.DeleteFromNum(JMaxNum)
            }
            
            return;
        }
        var LastBlockNum = 0;
        if(LastItem)
            LastBlockNum = LastItem.BlockNum
        
        ErrorInitCount = 0
        
        ToLogTx("Init CTXProcess: " + LastBlockNum)
        
        if(LastBlockNum > 0)
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
        if(this.ErrorAccHash >= 1000)
        {
            ToLogTx("FORCE CalcMerkleTree")
            ACCOUNTS.CalcMerkleTree(1)
            this.ErrorAccHash = 0
            return;
        }
        
        global.TR_DATABUF_COUNTER = 0
        
        for(var i = 0; i < 1000; i++)
        {
            BeginTransactionDB("Chain")
            var ResultBlock = this.RunItem();
            
            if(!ResultBlock || typeof ResultBlock === "number")
            {
                RollbackTransactionDB("Chain")
                this.TimeWait = Date.now()
                
                if(!ResultBlock)
                {
                }
                else
                    if(ResultBlock < 0)
                    {
                        DeleteLastBlockTx()
                    }
                
                if(ResultBlock ===  - 2)
                {
                    continue;
                }
                
                break;
            }
            
            CommitTransactionDB("Chain", {BlockNumStart:ResultBlock.BlockNum, BlockFinish:ResultBlock})
            
            if(Date.now() - StartTime > 1000)
                break;
            
            if(global.TR_DATABUF_COUNTER >= 20 * 1e6)
                break;
        }
    }
    
    RunItem()
    {
        var LastItem = JOURNAL_DB.GetLastBlockNumItem();
        if(!LastItem)
        {
            if(SERVER.GetMaxNumBlockDB() < BLOCK_PROCESSING_LENGTH2)
                return 0;
            
            var JMaxNum = JOURNAL_DB.GetMaxNum();
            if(JMaxNum >= 0)
            {
                ToLog("Detect run Error. JMaxNum=" + JMaxNum + " Need restart.")
                if(!this.StartRestart)
                {
                    setTimeout(function ()
                    {
                        Exit()
                    }, 10000)
                    this.StartRestart = 1
                }
                
                return 0;
            }
            
            return this.DoBlock(1);
        }
        
        var PrevBlockNum = LastItem.BlockNum;
        var NextBlockNum = PrevBlockNum + 1;
        var Block = SERVER.ReadBlockHeaderDB(NextBlockNum);
        if(!Block)
            return 0;
        
        return this.DoBlock(NextBlockNum, Block.PrevSumHash, LastItem);
    }
    
    DoBlock(BlockNum, CheckSumHash, LastHashData)
    {
        var PrevBlockNum = BlockNum - 1;
        if(global.glStopTxProcessNum && BlockNum >= global.glStopTxProcessNum)
        {
            if(global.WasStopTxProcessNum !== BlockNum)
                ToLogTx("--------------------------------Stop TX AT NUM: " + BlockNum)
            global.WasStopTxProcessNum = BlockNum
            return 0;
        }
        
        if(BlockNum >= BLOCK_PROCESSING_LENGTH2 && PrevBlockNum)
        {
            if(!LastHashData)
            {
                ToLogTx("SumHash:!LastHashData : DeleteTX on Block=" + PrevBlockNum, 3)
                
                return  - 1;
            }
            
            if(!IsEqArr(LastHashData.SumHash, CheckSumHash))
            {
                ToLogTx("SumHash:DeleteTX on Block=" + PrevBlockNum, 4)
                
                return  - 2;
            }
            
            var AccHash = ACCOUNTS.GetCalcHash();
            if(!IsEqArr(LastHashData.AccHash, AccHash))
            {
                if(this.ErrorAccHash < 5)
                    ToLogTx("AccHash:DeleteTX on Block=" + PrevBlockNum + " GOT:" + GetHexFromArr(LastHashData.AccHash).substr(0, 8) + " NEED:" + GetHexFromArr(AccHash).substr(0,
                    8), 3)
                
                this.ErrorAccHash++
                
                return  - 3;
            }
        }
        
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(!Block)
            return 0;
        
        if(CheckSumHash && !IsEqArr(Block.PrevSumHash, CheckSumHash))
        {
            ToLogTx("DB was rewrited on Block=" + BlockNum, 2)
            return 0;
        }
        
        if(Block.BlockNum !== BlockNum)
        {
            ToLogOne("Error read block on " + BlockNum)
            return 0;
        }
        
        this.ErrorAccHash = 0
        
        if(BlockNum % 100000 === 0 || bShowDetail)
            ToLogTx("CALC: " + BlockNum)
        BLOCK_PROCESS_TX(Block)
        
        RunTestAccHash(BlockNum)
        
        return Block;
    }
}

global.OnBadAccountHash = function (BlockNum,BlockNumHash)
{
    var MinBlockNum = SERVER.GetMaxNumBlockDB() - 10000;
    if(MinBlockNum < 0)
        MinBlockNum = 0;
    if(ACCOUNTS.BadBlockNumChecked < MinBlockNum)
        ACCOUNTS.BadBlockNumChecked = MinBlockNum;
    
    if(BlockNum > ACCOUNTS.BadBlockNumChecked)
    {
        if(ACCOUNTS.BadBlockNum < BlockNum)
            ACCOUNTS.BadBlockNum = BlockNum;
        if(!ACCOUNTS.BadBlockNumHash || BlockNumHash < ACCOUNTS.BadBlockNumHash)
        {
            ACCOUNTS.BadBlockNumHash = BlockNumHash;
            
            ToLog("****FIND BAD ACCOUNT HASH IN BLOCK: " + BlockNumHash + " DO BLOCK=" + BlockNum, 3);
        }
    }
}

function CheckBadsBlock()
{
    if(ACCOUNTS.BadBlockNumHash)
    {
        var StartRewrite = ACCOUNTS.BadBlockNumHash - 2 * global.PERIOD_ACCOUNT_HASH - 1;
        
        if(StartRewrite < 0)
            StartRewrite = 0;
        ToLogTx("---CheckBadsBlock: Rewrite tx from BlockNum=" + StartRewrite, 3);
        
        ACCOUNTS.CalcMerkleTree(1);
        
        ReWriteDAppTransactions({StartNum:StartRewrite}, 1);
    }
}

var TxProcess = undefined;
var TX_RUN_PERIOD = 50;
function DoRunTXProcess()
{
    if(!TxProcess)
    {
        TxProcess = new CTXProcess();
        if(ErrorInitCount)
        {
            TxProcess = undefined;
        }
    }
    
    if(SERVER)
    {
        SERVER.RefreshAllDB();
    }
    
    if(TxProcess)
        TxProcess.Run();
    
    setTimeout(DoRunTXProcess, TX_RUN_PERIOD * (1 + 10 * ErrorInitCount));
}
setTimeout(DoRunTXProcess, 2000);

setInterval(function ()
{
    CheckBadsBlock();
}
, 60 * 1000);

function RunTestAccHash(BlockNum)
{
    if(global.TEST_ACC_HASH_MODE && BlockNum % PERIOD_ACCOUNT_HASH === 0)
    {
        var Item = ACCOUNTS.GetAccountHashItem(BlockNum);
        var ItemTest = ACCOUNTS.GetAccountHashItemTest(BlockNum);
        if(ItemTest)
        {
            if(!Item || CompareArr(Item.AccHash, ItemTest.AccHash) !== 0)
            {
                ToLog("======BADS COMPARE TEST ACCHASH TABLE on Block:" + BlockNum);
                
                if(!global.glStopTxProcessNum)
                    global.glStopTxProcessNum = BlockNum;
            }
        }
    }
}


//***************************************************************************
//Debug log
/*
global.DebugEvent=function (Obj,BlockNum,TrNum)
{
    console.log(BlockNum,":",TrNum,"Event:",Obj);
};
//global.glStopTxProcessNum=45582;

//***************************************************************************
//*/