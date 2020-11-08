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

var BlockChanges;
function START_BLOCK()
{
    BlockChanges = {BlockMap:{}, BlockMaxAccount:ACCOUNTS.GetMaxAccount(), BlockHistory:[], BlockEvent:[], BlockCrossMsg:[], BlockCrossRun:[],
    };
}
function BEGIN_TRANSACTION()
{
    SetTickCounter(35000);
    
    BlockChanges.RollBackTransaction = 0;
    BlockChanges.TRMap = {};
    BlockChanges.TRMaxAccount = BlockChanges.BlockMaxAccount;
    BlockChanges.TRHistory = [];
    BlockChanges.TREvent = [];
    BlockChanges.TRCrossMsg = [];
    BlockChanges.TRCrossRun = [];
}

function ROLLBACK_TRANSACTION()
{
    BlockChanges.RollBackTransaction = 1;
}

function COMMIT_TRANSACTION(BlockNum,TrNum)
{
    if(BlockChanges.RollBackTransaction)
        return false;
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
    AddCopyBlockChangesArrs("CrossMsg");
    AddCopyBlockChangesArrs("CrossRun");
    
    SetTickCounter(0);
    return true;
}

function IS_ROLLBACK_TRANSACTION()
{
    return BlockChanges.RollBackTransaction;
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

function GET_TR_CHANGES()
{
    return BlockChanges;
}

function FINISH_BLOCK()
{
    SetTickCounter(0);
    BlockChanges = undefined;
}

global.START_BLOCK = START_BLOCK;
global.BEGIN_TRANSACTION = BEGIN_TRANSACTION;
global.ROLLBACK_TRANSACTION = ROLLBACK_TRANSACTION;
global.COMMIT_TRANSACTION = COMMIT_TRANSACTION;
global.GET_TR_CHANGES = GET_TR_CHANGES;
global.FINISH_BLOCK = FINISH_BLOCK;
global.IS_ROLLBACK_TRANSACTION = IS_ROLLBACK_TRANSACTION;
