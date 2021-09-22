/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * The module is designed to speed up the exchange
 * Proactive + batch sending of unique requests to all neighboring nodes at once
 * The implementation of the interception methods of sharing blocks and headers
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"ConsensusBoost"});

var BROADCAST_SHORT_PERIOD = 1000;

global.glUseBHCache = 1;
global.glUseMaxCache = 1;

global.MAX_ITERATION_MAX_HASH = 50;

//Engine context

function InitClass(Engine)
{
    Engine.MaxHashReceiveCount = 0;
    Engine.MaxContextIDCounter = 0;
    Engine.SendMaxContextTree = new CBlockCache(function (a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    
    Engine.StartSendMaxHash = function (BlockNum)
    {
        if(!Engine.CanProcessMaxHash(BlockNum))
            return;
        
        var Context = Engine.SendMaxContextTree.FindItemInCache({BlockNum:BlockNum});
        if(!Context)
        {
            Engine.MaxContextIDCounter++;
            Context = {BlockNum:BlockNum, ID:Engine.MaxContextIDCounter, LiderID:0, WasReturn:0, BodyTreeNum:0, };
            Engine.SendMaxContextTree.AddItemToCache(Context);
        }
        
        if(Context.WaitIteration === 1)
        {
            return;
        }
        
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.IsHotReady())
            {
                Engine.SendMaxHashToOneNode(Context, BlockNum, Child, MAX_ITERATION_MAX_HASH);
            }
        }
    };
    
    Engine.GetMaxArrForSend = function (Context,Child,BlockNum,bNextSend)
    {
        
        if(!Child.SendMaxTimeCache)
            Child.SendMaxTimeCache = new CTimeCache(FMaxTreeCompare);
        
        var Store = Engine.GetLiderArrAtNum(BlockNum);
        
        var Arr = [];
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            
            var Element = {BlockNum:BlockNum, Mode:0, DataHash:NodeStatus.DataHash, LinkSumHash:NodeStatus.LinkSumHash, TreeHash:NodeStatus.TreeHash,
                SysTreeHash:NodeStatus.SysTreeHash, MinerHash:NodeStatus.MinerHash, Hash:NodeStatus.Hash};
            var DeltaBlockNum;
            if(NodeStatus.LoadNum)
            {
                DeltaBlockNum = BlockNum - NodeStatus.LoadNum;
                
                Element.Mode = 1;
                Element.CountItem = Math.max(1, Math.min(JINN_CONST.MAX_ITEMS_FOR_LOAD, DeltaBlockNum));
                Element.LoadN = NodeStatus.LoadNum;
                Element.LoadH = NodeStatus.LoadHash;
            }
            else
                if(NodeStatus.LoadTreeNum)
                {
                    DeltaBlockNum = BlockNum - NodeStatus.LoadTreeNum;
                    
                    Element.Mode = 2;
                    Element.CountItem = Math.max(1, Math.min(JINN_CONST.MAX_ITEMS_FOR_LOAD, DeltaBlockNum));
                    Element.LoadN = NodeStatus.LoadTreeNum;
                    Element.LoadH = NodeStatus.LoadTreeHash;
                }
                else
                {
                    DeltaBlockNum = 0;
                    
                    Element.Mode = 0;
                    Element.LoadN = 0;
                    Element.LoadH = ZERO_ARR_32;
                    Element.CountItem = 0;
                }
            
            JINN_STAT.MaxSendCountItem = Math.max(JINN_STAT.MaxSendCountItem, Element.CountItem);
            
            if(Element.Mode === 2 && Context.BodyFromID !== Child.Level && DeltaBlockNum >= 8)
            {
                
                Element.CountItem = 0;
            }
            else
                if(!bNextSend && Element.Mode && Element.CountItem)
                {
                    Element.CountItem = 1;
                }
            if(global.glUseMaxCache && (bNextSend || Element.Mode === 0))
            {
                if(Child.SendMaxTimeCache.FindItemInCache(Element))
                    continue;
                
                var Element2 = {};
                CopyObjKeys(Element2, Element);
                
                Element2.TimeNum = BlockNum;
                Child.SendMaxTimeCache.AddItemToCache(Element2);
            }
            
            Arr.push(Element);
        }
        return Arr;
    };
    
    Engine.SendMaxHashToOneNode = function (Context,BlockNum,Child,IterationNum,bNext)
    {
        if(!Engine.CanProcessMaxHash(BlockNum))
            return;
        
        if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT - 1)
            return;
        
        Context.IterationNum = IterationNum;
        var Arr = Engine.GetMaxArrForSend(Context, Child, BlockNum, bNext);
        if(!Arr.length)
        {
            if(bNext)
            {
                JINN_STAT.MaxReqErr++;
            }
            return;
        }
        
        if(!Child.FirstTransferTime)
            Child.FirstTransferTime = Date.now();
        
        let ArrNeedHash = [];
        
        var MaxReqAll = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            if(Item.CountItem && Item.CountItem > MaxReqAll)
                MaxReqAll = Item.CountItem;
            if(Item.LoadH && !IsZeroArr(Item.LoadH))
                ArrNeedHash.push(Item.LoadH);
        }
        JINN_STAT.MaxReqAll += MaxReqAll;
        
        JINN_STAT.MaxIteration = Math.max(JINN_STAT.MaxIteration, 1 + MAX_ITERATION_MAX_HASH - IterationNum);
        
        let DeltaForSend = Engine.CurrentBlockNum - BlockNum;
        
        var ArrRepeat = [];
        Engine.PackMaxHashOnSend(Child, BlockNum, Arr, ArrRepeat);
        
        let SendTransferTime = Date.now();
        Engine.Send("MAXHASH", Child, {BlockNum:BlockNum, Receive:Engine.MaxHashReceiveCount, CodeVersionNum:CODE_VERSION.VersionNum,
            NetConstVer:JINN_NET_CONSTANT.NetConstVer, DepricatedArr:[], ArrRepeat:ArrRepeat, Debug:global.TEST_CONNECTOR, Arr:Arr, CurTime:Engine.GetTransferTime(Child),
        }, function (Child,Data)
        {
            Context.WaitIteration = 3;
            if(!Data)
                return;
            
            Engine.SetTransferTime(Child, Data.CurTime);
            
            JINN_STAT.MaxLoadAll += Data.HeaderArr.length + Data.BodyArr.length;
            
            Child.LastTransferTime = Date.now();
            Child.TransferCount++;
            Child.DeltaTransfer = Child.LastTransferTime - SendTransferTime;
            
            if(!JINN_STAT.MinDTransfer || JINN_STAT.MinDTransfer > Child.DeltaTransfer)
                JINN_STAT.MinDTransfer = (Child.DeltaTransfer < 1 ? 1 : Child.DeltaTransfer);
            JINN_STAT.MaxDTransfer = Math.max(JINN_STAT.MaxDTransfer, Child.DeltaTransfer);
            var Store = Engine.GetLiderArrAtNum(BlockNum);
            if(!Store)
                return;
            
            var LiderID = 0;
            var bWas = 0;
            var CountReceive = 0;
            var CountReceiveNew = 0;
            for(var n = 0; n < Data.HeaderArr.length; n++)
            {
                var Value = Data.HeaderArr[n];
                if(Value)
                {
                    CountReceive++;
                    if(!Store.HeaderLoad)
                        Store.HeaderLoad = 0;
                    Store.HeaderLoad++;
                    JINN_STAT.HeaderLoad++;
                    JINN_STAT.MaxLoad++;
                    
                    var LID = Engine.AddBlockHeader(Context, Child, Value, Store);
                    Engine.AddChildScoreByHash(Child, ArrNeedHash, Value.Hash, Value.SumHash);
                    if(!LID)
                    {
                        continue;
                    }
                    
                    if(!Store.HeaderLoadOK)
                        Store.HeaderLoadOK = 0;
                    Store.HeaderLoadOK++;
                    
                    JINN_STAT.HeaderLoadOK++;
                    
                    bWas = 1;
                    CountReceiveNew++;
                    Context.LastHeadNum = Value.BlockNum;
                    if(!LiderID)
                        LiderID = LID;
                }
            }
            
            JINN_STAT.MaxHeaderLoad = Math.max(JINN_STAT.MaxHeaderLoad, Data.HeaderArr.length);
            
            if(Data.BodyTreeNum)
            {
                var LID = Engine.FindHashInStore(Store, "LoadTreeHash", Data.BodyTreeHash);
                CountReceive = 1;
                
                if(LID && !Context.BodyTreeNum)
                {
                    for(var d =  - JINN_CONST.MAX_DELTA_PROCESSING; d <= JINN_CONST.MAX_DELTA_PROCESSING; d++)
                    {
                        var CurContext = Engine.SendMaxContextTree.FindItemInCache({BlockNum:BlockNum + d});
                        
                        if(CurContext && CurContext.BodyTreeNum >= Data.BodyTreeNum)
                        {
                            return;
                        }
                    }
                    
                    Context.BodyTreeNum = Data.BodyTreeNum;
                    Context.BodyFromID = Child.Level;
                    bWas = 1;
                    CountReceiveNew = 1;
                    if(!LiderID)
                        LiderID = LID;
                }
            }
            else
            {
                for(var n = 0; n < Data.BodyArr.length; n++)
                {
                    var Value = Data.BodyArr[n];
                    if(Value)
                    {
                        CountReceive++;
                        JINN_STAT.BodyLoad++;
                        JINN_STAT.MaxLoad++;
                        
                        var LID = Engine.AddBlockBody(Context, Child, Value, Store);
                        Engine.AddChildScoreByHash(Child, ArrNeedHash, Value.TreeHash);
                        if(!LID)
                        {
                            continue;
                        }
                        bWas = 1;
                        CountReceiveNew++;
                        Context.LastBodyNum = Value.BlockNum;
                        if(!LiderID)
                            LiderID = LID;
                    }
                }
            }
            
            if(Data.HeaderArr.length)
            {
            }
            if(Data.BodyArr.length)
            {
            }
            
            if(Data.Mode === 1 && bWas || Data.Mode === 2 && CountReceiveNew >= CountReceive && LiderID)
            {
                
                if(IterationNum <= 1)
                {
                    return;
                }
                
                if(!Context.WasReturn)
                {
                    Context.WasReturn = 1 + Child.Level;
                    Context.LiderID = LiderID;
                }
                else
                    if(Context.WasReturn)
                    {
                        if(Context.WasReturn !== Child.Level + 1)
                        {
                            return;
                        }
                    }
                
                Context.WasCountReceive = CountReceive;
                var BlockNum2 = Engine.CurrentBlockNum - DeltaForSend;
                
                Engine.SendMaxHashNextTime(Context, BlockNum2, Child, IterationNum - 1, 1);
            }
        });
    };
    
    Engine.GetContInfo = function (Context)
    {
        return "T:" + Engine.TickNum + " ID=" + Context.ID + " LID=" + Context.LiderID + "  TreeNum=" + Context.BodyTreeNum + " Iter:" + Context.IterationNum + " From:" + Context.BodyFromID;
    };
    
    Engine.MAXHASH_SEND = {Receive:"uint", BlockNum:"uint32", NetConstVer:"uint32", CodeVersionNum:"uint32", DepricatedArr:[{Mode:"byte",
            DataHashNum:"byte", DataHash:"zhash", MinerHash:"hash", CountItem:"uint16", LoadN:"uint", LoadH:"zhash"}], Debug:"byte", ArrRepeat:["byte"],
        Arr:[{Mode:"byte", DataHashNum:"byte", LinkSumHash:"hash", SysTreeHash:"zhash", TreeHash:"zhash", DataHash:"hash", MinerHash:"hash",
            CountItem:"uint16", LoadN:"uint", LoadH:"zhash", Reserve:"uint16"}], CurTime:"uint32", };
    Engine.MAXHASH_RET = {result:"byte", errnum:"byte", result2:"byte", Reserve:"uint32", Mode:"byte", DepricatedHeaderArr:[{BlockNum:"uint32",
            PrevSumPow:"uint", LinkSumHash:"hash", TreeHash:"zhash", MinerHash:"hash", OldPrevHash8:"zhash"}], Reserve2:"uint32", BodyArr:[{BlockNum:"uint32",
            TreeHash:"hash", ArrFull:[{body:"tr"}], ArrTtTx:[{HashTicket:"arr" + JINN_CONST.TT_TICKET_HASH_LENGTH, body:"tr"}], }], BodyTreeNum:"uint32",
        BodyTreeHash:"zhash", HeaderArr:[{BlockNum:"uint32", PrevSumPow:"uint", LinkSumHash:"hash", SysTreeHash:"zhash", TreeHash:"zhash",
            MinerHash:"hash", OldPrevHash8:"zhash", Reserve:"uint32"}], CurTime:"uint32", };
    Engine.MAXHASH = function (Child,Data)
    {
        var Ret = Engine.DoMaxHash(Child, Data);
        if(!Ret.result)
        {
            Child.ToLogNet("MAXHASH result 0, errnum:" + Ret.errnum);
        }
        return Ret;
    };
    
    Engine.DoMaxHash = function (Child,Data)
    {
        var WasReads = JINN_STAT.ReadRowsDB;
        Engine.MaxHashReceiveCount++;
        
        if(!Data)
            return {result:0, errnum:1};
        
        Engine.SetTransferTime(Child, Data.CurTime);
        
        var BlockNum = Data.BlockNum;
        
        if(!Engine.UnpackMaxHashOnReceive(Child, BlockNum, Data.Arr, Data.ArrRepeat))
            return {result:0, errnum:2};
        
        Engine.ProcessNetConstant(Child, Data.NetConstVer);
        Engine.ProcessNewVersionNum(Child, Data.CodeVersionNum);
        
        if(Data.CodeVersionNum < global.MIN_JINN_VERSION_NUM)
            return {result:0, errnum:3};
        
        if(Data.Arr.length)
            Engine.AddMaxHashToTimeStat(Data.Arr[0], BlockNum);
        
        if(!Engine.CanProcessMaxHash(BlockNum))
            return {result:0, errnum:4};
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHotReady())
        {
            if(Child)
            {
                Engine.DenyHotConnection(Child, 1);
            }
            return {result:0, errnum:5};
        }
        if(Data.Arr.length > JINN_CONST.MAX_LEADER_COUNT)
            Data.Arr.length = JINN_CONST.MAX_LEADER_COUNT;
        
        var HeaderArr = [];
        var BodyArr = [];
        var RetMode = 0;
        
        var Was = 0;
        var BodyTreeHash = ZERO_ARR_32;
        var BodyTreeNum = 0;
        var bWasCanntUpload = 0;
        for(var i = 0; i < Data.Arr.length; i++)
        {
            var Status = Data.Arr[i];
            var Result = Engine.AddHashToMaxLider(Status, Data.BlockNum, 0);
            if(Result >= 0)
                Was = 1;
            
            if(!Status.Mode || !Status.LoadN)
                continue;
            
            if(RetMode)
                continue;
            if(bWasCanntUpload || !Engine.CanUploadData(BlockNum, Status.LoadN))
            {
                if(!bWasCanntUpload)
                    ToLog("Cannt upload data to " + ChildName(Child), 4);
                bWasCanntUpload = 1;
                continue;
            }
            
            if(i > 0 && Data.BlockNum - Status.LoadN > JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN)
                continue;
            
            Status.CountItem = Math.min(JINN_CONST.MAX_ITEMS_FOR_LOAD, Status.CountItem);
            
            if(Status.Mode === 1)
            {
                HeaderArr = Engine.GetHeaderArrForChild(Data.BlockNum, Status, Child);
                {
                    JINN_STAT.WantHeader += Status.CountItem;
                    JINN_STAT.UploadHeader += HeaderArr.length;
                }
                if(HeaderArr.length)
                {
                    RetMode = 1;
                }
            }
            else
                if(Status.Mode === 2)
                {
                    
                    var CountItem = Status.CountItem;
                    var bFirstBody = 0;
                    if(CountItem === 0)
                    {
                        bFirstBody = 1;
                        CountItem = 1;
                    }
                    
                    BodyArr = Engine.GetBodyArrForChild(Child, Data.BlockNum, Status.LoadN, Status.LoadH, CountItem, bFirstBody);
                    if(BodyArr.length)
                    {
                        RetMode = 2;
                        if(bFirstBody)
                        {
                            BodyTreeHash = BodyArr[0].TreeHash;
                            BodyTreeNum = BodyArr[0].BlockNum;
                            BodyArr = [];
                        }
                        {
                            JINN_STAT.WantBody += Status.CountItem;
                            JINN_STAT.UploadBody += BodyArr.length;
                        }
                    }
                }
        }
        
        if(Was)
        {
            Engine.StepTaskMax[BlockNum] = 1;
        }
        
        Engine.MaxHashReceiveCount++;
        
        var CurTime = Engine.GetTransferTime(Child);
        
        return {result:1, Mode:RetMode, DepricatedHeaderArr:[], BodyArr:BodyArr, BodyTreeNum:BodyTreeNum, BodyTreeHash:BodyTreeHash,
            CurTime:CurTime, HeaderArr:HeaderArr};
    };
    
    Engine.SendMaxHashNextTime = function (Context,BlockNum,Child,IterationNum,bNext)
    {
        
        Context.WaitIteration = 1;
        setTimeout(function ()
        {
            Context.WaitIteration = 2;
            Engine.SendMaxHashToOneNode(Context, BlockNum, Child, IterationNum, bNext);
        }, global.MAXHASH_TIMING);
    };
    
    Engine.CanUploadData = function (CurBlockNum,LoadBlockNum)
    {
        return 1;
    };
    Engine.ProcessNewVersionNum = function (Child,CodeVersionNum)
    {
    };
    Engine.ProcessNetConstant = function (Child,NetConstVer)
    {
    };
    
    Engine.CheckPacketSize = function (BlockNum,BlockNumLoad,Size)
    {
        if(Size >= JINN_CONST.MAX_PACKET_SIZE_RET_DATA)
        {
            return 0;
        }
        return 1;
    };
    
    Engine.GetHeaderArrForChild = function (BlockNum,Status,Child)
    {
        var Size = 0;
        var ArrRet = [];
        var LoadNum = Status.LoadN;
        var LoadHash = Status.LoadH;
        var CountItem = Status.CountItem;
        if(!CountItem)
            CountItem = 1;
        
        var MainItem = Engine.DB.ReadMainIndex(LoadNum);
        var TestHeader = Engine.DB.FindBlockByHash(LoadNum, LoadHash);
        if(TestHeader && MainItem && TestHeader.Position === MainItem.MainPosition)
        {
            for(var n = 0; n < CountItem; n++)
            {
                if(n % 20 === 0 && !Engine.CheckProcessTime(Child))
                {
                    break;
                }
                
                var Num = LoadNum - n;
                if(Num <= 0)
                    break;
                
                var BlockHeader = Engine.DB.ReadBlockMain(Num, 1);
                if(!BlockHeader || BlockHeader.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT - 1)
                    break;
                
                BlockHeader = Engine.HeaderFromBlock(BlockHeader);
                
                Size = Engine.AddHeaderBlockToArr(Child, ArrRet, BlockHeader, Size, BlockNum);
                
                if(!Engine.CheckPacketSize(BlockNum, LoadNum, Size))
                    break;
            }
            
            return ArrRet;
        }
        
        for(var n = 0; n < CountItem; n++)
        {
            if(n % 20 === 0 && !Engine.CheckProcessTime(Child))
                break;
            
            if(!LoadHash || LoadNum < 0)
                break;
            var BlockHeader = Engine.GetHeaderForChild(LoadNum, LoadHash);
            if(!BlockHeader || BlockHeader.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT - 1)
                break;
            LoadNum = BlockHeader.BlockNum - 1;
            LoadHash = BlockHeader.PrevSumHash;
            
            Size = Engine.AddHeaderBlockToArr(Child, ArrRet, BlockHeader, Size, BlockNum);
            if(!Engine.CheckPacketSize(BlockNum, LoadNum, Size))
                break;
        }
        
        return ArrRet;
    };
    Engine.AddHeaderBlockToArr = function (Child,Arr,BlockHeader,Size,BlockNum)
    {
        Arr.push(BlockHeader);
        Size += BlockHeader.Size;
        return Size;
    };
    
    Engine.CheckProcessTime = function (Child)
    {
        
        if(!Child.LastTransferHRTime)
            return 1;
        
        var Time = process.hrtime(Child.LastTransferHRTime);
        var deltaTime = Time[0] * 1000 + Time[1] / 1e6;
        if(deltaTime > JINN_CONST.MAX_CHILD_PROCESS_TIME)
        {
            JINN_STAT.BreakUploadTime++;
            return 0;
        }
        else
            return 1;
    };
    
    Engine.GetBodyArrForChild = function (Child,BlockNum,LoadNum,LoadHash,CountItem,bFirstBody)
    {
        
        var Size = 0;
        var ArrRet = [];
        
        var MainItem = Engine.DB.ReadMainIndex(LoadNum);
        var TestHeader = Engine.DB.FindBlockByHash(LoadNum, LoadHash);
        if(TestHeader && MainItem && TestHeader.Position === MainItem.MainPosition)
        {
            for(var n = 0; true; n++)
            {
                if(n % 2 === 0 && !Engine.CheckProcessTime(Child))
                    break;
                
                var Num = LoadNum - n;
                if(Num <= 0)
                    break;
                if(n >= JINN_CONST.MAX_ITEMS_FOR_LOAD * 2)
                    break;
                
                var Block = Engine.DB.ReadBlockMain(Num, 1);
                if(!Block)
                    break;
                if(IsZeroArr(Block.TreeHash))
                    continue;
                
                if(NeedLoadBodyFromDB(Block))
                {
                    Engine.DB.LoadBlockTx(Block);
                }
                
                if(Block.TxData && Block.TxData.length)
                {
                    if(bFirstBody)
                        return [Block];
                    
                    Block = Engine.BodyFromBlock(Block);
                    
                    Size = Engine.AddBodyBlockToArr(Child, ArrRet, Block, Size, BlockNum);
                    
                    if(!Engine.CheckPacketSize(BlockNum, LoadNum, Size))
                        break;
                }
                
                if(ArrRet.length >= CountItem)
                    break;
            }
            
            return ArrRet;
        }
        
        var BlockBody = Engine.GetBodyByHash(LoadNum, LoadHash);
        if(BlockBody)
        {
            if(bFirstBody)
                return [BlockBody];
            
            Size = Engine.AddBodyBlockToArr(Child, ArrRet, BlockBody, Size, BlockNum);
            
            for(var n = 1; n < true; n++)
            {
                if(n % 2 === 0 && !Engine.CheckProcessTime(Child))
                    break;
                
                if(n >= JINN_CONST.MAX_ITEMS_FOR_LOAD * 2)
                    break;
                
                BlockBody = Engine.GetBodyByHash(BlockBody.BlockNum - 1, BlockBody.PrevSumHash);
                if(!BlockBody)
                    break;
                
                if(!BlockBody.TreeHash || !BlockBody.TxData || IsZeroArr(BlockBody.TreeHash))
                {
                    continue;
                }
                
                if(bFirstBody)
                    return [BlockBody];
                
                Size = Engine.AddBodyBlockToArr(Child, ArrRet, BlockBody, Size, BlockNum);
                if(!Engine.CheckPacketSize(BlockNum, LoadNum, Size))
                    break;
                
                if(ArrRet.length >= CountItem)
                    break;
            }
        }
        
        return ArrRet;
    };
    Engine.AddBodyBlockToArr = function (Child,Arr,BlockBody,Size,BlockNum)
    {
        if(glUseBHCache && Child.SendBodyTimeCache)
        {
            var Find = Child.SendBodyTimeCache.FindItemInCache({Hash:BlockBody.TreeHash});
            if(Find && Find.TimeNum >= BlockNum)
            {
                return Size;
            }
            
            Child.SendBodyTimeCache.AddItemToCache({Hash:BlockBody.TreeHash, TimeNum:BlockNum});
        }
        
        if(!BlockBody.TxData || !BlockBody.TxData.length)
        {
            ToLogTrace("Error send block = " + BlockBody.BlockNum + " - NO TX BODY  BlockBody.TreeHash=" + BlockBody.TreeHash);
            return Size;
        }
        
        var Item = {BlockNum:BlockBody.BlockNum, TreeHash:BlockBody.TreeHash};
        
        var BlockSize = Engine.ProcessBlockOnSend(Child, Item, BlockBody.TxData);
        if(!BlockSize)
            return Size;
        
        Arr.push(Item);
        Size += BlockSize;
        
        JINN_STAT.BodyTxSend += BlockBody.TxData.length;
        
        var DeltaBlockNum = Engine.CurrentBlockNum - BlockNum;
        if(DeltaBlockNum < JINN_CONST.STEP_CLEAR_MEM && BlockBody.TxData.length && Engine.DB.SetTxDataCache)
        {
            Engine.DB.SetTxDataCache(BlockBody.TreeHash, BlockBody.TxData);
        }
        
        return Size;
    };
}

function FMaxTreeCompare(Val1,Val2,NoNum)
{
    if(!NoNum && Val1.BlockNum !== Val2.BlockNum)
        return Val1.BlockNum - Val2.BlockNum;
    
    if(Val1.Mode !== Val2.Mode)
        return Val1.Mode - Val2.Mode;
    if(Val1.CountItem !== Val2.CountItem)
        return Val1.CountItem - Val2.CountItem;
    if(Val1.LoadN !== Val2.LoadN)
        return Val1.LoadN - Val2.LoadN;
    
    var Comp1 = CompareArr(Val1.DataHash, Val2.DataHash);
    if(Comp1)
        return Comp1;
    var Comp2 = CompareArr(Val1.MinerHash, Val2.MinerHash);
    if(Comp2)
        return Comp2;
    
    var LoadH1 = Val1.LoadH;
    if(!LoadH1)
        LoadH1 = ZERO_ARR_32;
    var LoadH2 = Val2.LoadH;
    if(!LoadH2)
        LoadH2 = ZERO_ARR_32;
    
    return CompareArr(LoadH1, LoadH2);
}

global.FMaxTreeCompare = FMaxTreeCompare;
