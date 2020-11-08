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

var BufHashTree = new RBTree(CompareArr);
BufHashTree.LastAddNum = 0;


function REWRITE_DAPP_TRANSACTIONS(Length)
{
    if(!TX_PROCESS.Worker)
        return 0;
    if(!Length)
        return 0;
    
    var LastBlockNum = COMMON_ACTS.GetLastBlockNumAct();
    var StartNum = LastBlockNum - Length + 1;
    
    if(StartNum < 0)
        StartNum = 0;
    var EndNum = SERVER.BlockNumDB;
    
    var MinBlock = COMMON_ACTS.GetMinBlockAct();
    if(MinBlock > StartNum)
    {
        ToLog("Cant rewrite transactions. Very long length of the rewriting chain. Max length=" + (SERVER.BlockNumDB - MinBlock));
        return 0;
    }
    if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
        global.TX_PROCESS.RunRPC("ReWriteDAppTransactions", {StartNum:StartNum, EndNum:EndNum});
    
    return 1;
}

function GET_DAPP_TRANSACTIONS(BlockNum)
{
    var Arr = SHARDS.GetCrossTxArray(BlockNum);
    var Tx = ACCOUNTS.GetAccountHashTx(BlockNum);
    if(Tx)
    {
        Arr.push(Tx);
    }
    
    return Arr;
}


function BLOCK_PROCESS_TX(Block)
{
    var BlockNum = Block.BlockNum;
    if(!BlockNum || BlockNum <= 0)
        return;
    
    BLOCK_DELETE_TX(BlockNum);
    
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
    
    var SetResult;
    var arr = Block.arrContent;
    for(var i = 0; arr && i < arr.length; i++)
    {
        var HASH = sha3(arr[i], 37);
        
        if(BufHashTree.find(HASH))
        {
            continue;
        }
        
        var type = arr[i][0];
        var App = DAppByType[type];
        if(App)
        {
            App.ResultTx = undefined;
            BEGIN_TRANSACTION();
            var StrHex = GetHexFromArr(HASH);
            var item;
            global.CurTrItem = undefined;
            if(global.TreeFindTX)
            {
                item = global.TreeFindTX.LoadValue(StrHex);
                if(item)
                    global.CurTrItem = item.TX;
            }
            
            var Result = App.OnProcessTransaction(Block, arr[i], BlockNum, i);
            if(Result === true)
                SetResult = 1;
            else
                SetResult = 0;
            
            if(Result === true)
            {
                if(typeof App.ResultTx === "number")
                    SetResult = App.ResultTx;
                if(!COMMIT_TRANSACTION(BlockNum, i))
                    SetResult = 0;
            }
            else
            {
                ToLogTx("Block: " + BlockNum + " TxNum:" + i + " Err Result: " + Result, 3);
                
                ROLLBACK_TRANSACTION();
                SetResult = 0;
            }
            arrContentResult[i] = SetResult;
            
            if(item)
            {
                var ResultStr = Result;
                if(Result === true || typeof Result === "number")
                {
                    ResultStr = "Add to blockchain on Block " + BlockNum;
                    if(type === global.TYPE_TRANSACTION_FILE)
                        ResultStr += ": file/" + BlockNum + "/" + i;
                }
                item.cmd = "RetFindTX";
                item.ResultStr = "" + ResultStr;
                item.bFinal = 1;
                item.Result = SetResult;
                process.send(item);
            }
            global.CurTrItem = undefined;
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
        Engine.DBResult.WriteBodyResult(BlockNum, arrContentResult);
    }
    
    for(var key in DApps)
    {
        DApps[key].OnProcessBlockFinish(Block);
    }
    COMMON_ACTS.WriteMode200(Block);
    
    FINISH_BLOCK();
}

function BLOCK_DELETE_TX(BlockNum)
{
    
    COMMON_ACTS.MoveActToStates(BlockNum);
    for(var key in DApps)
    {
        DApps[key].OnDeleteBlock(BlockNum);
    }
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

global.BLOCK_PROCESS_TX = BLOCK_PROCESS_TX;
global.BLOCK_DELETE_TX = BLOCK_DELETE_TX;

global.REWRITE_DAPP_TRANSACTIONS = REWRITE_DAPP_TRANSACTIONS;
global.GET_DAPP_TRANSACTIONS = GET_DAPP_TRANSACTIONS;
