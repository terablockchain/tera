/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * The priority of the transaction when transferring between nodes
 *
 * This is the plan (approximate figures)
 * Every 10K Tera that is on the account gives the right to make one transaction every 100 blocks (5 minutes). Moreover, the higher the load, the more coins the higher the priority.
 * If the account has less than 10K Tera, then you can make one transaction only if the blockchain is low (less than 10 transactions per block).

**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"TxPriority"});


//Engine context
function InitClass(Engine)
{
    Engine.InitPriorityTree = function ()
    {
        Engine.SenderActTree = new RBTree(function (a,b)
        {
            return a.BlockNum - b.BlockNum;
        });
        Engine.SenderRestTree = new RBTree(function (a,b)
        {
            return a.SenderNum - b.SenderNum;
        });
    };
    Engine.PrepareLastStatFromDB = function (HeadBlockNum)
    {
        if(!JINN_CONST.TX_PRIORITY_MODE)
            return 0;
        
        if(!HeadBlockNum)
            HeadBlockNum = Engine.CurrentBlockNum - JINN_CONST.STEP_SAVE;
        if(HeadBlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            return 0;
        
        var Num = HeadBlockNum;
        var Count = 0;
        while(Count < JINN_CONST.TX_PRIORITY_LENGTH)
        {
            var BlockDB = Engine.GetBlockDB(Num);
            if(!BlockDB)
                return 0;
            
            var Find = Engine.SenderActTree.find(BlockDB);
            if(Find)
            {
                if(IsEqArr(Find.Hash, BlockDB.Hash))
                    break;
                
                if(IsEqArr(Find.TreeHash, BlockDB.TreeHash))
                {
                    
                    Find.Hash = BlockDB.Hash;
                    Num--;
                    continue;
                }
                
                Engine.SenderActTree.remove(Find);
            }
            
            var Arr = Engine.GetSenderArrFromBlock(BlockDB);
            var NewData = {BlockNum:BlockDB.BlockNum, Hash:BlockDB.Hash, TreeHash:BlockDB.TreeHash, Arr:Arr};
            
            Engine.OperationToPriorityTree(NewData.Arr, 1);
            Engine.SenderActTree.insert(NewData);
            
            if(Find)
            {
                Engine.OperationToPriorityTree(Find.Arr,  - 1);
            }
            
            Num--;
            Count++;
        }
        var MinNum = HeadBlockNum - JINN_CONST.TX_PRIORITY_LENGTH;
        var Data;
        while(1)
        {
            Data = Engine.SenderActTree.min();
            if(Data && Data.BlockNum <= MinNum)
            {
                Engine.OperationToPriorityTree(Data.Arr,  - 1);
                Engine.SenderActTree.remove(Data);
                continue;
            }
            
            Data = Engine.SenderActTree.max();
            if(Data && Data.BlockNum > HeadBlockNum)
            {
                Engine.OperationToPriorityTree(Data.Arr,  - 1);
                Engine.SenderActTree.remove(Data);
                continue;
            }
            
            break;
        }
        
        return 1;
    };
    Engine.GetSenderArrFromBlock = function (Block)
    {
        Engine.CheckLoadBody(Block);
        
        var Arr = [];
        for(var i = 0; Block.TxData && i < Block.TxData.length; i++)
        {
            var Tx = Block.TxData[i];
            var SenderNum = Engine.GetTxSenderNum(Tx, Block.BlockNum);
            if(SenderNum >= 0)
                Arr.push({SenderNum:SenderNum, Count:Tx.body.length});
        }
        
        return Arr;
    };
    
    Engine.OperationToPriorityTree = function (Arr,Mult)
    {
        for(var i = 0; i < Arr.length; i++)
        {
            var Iem = Arr[i];
            var SenderNum = Iem.SenderNum;
            var Count = Iem.Count;
            var Find = Engine.SenderRestTree.find({SenderNum:SenderNum});
            if(!Find && Mult > 0)
            {
                Find = {SenderNum:SenderNum, Count:0};
                Engine.SenderRestTree.insert(Find);
            }
            
            if(Find)
            {
                Find.Count += Count * Mult;
                if(Find.Count < 0)
                    Engine.ToLog("Error Count=" + Find.Count + " on SenderNum = " + SenderNum, 2);
                if(Find.Count === 0)
                {
                    Engine.SenderRestTree.remove(Find);
                }
            }
            else
            {
                Engine.ToLog("Error find SenderNum = " + SenderNum + " size=" + Engine.SenderRestTree.size, 2);
            }
        }
    };
    Engine.GetTxSenderCount = function (SenderNum)
    {
        var Find = Engine.SenderRestTree.find({SenderNum:SenderNum});
        if(Find)
        {
            return Find.Count;
        }
        
        return 0;
    };
    
    Engine.GetTxSenderNum = function (Tx,BlockNum)
    {
        var RndNum = Tx.HashTicket[0] >>> 4;
        return RndNum;
    };
    Engine.GetTxSenderOperationID = function (Tx,BlockNum)
    {
        return 0;
    };
    
    Engine.GetAccountBaseValue = function (AccNum,BlockNum)
    {
        return 0;
    };
    Engine.GetAccountOperationID = function (SenderNum)
    {
        return 0;
    };
    Engine.CheckSignTx = function (Tx,BlockNum)
    {
        return 1;
    };
    
    Engine.AddBlockToSenderTree = function (Block)
    {
        var Find = Engine.SenderActTree.find({BlockNum:Block.BlockNum});
        
        var Arr = Engine.GetSenderArrFromBlock(Block);
        var NewData = {BlockNum:Block.BlockNum, Hash:Block.Hash, TreeHash:Block.TreeHash, Arr:Arr};
        Engine.OperationToPriorityTree(NewData.Arr, 1);
        
        if(Find)
        {
            if(Find.Arr.length)
            {
                Engine.OperationToPriorityTree(Find.Arr,  - 1);
            }
            Engine.SenderActTree.remove(Find);
        }
        
        Engine.SenderActTree.insert(NewData);
    };
    Engine.SortBlockPriority = function (Block)
    {
        var NumNew = Engine.CurrentBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        if(!JINN_CONST.TX_PRIORITY_MODE || !Block || !Block.TxData || Block.TxData.length <= 0)
            return Engine.SortBlock(Block);
        
        var NumSave = Engine.CurrentBlockNum - JINN_CONST.STEP_SAVE;
        var bPriority = Engine.PrepareLastStatFromDB(NumSave);
        if(!bPriority)
        {
            return Engine.SortBlock(Block);
        }
        
        var Arr = Block.TxData;
        return Engine.SortArrPriority(Arr, Block.BlockNum, 1);
    };
    
    Engine.SortArrPriority = function (Arr,BlockNum,bBlockSort)
    {
        Engine.CheckHashExistArr(Arr, BlockNum);
        Arr.sort(function (a,b)
        {
            if(typeof a.SenderNum !== "number")
                ToLogTrace("Error type a.SenderNum");
            if(typeof b.SenderNum !== "number")
                ToLogTrace("Error type b.SenderNum");
            
            if(typeof a.OperationID !== "number")
                ToLogTrace("Error type a.OperationID");
            if(typeof b.OperationID !== "number")
                ToLogTrace("Error type b.OperationID");
            
            if(!a.HASH)
                ToLogTrace("Error a.HASH");
            if(!b.HASH)
                ToLogTrace("Error b.HASH");
            
            if(a.SenderNum !== b.SenderNum)
                return a.SenderNum - b.SenderNum;
            
            if(a.OperationID !== b.OperationID)
                return a.OperationID - b.OperationID;
            return CompareArr(a.HASH, b.HASH);
        });
        var SumAdd = 0;
        var PrevSenderNum = undefined;
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            Tx.CurCountTX = Tx.CountTX;
            if(PrevSenderNum != Tx.SenderNum)
            {
                SumAdd = 0;
            }
            SumAdd += Tx.body.length;
            Tx.CurCountTX += SumAdd;
            
            PrevSenderNum = Tx.SenderNum;
        }
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            if(typeof Tx.CurCountTX !== "number")
                ToLogTrace("Error type Tx.CurCountTX");
            
            Tx.Priority = Tx.CurCountTX;
            if(JINN_CONST.TX_BASE_VALUE)
            {
                Tx.CanBaseTx = Tx.BaseValue / JINN_CONST.TX_BASE_VALUE;
                Tx.Priority -= Tx.CanBaseTx;
            }
        }
        Arr.sort(function (a,b)
        {
            if(typeof a.OperationID !== "number")
                ToLogTrace("Error type a.OperationID");
            if(typeof b.OperationID !== "number")
                ToLogTrace("Error type b.OperationID");
            if(typeof a.Priority !== "number")
                ToLogTrace("Error type a.Priority");
            if(typeof b.Priority !== "number")
                ToLogTrace("Error type b.Priority");
            
            if(!a.HASH)
                ToLogTrace("Error a.HASH");
            if(!b.HASH)
                ToLogTrace("Error b.HASH");
            
            if(a.Priority !== b.Priority)
                return a.Priority - b.Priority;
            
            if(a.OperationID !== b.OperationID)
                return a.OperationID - b.OperationID;
            return CompareArr(a.HASH, b.HASH);
        });
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            var Delta = Tx.CanBaseTx - Tx.CurCountTX;
            if(Delta < 0 && i >= JINN_CONST.TX_FREE_COUNT)
            {
                Arr.length = i;
                break;
            }
            
            if(JINN_CONST.TX_FREE_BYTES_MAX)
                if(Delta <  - JINN_CONST.TX_FREE_BYTES_MAX)
                {
                    Arr.length = i;
                    break;
                }
        }
        
        return 1;
    };
    
    Engine.LogArrPriority = function (Name,Arr,BlockNum)
    {
        var Arr2 = [];
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            Arr2.push({SenderNum:Tx.SenderNum, Priority:Tx.Priority, OperationID:Tx.OperationID, BaseValue:Tx.BaseValue, CanBaseTx:Tx.CanBaseTx,
                CountTX:Tx.CountTX, CurCountTX:Tx.CurCountTX, });
        }
        ToLog(Name + " SortArrPriority for Block=" + BlockNum + " Arr=" + JSON.stringify(Arr2));
    };
    
    Engine.CheckSortArrPriority = function (Arr,BlockNum)
    {
        if(global.JINN_WARNING < 3)
            return;
        
        if(!Arr || Arr.length <= 1)
            return;
        var CountErr = 0;
        var PrevSenderNum = undefined;
        var PrevOperationID =  - 1;
        var Str = "";
        
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            var OperationID = Engine.GetTxSenderOperationID(Tx, BlockNum);
            if(PrevSenderNum === Tx.SenderNum && PrevOperationID >= OperationID)
            {
                CountErr++;
                ToLog("Error OperationID=" + OperationID + " in Block=" + BlockNum);
            }
            Str += OperationID;
            if(Tx.Priority !== undefined)
                Str += "/" + Tx.Priority;
            Str += ",";
            
            PrevOperationID = OperationID;
            PrevSenderNum = Tx.SenderNum;
        }
        
        if(CountErr)
        {
            ToLog("WAS ERROR CheckSortArrPriority for Block=" + BlockNum + " Str=" + Str);
        }
        else
        {
        }
    };
    
    Engine.InitPriorityTree();
}
