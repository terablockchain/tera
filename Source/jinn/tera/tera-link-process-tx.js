/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
module.exports.Init = Init;

function Init(Engine)
{
    SERVER.BufHashTree = new RBTree(CompareArr);
    SERVER.BufHashTree.LastAddNum = 0;
    
    SERVER.AddBlockToHashTree = function (Block)
    {
        SERVER.BufHashTree.LastAddNum = Block.BlockNum;
        var arr = Block.arrContent;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = sha3(arr[i], 35);
                SERVER.BufHashTree.insert(HASH);
            }
        }
    };
    SERVER.DeleteBlockFromHashTree = function (Block)
    {
        var arr = Block.arrContent;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = sha3(arr[i], 36);
                SERVER.BufHashTree.remove(HASH);
            }
        }
    };
    
    SERVER.BlockProcessTX = function (Block)
    {
        var BlockNum = Block.BlockNum;
        if(!BlockNum || BlockNum <= 0)
            return;
        
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
            
            if(SERVER.BufHashTree.LastAddNum !== BlockNum - 1)
            {
                SERVER.BufHashTree.clear();
                for(var num = COUNT_MEM_BLOCKS; num >= 1; num--)
                {
                    var Block2 = SERVER.ReadBlockDB(BlockNum - num);
                    if(Block2)
                    {
                        SERVER.AddBlockToHashTree(Block2);
                    }
                }
            }
        }
        
        for(var key in DApps)
        {
            DApps[key].OnProcessBlockStart(Block);
        }
        
        var arrContentResult = [];
        
        var arr = Block.arrContent;
        for(var i = 0; arr && i < arr.length; i++)
        {
            var HASH = sha3(arr[i], 37);
            
            if(SERVER.BufHashTree.find(HASH))
            {
                continue;
            }
            
            var type = arr[i][0];
            var App = DAppByType[type];
            if(App)
            {
                App.ResultTx = 0;
                DApps.Accounts.BeginTransaction();
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
                var SetResult = Result;
                if(Result === true)
                {
                    if(App.ResultTx)
                        SetResult = App.ResultTx;
                    if(!DApps.Accounts.CommitTransaction(BlockNum, i))
                        SetResult = 0;
                }
                else
                {
                    ToLogTx("Block: " + BlockNum + " TxNum:" + i + " Err Result: " + Result, 4);
                    
                    DApps.Accounts.RollBackTransaction();
                    SetResult = 0;
                }
                if(SetResult === true)
                    SetResult = 1;
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
                SERVER.DeleteBlockFromHashTree(Block2);
            
            SERVER.AddBlockToHashTree(Block);
        }
        if(arrContentResult.length)
        {
            Engine.DBResult.WriteBodyResult(BlockNum, arrContentResult);
        }
        
        for(var key in DApps)
        {
            DApps[key].OnProcessBlockFinish(Block);
        }
    };
    
    SERVER.BlockDeleteTX = function (Block)
    {
        SERVER.BufHashTree.LastAddNum = 0;
        
        for(var key in DApps)
        {
            DApps[key].OnDeleteBlock(Block);
        }
    };
    
    SERVER.IsValidTransaction = function (Tr,BlockNum)
    {
        if(!Tr.body || Tr.body.length < MIN_TRANSACTION_SIZE || Tr.body.length > MAX_TRANSACTION_SIZE)
            return  - 1;
        
        SERVER.CheckCreateTransactionObject(Tr, 0, BlockNum);
        if(Tr.power - Math.log2(Tr.body.length / 128) < MIN_POWER_POW_TR)
            return  - 2;
        if(Tr.num !== BlockNum)
            return  - 3;
        if(Tr.body[0] === TYPE_TRANSACTION_ACC_HASH)
            return  - 4;
        
        return 1;
    };
    
    SERVER.ReWriteDAppTransactions = function (Length)
    {
        if(!TX_PROCESS.Worker)
            return 0;
        if(!Length)
            return 0;
        
        var LastBlockNum = DApps.Accounts.GetLastBlockNumAct();
        var StartNum = LastBlockNum - Length + 1;
        
        if(StartNum < 0)
            StartNum = 0;
        var EndNum = SERVER.BlockNumDB;
        
        var MinBlock = DApps.Accounts.GetMinBlockAct();
        if(MinBlock > StartNum)
        {
            ToLog("Cant rewrite transactions. Very long length of the rewriting chain. Max length=" + (SERVER.BlockNumDB - MinBlock));
            return 0;
        }
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ReWriteDAppTransactions", {StartNum:StartNum, EndNum:EndNum});
        
        return 1;
    };
    
    SERVER.GetDAppTransactions = function (BlockNum)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return undefined;
        
        var BlockNumHash = BlockNum - PERIOD_ACCOUNT_HASH;
        if(BlockNumHash < 0)
            return undefined;
        
        var Item = DApps.Accounts.GetAccountHashItem(BlockNumHash);
        if(Item)
        {
            var Body = [TYPE_TRANSACTION_ACC_HASH];
            WriteUintToArr(Body, BlockNumHash);
            WriteArrToArr(Body, Item.AccHash, 32);
            if(BlockNumHash >= START_BLOCK_ACCOUNT_HASH3)
            {
                WriteUintToArr(Body, Item.AccountMax);
                WriteArrToArr(Body, Item.SmartHash, 32);
                WriteUintToArr(Body, Item.SmartCount);
                WriteUintToArr(Body, BlockNum);
                WriteUintToArr(Body, 0);
            }
            
            var Tx = {body:Body};
            return Tx;
        }
        return undefined;
    };
    
    SERVER.AddTransactionOwn = function (Tr)
    {
        var Result = SERVER.AddTransaction(Tr, 1);
        if(Result > 0 && global.TX_PROCESS.Worker)
        {
            var StrHex = GetHexFromArr(sha3(Tr.body, 38));
            global.TX_PROCESS.Worker.send({cmd:"FindTX", TX:StrHex});
        }
        
        return Result;
    };
}
