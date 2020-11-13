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

//support cross-tx engine (lib-module)

const WorkStructCrossMsg = {};

class ShardCrossLib extends require("./shard-cross-tr")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
    }
    ReadVBlock(BlockNum, TxNum)
    {
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(Block && Block.TxData)
        {
            {
                var Tx = Block.TxData[TxNum];
                if(Tx && Tx.body && Tx.body[0] === TYPE_TRANSACTION_VBLOCK)
                {
                    if(!GetVerifyTransaction(Block, TxNum))
                        return undefined;
                    var VBlock = SerializeLib.GetObjectFromBuffer(Tx.body, FORMAT_VBLOCK, WorkStructVBlock);
                    return VBlock;
                }
            }
        }
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
    GetCrossOutList(start, count)
    {
        return this.GetScrollCrossList(this.CrossSend, start, count);
    }
    GetCrossInList(start, count)
    {
        var Arr = this.GetScrollCrossList(SERVER.CrossReceive, start, count);
        
        var FindBlock = undefined, Height = 0, BlockNumVote = 0, TxNumVote = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            Item.DataHash = GetDataHashMsg(Item.Msg)
            var Find = this.CrossDataHashRun.Find(Item);
            if(Find)
            {
                Item.BlockNumRun = Find.BlockNumRun
                Item.TxNumRun = Find.TxNumRun
            }
            else
            {
                Item.BlockNumRun = 0
                Item.TxNumRun = 0
            }
            
            var WasConfirms = 0;
            var Find2 = this.CrossRowHashBlock.Find(Item);
            if(Find2)
                FindBlock = Find2
            
            if(FindBlock)
            {
                Item.HeightStart = FindBlock.HeightStart
                Item.BlockNumAdd = FindBlock.BlockNum
                Item.TxNumAdd = FindBlock.TxNum
                
                if(FindBlock.Height > Height)
                {
                    Height = FindBlock.Height
                    BlockNumVote = FindBlock.BlockNumVote
                    TxNumVote = FindBlock.TxNumVote
                }
                Item.Height = Height
                Item.BlockNumVote = BlockNumVote
                Item.TxNumVote = TxNumVote
                
                WasConfirms = Item.Height - Item.HeightStart
            }
            else
            {
                Item.Height = 0
                Item.HeightStart = 0
                Item.BlockNumVote = 0
                Item.BlockNumAdd = 0
            }
            Item.StatusStr = this.GetStatusMsgItem(Item)
            if(!Item.BlockNumAdd)
            {
                Item.ConfirmsStr = ""
            }
            else
            {
                if(Item.BlockNumRun)
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
        if(!Item.BlockNumRun)
            return "2.Voting";
        return "3.Close";
    }
    
    GetScrollCrossList(DB, start, count)
    {
        count = 25
        var Arr = [];
        for(var num = 0; num <= DB.GetMaxNum(); num++)
        {
            var Head = DB.ReadHead(num);
            if(!Head)
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
};

global.GetDataHashMsg = function (Msg)
{
    var Arr = SerializeLib.GetBufferFromObject(Msg, FORMAT_CROSS_MSG, WorkStructCrossMsg);
    var Hash = sha3(Arr);
    return Hash;
}

module.exports = ShardCrossLib;
