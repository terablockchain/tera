/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"NetCache"});


//Engine context



global.glUseBlockCache = 1;
global.glUsePackMaxHash = 1;


function DoNode(Engine)
{
    var LastBlockNum = Engine.CurrentBlockNum;
    var BlockNum = LastBlockNum - JINN_CONST.STEP_CLEAR_MEM;
    if(Engine.CacheLastCurBlockNum === BlockNum)
        return;
    Engine.CacheLastCurBlockNum = BlockNum;
    
    Engine.NetCacheClear(BlockNum);
}

function InitClass(Engine)
{
    
    Engine.ProcessBlockOnSend = function (Child,Block,TxData)
    {
        var Level = Child.Level;
        var BlockNum = Block.BlockNum;
        var DeltaBlockNum = Engine.CurrentBlockNum - BlockNum;
        
        var Size = 4 + 4 + 32;
        var ArrFull = [];
        var ArrTtTx = [];
        if(DeltaBlockNum >= JINN_CONST.STEP_CLEAR_MEM - JINN_CONST.MAX_DELTA_PROCESSING || Child.StartHotTransferNum + 5 >= BlockNum)
        {
            for(var i = 0; i < TxData.length; i++)
            {
                var Tx = TxData[i];
                ArrFull.push(Tx);
                Size += Tx.body.length + 2;
            }
        }
        else
        {
            var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
            
            for(var i = 0; i < TxData.length; i++)
            {
                var Item = TxData[i];
                Engine.CheckHashExist(Item, BlockNum);
                var Tx = TreeTTAll.find(Item);
                if(!Tx)
                {
                    Tx = Item;
                    Engine.InitItemTT(Tx);
                    TreeTTAll.insert(Tx);
                }
                else
                    if(!Tx.IsTx)
                    {
                        Engine.DoTxFromTicket(Tx, Item);
                    }
                
                var Type = Tx.body[0];
                if(GetBit(Tx.TXReceive, Level) || GetBit(Tx.TXSend, Level) || GetBit(Tx.TTTXReceive, Level))
                {
                    ArrTtTx.push({HashTicket:Tx.HashTicket});
                    Size += JINN_CONST.TT_TICKET_HASH_LENGTH + 2;
                }
                else
                {
                    JINN_WARNING >= 4 && ToLog("SEND TX Type=" + Type + " KEY=" + Tx.KEY + " on BlockNum=" + BlockNum + " flags=" + GetBit(Tx.TXReceive,
                    Level) + ":" + GetBit(Tx.TXSend, Level) + ":" + GetBit(Tx.TTTXReceive, Level));
                    
                    ArrTtTx.push(Tx);
                    Size += JINN_CONST.TT_TICKET_HASH_LENGTH + Tx.body.length + 2;
                    Tx.TXSend = SetBit(Tx.TXSend, Level);
                }
            }
        }
        
        Block.ArrFull = ArrFull;
        Block.ArrTtTx = ArrTtTx;
        
        return Size;
    };
    
    Engine.ProcessBlockOnReceive = function (Child,Block)
    {
        var Level = Child.Level;
        var BlockNum = Block.BlockNum;
        
        if(Block.WasProcessBlockOnReceive)
        {
            ToLog("WasProcessBlockOnReceive " + BlockNum, 2);
            return 1;
        }
        Block.WasProcessBlockOnReceive = 1;
        
        Block.TxData = [];
        if(Block.ArrFull.length)
        {
            
            var ArrFull = Block.ArrFull;
            for(var i = 0; i < ArrFull.length; i++)
            {
                var Value = ArrFull[i];
                var Tx = Engine.GetTx(Value.body, BlockNum, undefined, 4);
                Tx.FromChildID = Child.ID;
                Block.TxData.push(Tx);
                
                JINN_STAT.TxCache1++;
                CheckTx("1.ProcessBlockOnReceive", Tx, BlockNum);
            }
            Engine.SetReceiveBits(Child, Block);
        }
        else
            if(Block.ArrTtTx.length)
            {
                var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
                
                var WasError = 0;
                var ArrTtTx = Block.ArrTtTx;
                for(var i = 0; i < ArrTtTx.length; i++)
                {
                    
                    var Item = ArrTtTx[i];
                    if(Item.body.length)
                        JINN_STAT.TxCacheErr++;
                    else
                        JINN_STAT.TxCache2++;
                    
                    var Tx = TreeTTAll.find(Item);
                    if(Tx)
                    {
                        if(!Tx.IsTx && !Item.body.length && Engine.SysTreeTx)
                        {
                            var VTx = Engine.SysTreeTx.FindItemInCache(Tx);
                            if(!VTx)
                            {
                                if(!WasError)
                                    Child.ToError("**** Error #1 find tx:" + Tx.KEY.substr(0, 8) + " in BlockNum=" + BlockNum + " Flags:" + GetBit(Tx.TXReceive,
                                    Level) + ":" + GetBit(Tx.TXSend, Level), 3);
                                WasError = 1;
                                
                                continue;
                            }
                            Tx = VTx;
                        }
                        
                        if(!Tx.IsTx)
                        {
                            
                            Tx = Engine.GetTxFromReceiveBody(Child, Tx, Item.body, BlockNum, 2);
                            if(!Tx)
                                return 0;
                        }
                    }
                    else
                    {
                        
                        if(!Item.body.length)
                        {
                            if(!WasError)
                                Child.ToError("---------Error #2 load tx - not found body in BlockNum=" + BlockNum, 3);
                            WasError = 1;
                            continue;
                        }
                        
                        Tx = Engine.GetTx(Item.body, BlockNum, undefined, 3);
                        
                        if(!Engine.IsValidateTx(Tx, "ProcessBlockOnReceive", BlockNum, 1))
                        {
                            if(!WasError)
                                Child.ToError("---------Error #3 load tx - bad tx in BlockNum=" + BlockNum, 3);
                            WasError = 1;
                            continue;
                        }
                        
                        Tx.FromChildID = Child.ID;
                        Engine.InitItemTT(Tx);
                        TreeTTAll.insert(Tx);
                    }
                    
                    CheckTx("2.ProcessBlockOnReceive", Tx, BlockNum, 1);
                    
                    Block.TxData.push(Tx);
                    Tx.TXReceive = SetBit(Tx.TXReceive, Level);
                }
                
                if(WasError)
                    return 0;
            }
        
        delete Block.ArrFull;
        delete Block.ArrTtTx;
        
        return 1;
    };
    
    Engine.SetReceiveBits = function (Child,Block)
    {
        return;
        
        var BlockNum = Block.BlockNum;
        var DeltaBlockNum = Engine.CurrentBlockNum - BlockNum;
        if(DeltaBlockNum >= JINN_CONST.STEP_CLEAR_MEM)
            return;
        
        var Level = Child.Level;
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        
        for(var i = 0; i < Block.TxData.length; i++)
        {
            var Item = Block.TxData[i];
            if(!Item.HashTicket)
            {
                Child.ToLog("SetReceiveBits: Not find HashTicket in BlockNum=" + BlockNum, 2);
                return;
            }
            
            var Tx = TreeTTAll.find(Item);
            if(Tx)
            {
                Tx.TXReceive = SetBit(Tx.TXReceive, Level);
            }
            else
            {
            }
        }
    };
    Engine.GetPackedArray = function (Arr)
    {
        var Arr2 = [];
        
        var Counter = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Value = Arr[i];
            var Value2 = Arr[i + 1];
            
            Counter++;
            if(Counter < 60 && Value === Value2)
            {
            }
            else
            {
                Counter--;
                Arr2.push(Value * 60 + Counter);
                Counter = 0;
            }
        }
        return Arr2;
    };
    Engine.GetUnpackedArray = function (Arr)
    {
        var Arr2 = [];
        for(var i = 0; i < Arr.length; i++)
        {
            var Value = (Arr[i] / 60) >>> 0;
            var Count = 1 + (Arr[i] % 60);
            
            for(var n = 0; n < Count; n++)
                Arr2.push(Value);
        }
        return Arr2;
    };
    Engine.GetPackedSeqArray = function (Arr)
    {
        Arr.sort(function (a,b)
        {
            return a - b;
        });
        var Arr2 = [];
        
        var Counter = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Value = Arr[i];
            var Value2 = Arr[i + 1];
            
            Counter++;
            if(Value + 1 === Value2)
            {
            }
            else
            {
                Arr2.push(Value - Counter + 1);
                Arr2.push(Counter);
                
                Counter = 0;
            }
        }
        return Arr2;
    };
    Engine.GetUnpackedSeqArray = function (Arr)
    {
        
        var Arr2 = [];
        if(Arr.length / 2 === (Arr.length >> 1))
        {
            for(var i = 0; i < Arr.length; i += 2)
            {
                var Value = Arr[i];
                var Count = Arr[i + 1];
                for(var n = 0; n < Count; n++)
                    Arr2.push(Value + n);
            }
        }
        
        return Arr2;
    };
    
    Engine.FindMaxArrItem = function (Arr,Find)
    {
        for(var n = 0; n < Arr.length; n++)
        {
            var Item = Arr[n];
            if(Item && FMaxTreeCompare(Item, Find, 1) === 0)
                return n;
        }
        return  - 1;
    };
    
    Engine.AddItemToRepeatArr = function (Arr,Index,Item)
    {
    };
    
    Engine.PackMaxHashOnSend = function (Child,BlockNum,Arr,ArrRepeat)
    {
        if(!glUsePackMaxHash)
            return;
        
        if(!Child.LastSendArrMax)
        {
            Child.LastSendArrIndex = 0;
            Child.LastSendArrMax = [];
        }
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            
            var FindNum = Engine.FindMaxArrItem(Child.LastSendArrMax, Status);
            if(FindNum !==  - 1)
            {
                ArrRepeat.push(FindNum);
                Arr.splice(a, 1);
                a--;
            }
        }
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            
            Child.LastSendArrIndex++;
            Engine.AddItemToRepeatArr(Child.LastSendArrMax, Child.LastSendArrIndex, Status);
            if(Status.LoadH && IsEqArr(Status.LoadH, Status.Hash))
            {
                Status.Mode |= 128;
                Status.LoadH = ZERO_ARR_32;
            }
        }
    };
    
    Engine.UnpackMaxHashOnReceive = function (Child,BlockNum,Arr,ArrRepeat)
    {
        if(!glUsePackMaxHash)
            return 1;
        if(!Child.LastReceiveArrMax)
        {
            Child.LastReceiveArrIndex = 0;
            Child.LastReceiveArrMax = [];
        }
        
        for(var n = 0; n < ArrRepeat.length; n++)
        {
            var Index = ArrRepeat[n];
            var Item = Child.LastReceiveArrMax[Index];
            if(!Item)
            {
                continue;
            }
            Item.Repeat = 1;
            Arr.push(Item);
        }
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            if(!Status.Repeat)
            {
                Child.LastReceiveArrIndex++;
                Engine.AddItemToRepeatArr(Child.LastReceiveArrMax, Child.LastReceiveArrIndex, Status);
            }
            if(Status.Mode & 128)
            {
                Status.Mode ^= 128;
                Engine.CalcHashMaxLider(Status, BlockNum);
                Status.LoadH = Status.Hash;
            }
        }
        return 1;
    };
    
    Engine.InitChildNext = function (Child)
    {
        Child.SendBodyTimeCache = new CTimeCache(function (a,b)
        {
            return CompareArr(a.Hash, b.Hash);
        });
    };
    
    Engine.ClearChild = function (Child)
    {
        
        if(Child.SendBodyTimeCache)
        {
            Child.SendBodyTimeCache.Clear();
            global.AllCacheTreeRemoveItem(Child.SendBodyTimeCache);
            delete Child.SendBodyTimeCache;
        }
        if(Child.SendMaxTimeCache)
        {
            Child.SendMaxTimeCache.Clear();
            global.AllCacheTreeRemoveItem(Child.SendMaxTimeCache);
            delete Child.SendMaxTimeCache;
        }
    };
    Engine.NetCacheClear = function (LastBlockNum)
    {
        
        global.AllCacheTreeRemoveTo(LastBlockNum);
        ClearListMap(Engine.ListArrTicket, LastBlockNum);
        ClearListMap(Engine.ListArrTx, LastBlockNum);
        ClearListMap(Engine.ListArrErrTx, LastBlockNum);
        
        ClearListTree(Engine.ListTreeTicketAll, LastBlockNum);
        ClearListMap(Engine.ListArrTicketAll, LastBlockNum, function (Arr)
        {
        });
        
        ClearListMap(Engine.MaxLiderList, LastBlockNum);
    };
    function ClearListMap(Map,LastBlockNum,FClear)
    {
        if(!Map)
            return;
        for(var key in Map)
        {
            var BlockNum =  + key;
            if(BlockNum > LastBlockNum)
                continue;
            if(FClear)
            {
                FClear(Map[key]);
            }
            delete Map[key];
        }
    };
    function ClearListTree(TreeMap,LastBlockNum)
    {
        ClearListMap(TreeMap, LastBlockNum, function (Tree)
        {
            Tree.clear();
        });
    };
}
