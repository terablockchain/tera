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

//support cross-tx engine

const WorkStructCrossMsg = {};

const CDBCrossTx = require("../jinn/tera/db/tera-db-cross");
const CDBTree = require("../jinn/tera/db/tera-db-tree");

class ShardCrossTX extends require("./dapp")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        
        this.CrossSend = new CDBCrossTx("cross-send", bReadOnly)
        
        const FormatDataHash = {DataHash:"hash", Msg:FORMAT_CROSS_MSG, RunBlockNum:"uint32", RunTxNum:"uint16", Reserve:"arr4"};
        function FCompareDataHash(a,b)
        {
            return CompareArr(a.DataHash, b.DataHash);
        };
        
        this.CrossWorkHash = new CDBTree("cross-work-hash", FormatDataHash, bReadOnly, FCompareDataHash, "nFixed", "nBin")
        const FormatRowHash = {Shard:SHARD_STR_TYPE, RowHash:"hash", RowNum:"uint", DataHash:"hash", Height:"uint32", HeightStart:"uint32",
            BlockNum:"uint32", TxNum:"uint16", BlockNumVote:"uint32", TxNumVote:"uint16", Reserve:"arr4"};
        
        function FCompareRowHash(a,b)
        {
            if(a.Shard !== b.Shard)
                return (a.Shard > b.Shard) ? 1 :  - 1;
            return CompareArr(a.RowHash, b.RowHash);
        };
        
        this.CrossRowHash = new CDBTree("cross-rowhash", FormatRowHash, bReadOnly, FCompareRowHash, "Fixed", "nBin")
        const FormatVBlockHash = {Hash:"hash", BlockNum:"uint32", TxNum:"uint16", };
        function FCompareVBlockHash(a,b)
        {
            return CompareArr(a.Hash, b.Hash);
        };
        
        const FormatVBlockNum = {BlockNum:"uint32", TxNum:"uint16", Shard:SHARD_STR_TYPE, PrevHash:"hash", Height:"uint32", RowNum:"uint",
            RowHash:"hash", Hash:"hash", Links:[{BlockNum:"uint32", TxNum:"uint16", }], };
        function FCompareVBlockNum(a,b)
        {
            if(a.BlockNum !== b.BlockNum)
                return a.BlockNum - b.BlockNum;
            return a.TxNum - b.TxNum;
        };
        
        this.CrossVBlockHash = new CDBTree("cross-vblock-hash", FormatVBlockHash, bReadOnly, FCompareVBlockHash, "Fixed", "nBin")
        this.CrossVBlockNum = new CDBTree("cross-vblock-num", FormatVBlockNum, bReadOnly, FCompareVBlockNum, "nFixed", "nBin")
        
        this.CrossSend.RegisterTrDB(52)
        
        REGISTER_TR_DB(this.CrossWorkHash.DB, 56)
        REGISTER_TR_DB(this.CrossVBlockHash.DB, 58)
        REGISTER_TR_DB(this.CrossVBlockNum.DB, 59)
        REGISTER_TR_DB(this.CrossRowHash.DB, 60)
        this.VBlockTree = new RBTree(function (a,b)
        {
            if(a.BlockNum !== b.BlockNum)
                return a.BlockNum - b.BlockNum;
            if(a.Shard !== b.Shard)
                return (a.Shard > b.Shard) ? 1 :  - 1;
            return 0;
        })
        this.ShardProcessingTree = new RBTree(function (a,b)
        {
            if(a.Shard !== b.Shard)
                return (a.Shard > b.Shard) ? 1 :  - 1;
            return 0;
        })
    }
    
    CloseCrossDB()
    {
        this.CrossSend.Close()
        this.CrossWorkHash.Close()
        this.CrossVBlockHash.Close()
        this.CrossVBlockNum.Close()
        this.CrossRowHash.Close()
        this.VBlockTree.clear()
        this.ShardProcessingTree.clear()
    }
    ClearCrossDB()
    {
        this.CrossSend.Clear()
        this.CrossWorkHash.Clear()
        this.CrossVBlockHash.Clear()
        this.CrossVBlockNum.Clear()
        this.CrossRowHash.Clear()
    }
    OnProcessCrossBlockStart(Block)
    {
        this.VBlockTree.clear()
        this.ShardProcessingTree.clear()
        
        this.CrossWorkHash.BeginBuffer()
        this.CrossVBlockHash.BeginBuffer()
        this.CrossVBlockNum.BeginBuffer()
        this.CrossRowHash.BeginBuffer()
    }
    
    OnProcessCrossBlockFinish(Block)
    {
        this.CrossWorkHash.FlushBuffer()
        this.CrossVBlockHash.FlushBuffer()
        this.CrossVBlockNum.FlushBuffer()
        this.CrossRowHash.FlushBuffer()
    }
    
    DeleteCrossTR(BlockNum)
    {
        this.CrossSend.DeleteFromBlock(BlockNum)
        this.CrossWorkHash.ReloadTree()
        this.CrossVBlockHash.ReloadTree()
        this.CrossVBlockNum.ReloadTree()
        this.CrossRowHash.ReloadTree()
    }
    
    DoCrossRowHash(Shard, RowHash, BlockNum, TxNum, RowNum, DataHash, BlockHeight, HeightLider, Confirms)
    {
        
        var Find = this.CrossRowHash.Find({Shard:Shard, RowHash:RowHash});
        if(!Find)
        {
            if(!DataHash)
            {
                ToLogTrace("Error not found CrossRowHash by RowHash=" + GetHexFromArr12(RowHash))
                return;
            }
            
            Find = {Shard:Shard, RowHash:RowHash, RowNum:RowNum, BlockNum:BlockNum, TxNum:TxNum, Height:BlockHeight, HeightStart:HeightLider + Confirms,
                DataHash:DataHash, }
        }
        else
        {
            this.CrossRowHash.Remove(Find)
        }
        
        Find.BlockNumVote = BlockNum
        Find.TxNumVote = TxNum
        this.CrossRowHash.Insert(Find)
    }
    
    DoCrossWorkMsg(Shard, Tx, BlockNum, HeightLider)
    {
        var Msg = Tx.Msg;
        var Find = this.CrossWorkHash.Find(Tx);
        if(!Find)
        {
            var Item = {DataHash:Tx.DataHash, Msg:Msg, RunBlockNum:0, RunTxNum:0, RowNum:Tx.RowNum, };
            this.CrossWorkHash.Insert(Item)
        }
    }
    TRVBlock(Block, Body, BlockNum, TxNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num";
        if(ContextFrom)
            return "Only the transaction of miners is expected";
        
        SERVER.CrossReceive.Close()
        
        var VBlockItem = SerializeLib.GetObjectFromBuffer(Body, FORMAT_VBLOCK, WorkStructVBlock);
        VBlockItem.Hash = sha3(Body)
        VBlockItem.BlockNum = BlockNum
        VBlockItem.TxNum = TxNum
        var Shard = VBlockItem.Shard;
        
        var Find = this.CrossVBlockHash.Find({Hash:VBlockItem.Hash});
        if(Find)
            return "VBlock from Shard " + Shard + " was processing in Block=" + Find.BlockNum;
        
        if(this.ShardProcessingTree.find(VBlockItem))
            return "Shard " + Shard + " was processing";
        this.ShardProcessingTree.insert(VBlockItem)
        var ShardDB = this.ReadShard(Shard);
        if(!ShardDB || Shard === global.SHARD_NAME)
            return "Error VBlock Shard name: " + Shard;
        var Height, RowNum, PrevRowHash, PrevBlockNum, PrevTxNum, PrevLinks, PrevShard, PrevHash;
        if(!IsZeroArr(VBlockItem.PrevHash))
        {
            var PrevItem = this.CrossVBlockHash.Find({Shard:Shard, Hash:VBlockItem.PrevHash});
            if(!PrevItem)
                return "TRVBlock: Error find Prev VBlock by Hash=" + GetHexFromArr8(VBlockItem.PrevHash);
            var PrevBlock = this.CrossVBlockNum.Find(PrevItem);
            if(!PrevBlock)
                return "TRVBlock: Error find Prev VBlock by PrevItem";
            
            Height = PrevBlock.Height
            RowNum = PrevBlock.RowNum
            PrevBlockNum = PrevBlock.BlockNum
            PrevTxNum = PrevBlock.TxNum
            PrevRowHash = PrevBlock.RowHash
            PrevLinks = PrevBlock.Links
            PrevShard = PrevBlock.Shard
            PrevHash = VBlockItem.PrevHash
        }
        else
        {
            Height = 0
            RowNum = 0
            PrevBlockNum = 0
            PrevTxNum = 0
            PrevRowHash = ZERO_ARR_32
            PrevLinks = []
            PrevShard = Shard
            PrevHash = ZERO_ARR_32
        }
        if(VBlockItem.Height !== Height + 1)
            return "Error VBlock Height form shard " + Shard;
        if(Shard !== PrevShard)
            return "Error VBlock shard name=" + Shard + " need=" + PrevShard;
        
        var RowHash = PrevRowHash;
        var HeightLider = ShardDB.MaxVBlock.Height;
        
        if(VBlockItem.Height > HeightLider)
        {
            HeightLider = VBlockItem.Height
        }
        
        for(var i = 0; i < VBlockItem.CrossTx.length; i++)
        {
            var CurrentTx = VBlockItem.CrossTx[i];
            CurrentTx.Msg.ShardFrom = Shard
            CurrentTx.Msg.ShardTo = global.SHARD_NAME
            CalcCrossRowItem(CurrentTx, RowNum, RowHash)
            CurrentTx.Height = VBlockItem.Height
            
            RowNum = CurrentTx.RowNum
            RowHash = CurrentTx.RowHash
            
            CurrentTx.DataHash = GetDataHashMsg(CurrentTx.Msg)
            this.DoCrossRowHash(Shard, RowHash, BlockNum, TxNum, RowNum, CurrentTx.DataHash, VBlockItem.Height, HeightLider, CurrentTx.Msg.Confirms)
            this.DoCrossWorkMsg(Shard, CurrentTx, BlockNum, HeightLider)
        }
        
        if(IsZeroArr(RowHash))
            return "Error Zero VBlock Hash form shard " + Shard;
        if(!IsEqArr(VBlockItem.RowHash, RowHash))
            return "Error VBlock RowHash form shard " + Shard;
        
        if(VBlockItem.CrossTx.length === 0)
            this.DoCrossRowHash(Shard, VBlockItem.RowHash, BlockNum, TxNum)
        
        var BlockItemData = {BlockNum:BlockNum, TxNum:TxNum, Height:VBlockItem.Height, RowNum:RowNum, RowHash:RowHash, Hash:VBlockItem.Hash,
            ShardNum:ShardDB.Num, };
        if(VBlockItem.Height > ShardDB.MaxVBlock.Height)
        {
            ShardDB.MaxVBlock = BlockItemData
            
            VBlockItem.IsMaxLider = 1
        }
        
        ShardDB.LastHash = VBlockItem.Hash
        
        this.DBShard.Write(ShardDB)
        
        if(!this.CrossVBlockHash.Insert(VBlockItem))
            return "Error write to CrossVBlockHash";
        
        this.SetCrossLinkArr(VBlockItem, PrevLinks, {BlockNum:PrevBlockNum, TxNum:PrevTxNum}, VBlockItem.Height)
        
        if(!this.CrossVBlockNum.Insert(VBlockItem))
            return "Error write to CrossVBlockNum";
        
        return true;
    }
    
    TRRunTX(Block, Body, BlockNum, TxNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num";
        
        if(ContextFrom)
            return "Only the transaction of miners is expected";
        
        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_RUN_TX, WorkStructRunTx);
        var SrcTx = this.GetCrossMsgByData(TR);
        if(typeof SrcTx !== "object")
            return SrcTx;
        if(SrcTx.RunBlockNum)
            return "TR " + GetHexFromArr8(TR.DataHash) + " was completed";
        
        var Shard = SrcTx.Msg.ShardFrom;
        var VBlockItem = this.ShardProcessingTree.find({Shard:Shard});
        if(!VBlockItem)
            return "Error - not was correct VBlock in this block";
        if(!VBlockItem.IsMaxLider)
            return "Error - VBlock not MaxLider";
        if(VBlockItem.Height < SrcTx.HeightStart)
            return "Cannt run tx " + GetHexFromArr12(TR.RowHash) + " on Height=" + VBlockItem.Height + " need HeightStart=" + SrcTx.HeightStart;
        var Result = this.CrossTxInVBlockChain(VBlockItem, SrcTx);
        if(typeof Result === "string")
            return Result;
        
        this.ResultTx = 1
        var AccountTo = SrcTx.Msg.AccountTo;
        
        var Account = ACCOUNTS.ReadStateTR(AccountTo);
        if(!Account)
            return "TRCrossTX: Error account: " + AccountTo;
        if(!Account.Value.Smart)
            return "TRCrossTX: No smart on account: " + TR.AccountTo;
        
        ContextFrom = {}
        try
        {
            var Params = JSON.parse(SrcTx.Msg.Params);
            RunSmartMethod(Block, SrcTx.Msg, Account.Value.Smart, Account, BlockNum, TxNum, ContextFrom, SrcTx.Msg.MethodName, Params,
            SrcTx.Msg.ParamsArr, 2)
        }
        catch(e)
        {
            return e;
        }
        
        return true;
    }
    
    OnProcessTransactionFinality(Block, Body, BlockNum, TrNum)
    {
        if(this.ResultTx)
        {
            var Type = Body[0];
            if(Type === TYPE_TRANSACTION_RUN_TX)
            {
                
                var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_RUN_TX, WorkStructRunTx);
                var SrcTx = this.GetCrossMsgByData(TR);
                if(typeof SrcTx !== "object")
                    return;
                
                SrcTx.RunBlockNum = BlockNum
                SrcTx.RunTxNum = TrNum
                if(!this.CrossWorkHash.RewriteData(SrcTx))
                    ToLog("Error CrossWorkHash:RewriteData", 3)
            }
        }
    }
    
    AddCrossMsg(BlockNumFrom, TxNumFrom, AccountFrom, Iteration, Mode, ShardPath, Confirms, MethodName, Params, ParamsArr)
    {
        
        if(!ShardPath || typeof ShardPath !== "string")
            throw "Error cross shard path: " + ShardPath;
        
        var Index = ShardPath.indexOf(":");
        if(Index < 3)
            throw "Error cross shard name in path: " + ShardPath;
        var ShardTo = ShardPath.substr(0, Index).trim();
        
        if(ShardTo === global.SHARD_NAME)
            throw "Error cross shard name: " + ShardTo;
        
        var AccountTo = ParseNum(ShardPath.substr(Index + 1));
        if(!AccountTo)
            throw "Error cross shard account number in path: " + ShardPath;
        
        if(!MethodName || typeof MethodName !== "string" || MethodName.length > 40)
            throw "Error cross method name: " + MethodName;
        
        var StrParams = JSON.stringify(Params);
        if(StrParams.length > 1024)
            throw "Error cross params length: " + StrParams.length;
        
        var Data = {Msg:{BlockNumFrom:BlockNumFrom, TxNumFrom:TxNumFrom, ShardFrom:global.SHARD_NAME, AccountFrom:AccountFrom, Mode:Mode,
                Iteration:Iteration, ShardTo:ShardTo, AccountTo:AccountTo, MethodName:MethodName, Params:StrParams, ParamsArr:ParamsArr, Confirms:Confirms,
            }};
        
        var ShardDB = this.FindShard(ShardTo);
        if(!ShardDB)
            throw "Not registered shard with name: " + ShardTo;
        
        if(ShardDB.System)
            throw "Cannt write to system shard: " + ShardTo;
        if(!this.CrossSend.Write(ShardTo, Data, BlockNumFrom, 1))
            throw "Error write message to shard " + ShardTo;
    }
    ReadVBlock(Shard, BlockNum)
    {
        var VBlock = this.VBlockTree.find({BlockNum:BlockNum, Shard:Shard});
        if(VBlock)
            return VBlock;
        
        if(this.WasFillVBlockTree(BlockNum))
            return undefined;
        var FindVBlock = undefined;
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(Block && Block.TxData)
        {
            for(var TxNum = 0; TxNum < Block.TxData.length; TxNum++)
            {
                var Tx = Block.TxData[TxNum];
                if(Tx && Tx.body && Tx.body[0] === TYPE_TRANSACTION_VBLOCK)
                {
                    if(!GetVerifyTransaction(Block, TxNum))
                        continue;
                    var VBlockItem = SerializeLib.GetObjectFromBuffer(Tx.body, FORMAT_VBLOCK, WorkStructVBlock);
                    VBlockItem.Hash = Tx.HASH
                    VBlockItem.BlockNum = BlockNum
                    this.VBlockTree.insert(VBlockItem)
                    
                    if(VBlockItem.Shard === Shard)
                    {
                        FindVBlock = VBlockItem
                    }
                }
            }
        }
        return FindVBlock;
    }
    
    CrossTxInVBlockChain(VBlock, Tx)
    {
        var Link = this.FindLinkByHeight(VBlock, Tx.Height);
        if(!Link)
            return "Error - TX Link not found";
        if(Tx.BlockNum !== Link.BlockNum || Tx.TxNum !== Link.TxNum)
            return "Error - The message " + GetHexFromArr12(Tx.RowHash) + " is not from the leader chain. FindNum=" + Link.BlockNum + " NeedNum=" + Tx.BlockNum;
        
        return 1;
    }
    
    FindLinkByHeight(ReadLink, NeedHeight)
    {
        var VBlockItem = this.CrossVBlockNum.Find(ReadLink);
        if(!VBlockItem)
            return undefined;
        var ReadHeight = VBlockItem.Height;
        if(ReadHeight === NeedHeight)
            return ReadLink;
        
        var Delta = ReadHeight - NeedHeight;
        if(Delta > 0)
        {
            for(var Step = VBlockItem.Links.length - 1; Step >= 0; Step--)
            {
                var Height = 1 << (Step);
                
                var CurHeight = ReadHeight - Height;
                var Item = VBlockItem.Links[Step];
                if(CurHeight === NeedHeight)
                    return Item;
                
                if(CurHeight > NeedHeight)
                {
                    return this.FindLinkByHeight(Item, NeedHeight);
                }
            }
        }
        
        return undefined;
    }
    
    SetCrossLinkArr(VBlock, PrevLinks, LastLink, CurrentHeight)
    {
        if(!LastLink.BlockNum)
            return;
        
        var Arr = [LastLink];
        for(var Step = 1; Step < 30; Step++)
        {
            var Height = 1 << (Step);
            
            var NeedHeight = CurrentHeight - Height;
            if(NeedHeight <= 0)
                break;
            
            var FindItem = this.FindLinkByHeight(LastLink, NeedHeight);
            if(!FindItem)
            {
                ToLog("" + VBlock.BlockNum + "  GetPrevVBlocks: Not find NeedHeight=" + NeedHeight, 3)
                return undefined;
            }
            
            Arr.push(FindItem)
        }
        VBlock.Links = Arr
    }
    
    GetCrossMsgByData(TR)
    {
        var Item = this.CrossRowHash.Find(TR);
        if(!Item)
            return "Error - not found TR by RowHash";
        
        var Find2 = this.CrossWorkHash.Find(Item);
        if(!Find2)
            return "Error - not found Msg by DataHash";
        
        Item.Msg = Find2.Msg
        Item.RunBlockNum = Find2.RunBlockNum
        Item.RunTxNum = Find2.RunTxNum
        return Item;
    }
    GetCrossOutList(start, count)
    {
        return this.GetScrollCrossList(this.CrossSend, start, count);
    }
    GetCrossInList(start, count)
    {
        var Arr = this.GetScrollCrossList(SERVER.CrossReceive, start, count);
        var ShardMapHeight = {};
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            Item.Shard = Item.Msg.ShardFrom
            Item.DataHash = GetDataHashMsg(Item.Msg)
            
            var WasConfirms = 0;
            var Find = this.GetCrossMsgByData(Item);
            if(typeof Find === "object")
            {
                Item.RunBlockNum = Find.RunBlockNum
                Item.RunTxNum = Find.RunTxNum
                
                Item.RowNum = Find.RowNum
                Item.Height = Find.Height
                Item.HeightStart = Find.HeightStart
                Item.BlockNumAdd = Find.BlockNum
                Item.TxNumAdd = Find.TxNum
                
                Item.BlockNumVote = Find.BlockNumVote
                Item.TxNumVote = Find.TxNumVote
                
                var LocalHeight = ShardMapHeight[Item.Shard];
                if(LocalHeight === undefined)
                {
                    var VBlock = this.ReadVBlock(Item.Msg.ShardFrom, Item.BlockNumVote);
                    if(VBlock)
                    {
                        LocalHeight = VBlock.Height
                        ShardMapHeight[Item.Shard] = LocalHeight
                    }
                }
                if(LocalHeight)
                {
                    WasConfirms = LocalHeight - (Find.HeightStart - Item.Msg.Confirms)
                }
            }
            else
            {
                Item.HeightStart = 0
                Item.RunBlockNum = 0
                Item.RunTxNum = 0
                Item.BlockNumVote = 0
            }
            Item.StatusStr = this.GetStatusMsgItem(Item)
            if(!Item.BlockNumAdd)
            {
                Item.ConfirmsStr = ""
            }
            else
            {
                if(Item.RunBlockNum)
                    Item.ConfirmsStr = Item.Msg.Confirms
                else
                    Item.ConfirmsStr = "" + WasConfirms + "/" + Item.Msg.Confirms
            }
        }
        return Arr;
    }
    
    GetStatusMsgItem(Item)
    {
        if(!Item.BlockNumAdd)
            return "1.Receved";
        if(!Item.RunBlockNum)
            return "2.Voting";
        return "3.Close";
    }
    
    GetCrossRunList(start, count)
    {
        var Arr = [];
        count = 50
        
        var it = this.CrossRowHash.Iterator(), Item;
        while((Item = it.next()) !== null)
        {
            var Find = this.GetCrossMsgByData(Item);
            if(typeof Find !== "object")
                continue;
            
            Arr.push(Find)
            
            count--
            if(count <= 0)
                break;
        }
        
        Arr.sort(function (a,b)
        {
            if(b.BlockNum !== a.BlockNum)
                return b.BlockNum - a.BlockNum;
            return b.Num - a.Num;
        })
        
        return Arr;
    }
    
    GetScrollCrossList(DB, start, count)
    {
        count = 25
        var Arr = [];
        for(var num = 0; num <= DB.GetMaxNum(); num++)
        {
            var Head = DB.ReadHead(num);
            if(!Head || !Head.Work)
                continue;
            
            DB.GetScrollList(Head.Num, count, undefined, Arr)
        }
        
        return Arr;
    }
    
    GetMaxCrossOutNum()
    {
        return this.CrossSend.GetMaxNum();
    }
    
    GetMaxCrossInNum()
    {
        return SERVER.CrossReceive.GetMaxNum();
    }
    GetMaxCrossRunNum()
    {
        return this.CrossWorkHash.GetCount();
    }
    
    GetCrossVBlockLinkByData(TR, BlockNum, TxNum)
    {
        var VBlockItem = this.CrossVBlockNum.Find({BlockNum:BlockNum, TxNum:TxNum});
        if(VBlockItem)
        {
            return VBlockItem.Links;
        }
    }
    TestTree()
    {
        this.VBlockTree.insert({BlockNum:100, Shard:"TEST1"})
        this.VBlockTree.insert({BlockNum:100, Shard:"TEST2"})
        
        this.VBlockTree.insert({BlockNum:101, Shard:"TEST1"})
        this.VBlockTree.insert({BlockNum:101, Shard:"TEST2"})
        
        this.VBlockTree.insert({BlockNum:102, Shard:"TEST1"})
        this.VBlockTree.insert({BlockNum:102, Shard:"TEST2"})
        
        this.VBlockTree.insert({BlockNum:103, Shard:""})
        ToLog("Find=" + this.WasFillVBlockTree(102))
        process.exit()
    }
    WasFillVBlockTree(BlockNum)
    {
        var Iter = this.VBlockTree.lowerBound({BlockNum:BlockNum, Shard:""});
        var Find = Iter.data();
        if(Find && Find.BlockNum === BlockNum)
            return 1;
        else
            return 0;
    }
};

global.GetDataHashMsg = function (Msg)
{
    var Arr = SerializeLib.GetBufferFromObject(Msg, FORMAT_CROSS_MSG, WorkStructCrossMsg);
    var Hash = sha3(Arr);
    return Hash;
}

module.exports = ShardCrossTX;
