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

//support cross-tx engine (tr-module)


class ShardCrossTR extends require("./dapp")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
    }
    TRVBlock(Block, Body, BlockNum, TxNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num";
        if(ContextFrom)
            return "Only the transaction of miners is expected";
        
        var VBlock = SerializeLib.GetObjectFromBuffer(Body, FORMAT_VBLOCK, WorkStructVBlock);
        VBlock.Hash = sha3(Body)
        
        VBlock.ChannelName = VBlock.ShardName + ":" + VBlock.Confirms
        if(this.ShardProcessingTree.find(VBlock))
            return "VBlock with channel name: " + VBlock.ChannelName + " was processing";
        this.ShardProcessingTree.insert(VBlock)
        var ChannelDB = this.ReadChannel(VBlock.ChannelName);
        if(!ChannelDB || VBlock.ShardName === global.SHARD_NAME)
            return "Error VBlock channel name: " + VBlock.ChannelName;
        var Height, RowNum, PrevChannelNum;
        var PrevRowHash = VBlock.PrevRowHash;
        if(!IsZeroArr(PrevRowHash))
        {
            var PrevBlock = this.CrossRowHashBlock.Find({RowHash:VBlock.PrevRowHash});
            if(!PrevBlock)
                return "Error find Prev VBlock by RowHash=" + GetHexFromArr8(VBlock.RowHash);
            
            Height = PrevBlock.Height
            RowNum = PrevBlock.RowNum
            PrevChannelNum = PrevBlock.ChannelNum
        }
        else
        {
            Height = 0
            RowNum = 0
            PrevChannelNum = ChannelDB.Num
        }
        
        var Height = Height + 1;
        if(ChannelDB.Num !== PrevChannelNum)
            return "Error VBlock channel num=" + ChannelDB.Num;
        
        var RowHash = PrevRowHash;
        
        for(var i = 0; i < VBlock.CrossTx.length; i++)
        {
            var CurrentTx = VBlock.CrossTx[i];
            if(CurrentTx.Msg.Confirms !== VBlock.Confirms)
                return "Error VBlock Msg Confirms=" + CurrentTx.Msg.Confirms;
            CurrentTx.Msg.ShardFrom = VBlock.ShardName
            CurrentTx.Msg.ShardTo = global.SHARD_NAME
            CalcCrossRowItem(CurrentTx, RowNum, RowHash)
            
            RowNum = CurrentTx.RowNum
            RowHash = CurrentTx.RowHash
        }
        if(IsZeroArr(RowHash))
            return "Error Zero VBlock Hash form channel " + VBlock.ChannelName;
        var VBlockDB = this.CrossRowHashBlock.Find({RowHash:RowHash});
        if(VBlockDB)
        {
            this.CrossRowHashBlock.Remove(VBlockDB)
            
            VBlockDB.Height = Math.max(VBlockDB.Height + 1, Height)
            VBlockDB.BlockNumVote = BlockNum
            VBlockDB.TxNumVote = TxNum
            
            Height = VBlockDB.Height
        }
        else
        {
            VBlockDB = {RowHash:RowHash, RowNum:RowNum, BlockNum:BlockNum, TxNum:TxNum, HeightStart:Height, Height:Height, BlockNumVote:BlockNum,
                TxNumVote:TxNum, PrevRowHash:PrevRowHash, ChannelNum:ChannelDB.Num, }
        }
        this.CrossRowHashBlock.Insert(VBlockDB)
        if(Height > ChannelDB.MaxVBlock.Height)
        {
            ChannelDB.MaxVBlock = {BlockNum:BlockNum, TxNum:TxNum, Height:Height, RowNum:RowNum, RowHash:RowHash, Hash:VBlock.Hash, }
            if(VBlock.StartRun)
                this.CheckAndRunCrossTx(ChannelDB, VBlockDB, BlockNum, TxNum)
        }
        ChannelDB.LastHash = VBlock.Hash
        this.DBChannel.Write(ChannelDB)
        
        return true;
    }
    AddCrossTxToArr(Arr, CurBlock)
    {
        var VBlockData = this.ReadVBlock(CurBlock.BlockNum, CurBlock.TxNum);
        if(!VBlockData)
            throw "Error ReadVBlock on Block=" + CurBlock.BlockNum;
        if(!VBlockData.CrossTx.length)
            throw "Error VBlockData.CrossTx.length ob Block=" + CurBlock.BlockNum;
        
        var RowNum = VBlockData.PrevRowNum + VBlockData.CrossTx.length;
        for(var i = VBlockData.CrossTx.length - 1; i >= 0; i--)
        {
            var Item = VBlockData.CrossTx[i];
            Item.BlockNum = CurBlock.BlockNum
            Item.RowNum = RowNum
            Arr.unshift(Item)
            RowNum--
        }
    }
    
    CheckAndRunCrossTx(ChannelDB, VBlock, BlockNum, TxNum)
    {
        var ArrTx = [], ArrBlock = [];
        var Height = VBlock.Height;
        var CurBlock = VBlock;
        while(CurBlock)
        {
            if(CurBlock.BlockNumRun)
                break;
            
            var Delta = Height - CurBlock.HeightStart;
            if(Delta >= ChannelDB.Confirms)
            {
                this.AddCrossTxToArr(ArrTx, CurBlock)
                
                ArrBlock.unshift(CurBlock)
            }
            
            CurBlock = this.CrossRowHashBlock.Find({RowHash:CurBlock.PrevRowHash})
        }
        
        this.RunCrossTxByArr(ChannelDB, ArrTx, ArrBlock, BlockNum, TxNum)
    }
    
    RunCrossTxByArr(ChannelDB, ArrTx, ArrBlock, BlockNum, TxNum)
    {
        for(var i = 0; i < ArrBlock.length; i++)
        {
            var CurBlock = ArrBlock[i];
            this.CrossRowHashBlock.Remove(CurBlock)
            CurBlock.BlockNumRun = BlockNum
            CurBlock.TxNumRun = TxNum
            this.CrossRowHashBlock.Insert(CurBlock)
        }
        for(var i = 0; i < ArrTx.length; i++)
        {
            var Item = ArrTx[i];
            Item.Msg.ShardFrom = ChannelDB.ShardName
            Item.Msg.ShardTo = global.SHARD_NAME
            Item.DataHash = GetDataHashMsg(Item.Msg)
            
            if(!this.CrossDataHashRun.Find(Item))
            {
                Item.BlockNumRun = BlockNum
                Item.TxNumRun = TxNum
                this.CrossDataHashRun.Insert(Item)
            }
        }
        
        this.CrossRunArr = ArrTx
    }
    
    RunCrossTX(Block, Item, BlockNum, TxNum)
    {
        var AccountTo = Item.Msg.AccountTo;
        
        var Account = ACCOUNTS.ReadStateTR(AccountTo);
        if(!Account)
            return "TRCrossTX: Error account: " + AccountTo;
        if(!Account.Value.Smart)
            return "TRCrossTX: No smart on account: " + AccountTo;
        
        var ContextFrom = {};
        try
        {
            var Params = JSON.parse(Item.Msg.Params);
            RunSmartMethod(Block, Item.Msg, Account.Value.Smart, Account, BlockNum, TxNum, ContextFrom, Item.Msg.MethodName, Params, Item.Msg.ParamsArr,2);
        }
        catch(e)
        {
            return e;
        }
        
        return true;
    }
    
    AddCrossMsg(BlockNumFrom, TxNumFrom, AccountFrom, Iteration, Mode, ShardPath, Confirms, MethodName, Params, ParamsArr)
    {
        
        Confirms =  + Confirms
        
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
        
        var Name = ShardTo + ":" + Confirms;
        
        var ChannelDB = this.FindChannel(Name);
        if(!ChannelDB)
            throw "Not registered channel with name: " + Name;
        if(!this.CrossSend.Write(Name, Data, BlockNumFrom, 1))
            throw "Error write message to channel " + Name;
    }
};

module.exports = ShardCrossTR;
