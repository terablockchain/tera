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

//Structure for storing the results of transactions in memory until the block is generally committed


var ListTRDB = {};
global.GET_TR_DB = function (Num)
{
    return ListTRDB[Num];
}

global.REGISTER_TR_DB = function (DB,Num)
{
    
    if(!Num)
        throw "REGISTER_TR_DB: Error Num=" + Num;
    
    if(ListTRDB[Num])
        throw "Not unique Num=" + Num;
    
    ListTRDB[Num] = DB;
}

function BeginTransactionDB(Name)
{
    
    for(var key in ListTRDB)
        ListTRDB[key].BeginTR(Name);
}

function CommitTransactionDB(Name,CheckPoint)
{
    
    if(CheckPoint)
    {
        JOURNAL_DB.StartInitBuffer();
        
        for(var key in ListTRDB)
            ListTRDB[key].CommitTR(Name, CheckPoint,  + key);
        
        JOURNAL_DB.WriteJournalToFile(CheckPoint.BlockNumStart, CheckPoint.BlockFinish);
    }
    
    for(var key in ListTRDB)
        ListTRDB[key].CommitTR(Name);
}

function RollbackTransactionDB(Name)
{
    
    for(var key in ListTRDB)
        ListTRDB[key].RollbackTR(Name);
}

function ClearTransactionDB()
{
    for(var key in ListTRDB)
        ListTRDB[key].ClearAllTR();
}


var BlockChanges;
var SetRollBackTransaction = 0;
global.GET_TR_CHANGES = function ()
{
    return BlockChanges;
}

global.START_BLOCK = function ()
{
    SetRollBackTransaction = 0;
    BeginTransactionDB("Block");
    if(global.JOURNAL_NEW_MODE)
        return;
    
    BlockChanges = {BlockMap:{}, BlockMaxAccount:ACCOUNTS.GetMaxAccount(), BlockHistory:[], BlockEvent:[], };
}
global.BEGIN_TRANSACTION = function ()
{
    BeginTransactionDB("TX");
    SetTickCounter(35000);
    
    SetRollBackTransaction = 0;
    if(global.JOURNAL_NEW_MODE)
        return;
    
    BlockChanges.TRMap = {};
    BlockChanges.TRMaxAccount = BlockChanges.BlockMaxAccount;
    BlockChanges.TREvent = [];
    BlockChanges.TRHistory = [];
}

global.ROLLBACK_TRANSACTION = function ()
{
    if(SetRollBackTransaction)
        throw "Was ROLLBACK_TRANSACTION in TR";
    
    RollbackTransactionDB("TX");
    
    SetRollBackTransaction = 1;
}

global.COMMIT_TRANSACTION = function (BlockNum,TrNum)
{
    if(SetRollBackTransaction)
        return false;
    
    CommitTransactionDB("TX");
    
    if(global.JOURNAL_NEW_MODE)
        return true;
    BlockChanges.BlockMaxAccount = BlockChanges.TRMaxAccount;
    for(var key in BlockChanges.TRMap)
    {
        key = ParseNum(key);
        var Data = BlockChanges.TRMap[key];
        if(Data.Changed)
        {
            BlockChanges.BlockMap[key] = Data;
            if(Data.New)
                ACCOUNTS.OnWriteNewAccountTR(Data, BlockNum, TrNum);
        }
    }
    
    AddCopyBlockChangesArrs("History");
    AddCopyBlockChangesArrs("Event");
    
    SetTickCounter(0);
    return true;
}

global.IS_ROLLBACK_TRANSACTION = function ()
{
    return SetRollBackTransaction;
}

function AddCopyBlockChangesArrs(Name)
{
    var ArrSrc = BlockChanges["TR" + Name];
    var ArrDst = BlockChanges["Block" + Name];
    for(var i = 0; i < ArrSrc.length; i++)
    {
        ArrDst.push(ArrSrc[i]);
    }
}

global.FINISH_BLOCK = function ()
{
    CommitTransactionDB("Block");
    
    SetTickCounter(0);
    BlockChanges = undefined;
}

global.CLEAR_ALL_TR_BUFFER = function ()
{
    
    ClearTransactionDB();
}

global.BeginTransactionDB = BeginTransactionDB;
global.CommitTransactionDB = CommitTransactionDB;
global.RollbackTransactionDB = RollbackTransactionDB;
