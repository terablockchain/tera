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

require("./common-event");

var BufHashTree = new RBTree(CompareArr);
BufHashTree.LastAddNum = 0;

const CDBResult = require("../jinn/tera/db/tera-db-result.js");
global.DB_RESULT = new CDBResult();


function REWRITE_DAPP_TRANSACTIONS(Length)
{
    if(!TX_PROCESS.Worker)
        return 0;
    if(!Length)
        return 0;
    
    var LastBlockNum = JOURNAL_DB.GetLastBlockNumAct();
    var StartNum = LastBlockNum - Length + 1;
    
    if(StartNum < 0)
        StartNum = 0;
    var EndNum = SERVER.BlockNumDB;
    if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
        global.TX_PROCESS.RunRPC("ReWriteDAppTransactions", {StartNum:StartNum, EndNum:EndNum});
    
    return 1;
}

function GET_DAPP_TRANSACTIONS(Block)
{
    
    var Arr = [];
    
    // vblock with cross-tx
    
    var Arr1 = SERVER.DoCreateCrossArr(Block);
    if(Arr1)
    {
        for(var i = 0; i < Arr1.length; i++)
            Arr.push(Arr1[i]);
    }
    
    // hash-checksum of account balances
    var Tx2 = ACCOUNTS.GetAccountHashTx(Block.BlockNum);
    if(Tx2)
    {
        Arr.push(Tx2);
    }
    
    return Arr;
}


function BLOCK_PROCESS_TX(Block)
{
    var BlockNum = Block.BlockNum;
    if(typeof BlockNum !== "number" || BlockNum <= 0)
        return;
    
    if(BlockNum === 1)
    {
        ToLog("=FIRST GENESIS BLOCK=");
        COMMON_ACTS.ClearDataBase();
    }
    
    BlockTruncate(BlockNum);
    
    var COUNT_MEM_BLOCKS = 0;
    var NUM1 = 1240000;
    var NUM2 = 1400000;
    
    if(BlockNum > global.BLOCKNUM_TICKET_ALGO)
    {
        NUM1 = 1000000000000;
        NUM2 = 1000000000000;
    }
    
    if(BlockNum > NUM1)
    {
        COUNT_MEM_BLOCKS = 1;
        if(BlockNum > NUM2)
            COUNT_MEM_BLOCKS = 60;
        if(BufHashTree.LastAddNum !== BlockNum - 1)
        {
            BufHashTree.clear();
            for(var num = COUNT_MEM_BLOCKS; num >= 1; num--)
            {
                var Block2 = SERVER.ReadBlockDB(BlockNum - num);
                if(Block2)
                {
                    AddBlockToHashTree(Block2);
                }
            }
        }
    }
    
    for(var key in DApps)
    {
        DApps[key].OnProcessBlockStart(Block);
    }
    
    START_BLOCK();
    var arrContentResult = [];
    
    var arr = Block.arrContent;
    for(var TxNum = 0; arr && TxNum < arr.length; TxNum++)
    {
        var Body = arr[TxNum];
        var HASH = sha3(Body, 37);
        
        if(BufHashTree.find(HASH))
        {
            continue;
        }
        var type = Body[0];
        var App = DAppByType[type];
        if(App)
        {
            SetCurTrackItem(HASH);
            var SetResult = RunOneTX(App, Block, Body, BlockNum, TxNum);
            arrContentResult[TxNum] = SetResult;
            if(App.CrossRunArr)
            {
                var Arr = App.CrossRunArr;
                for(var r = 0; r < Arr.length; r++)
                {
                    var Item = Arr[r];
                    RunOneTX(App, Block, Item, BlockNum, TxNum, 1);
                }
            }
        }
    }
    
    if(COUNT_MEM_BLOCKS)
    {
        var Block2 = SERVER.ReadBlockDB(BlockNum - COUNT_MEM_BLOCKS);
        if(Block2)
            DeleteBlockFromHashTree(Block2);
        
        AddBlockToHashTree(Block);
    }
    
    if(arrContentResult.length)
    {
        DB_RESULT.WriteBodyResult(BlockNum, arrContentResult);
    }
    
    for(var key in DApps)
    {
        DApps[key].OnProcessBlockFinish(Block);
    }
    
    FINISH_BLOCK();
}

function RunOneTX(App,Block,Tx,BlockNum,TxNum,bCrossRun)
{
    App.ResultTx = undefined;
    App.CrossRunArr = undefined;
    
    BEGIN_TRANSACTION();
    var Result;
    try
    {
        if(bCrossRun)
            Result = App.RunCrossTX(Block, Tx, BlockNum, TxNum);
        else
            Result = App.OnProcessTransaction(Block, Tx, BlockNum, TxNum);
    }
    catch(e)
    {
        Result = "" + e;
        if(LOG_LEVEL >= 3 && (global.WATCHDOG_DEV || global.DEV_MODE))
        {
            if(e.stack)
                ToLogStack("\n" + e.stack, "BlockNum :" + BlockNum + ":" + e);
        }
    }
    
    var SetResult;
    if(Result === true)
        SetResult = 1;
    else
        SetResult = 0;
    
    if(Result === true)
    {
        if(typeof App.ResultTx === "number")
            SetResult = App.ResultTx;
        if(!COMMIT_TRANSACTION(BlockNum, TxNum))
            SetResult = 0;
    }
    else
    {
        ToLogTx("THROW on Block=" + BlockNum + " TxNum=" + TxNum + " : " + Result, global.DEV_MODE ? 4 : 5);
        ROLLBACK_TRANSACTION();
        SetResult = 0;
    }
    
    if(!bCrossRun)
        SendTrackResult(Block, TxNum, Tx, SetResult, Result);
    
    return SetResult;
}

global.BLOCK_DELETE_TX = function (BlockNum)
{
    BlockRestore(BlockNum);
    BlockTruncate(BlockNum);
    
    return 0;
}

function BlockRestore(BlockNum)
{
    JOURNAL_DB.RestoreFromJournalAtNum(BlockNum, 0);
}

function BlockTruncate(BlockNum)
{
    for(var key in DApps)
    {
        DApps[key].OnDeleteBlock(BlockNum);
    }
    
    DB_RESULT.DeleteFromBlock(BlockNum);
}


function AddBlockToHashTree(Block)
{
    BufHashTree.LastAddNum = Block.BlockNum;
    var arr = Block.arrContent;
    if(arr)
    {
        for(var i = 0; i < arr.length; i++)
        {
            var HASH = sha3(arr[i], 35);
            BufHashTree.insert(HASH);
        }
    }
}
function DeleteBlockFromHashTree(Block)
{
    var arr = Block.arrContent;
    if(arr)
    {
        for(var i = 0; i < arr.length; i++)
        {
            var HASH = sha3(arr[i], 36);
            BufHashTree.remove(HASH);
        }
    }
}

function GetVerifyTransaction(Block,TrNum)
{
    DB_RESULT.CheckLoadResult(Block);
    
    if(Block.VersionBody === 1 && Block.arrContentResult.length > TrNum)
    {
        return Block.arrContentResult[TrNum];
    }
    return undefined;
}

global.BLOCK_PROCESS_TX = BLOCK_PROCESS_TX;
global.REWRITE_DAPP_TRANSACTIONS = REWRITE_DAPP_TRANSACTIONS;
global.GET_DAPP_TRANSACTIONS = GET_DAPP_TRANSACTIONS;
global.GetVerifyTransaction = GetVerifyTransaction;

