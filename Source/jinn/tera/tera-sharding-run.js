/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

module.exports.Init = Init;

const DEBUG_CROSS = 0;

const DELTA_CROSS_ADD_TO_VBLOCK = 2;

function Init(Engine)
{
    
    Engine.CanCreateNewBlock = function (BlockNumNew)
    {
        
        if(!global.USE_MINING_SHARDS)
            return 1;
        if(Engine.LastNumCreateNewBlock !== Engine.CurrentBlockNum)
        {
            Engine.LastNumCreateNewBlock = Engine.CurrentBlockNum;
            Engine.LastCountCreateNewBlock = 0;
        }
        Engine.LastCountCreateNewBlock++;
        
        if(Engine.IsCorrectTxData(BlockNumNew - 1) > 0)
            return 1;
        if(Engine.LastCountCreateNewBlock >= 10)
        {
            return 1;
        }
        
        return 0;
    };
    Engine.CreateVBlock = function (ShardData,VBlockFirst)
    {
        var RowNum, RowHash, Height;
        var MsgItem = SERVER.CrossReceive.Read(ShardData.Num);
        if(MsgItem)
        {
            if(VBlockFirst)
            {
                RowNum = VBlockFirst.RowNum;
                RowHash = VBlockFirst.RowHash;
                Height = VBlockFirst.Height;
            }
            else
            {
                RowNum = 0;
                RowHash = ZERO_ARR_32;
                Height = 0;
            }
            var bNeedFindFistBlock = !VBlockFirst;
            
            var Arr = [];
            while(MsgItem && MsgItem.RowNum >= RowNum)
            {
                if(bNeedFindFistBlock)
                {
                    var Find = SHARDS.CrossRowHashBlock.Find({RowHash:MsgItem.RowHash});
                    if(Find)
                    {
                        RowNum = Find.RowNum;
                        RowHash = Find.RowHash;
                        Height = Find.Height;
                        bNeedFindFistBlock = 0;
                    }
                }
                
                if(MsgItem.RowNum === RowNum)
                {
                    if(IsEqArr(MsgItem.RowHash, RowHash))
                    {
                        break;
                    }
                    else
                    {
                        ToLog("CreateVBlock: Error RowHash cross msg on RowNum=" + RowNum + " RowHash=" + GetHexFromArr8(RowHash) + "  MsgItem.RowHash=" + GetHexFromArr8(MsgItem.RowHash),
                        3);
                        return undefined;
                    }
                }
                
                if(MsgItem.BlockNum <= Engine.CurrentBlockNum - DELTA_CROSS_ADD_TO_VBLOCK)
                    Arr.unshift(MsgItem);
                
                MsgItem = SERVER.CrossReceive.ReadPrevItem(MsgItem);
            }
            if(Arr.length > JINN_CONST.MAX_CROSS_MSG_COUNT)
                Arr.length = JINN_CONST.MAX_CROSS_MSG_COUNT;
            
            var PrevRowHash = RowHash;
            var PrevRowNum = RowNum;
            
            if(Arr.length)
            {
                var LastRow = Arr[Arr.length - 1];
                RowHash = LastRow.RowHash;
                RowNum = LastRow.RowNum;
                
                if(Arr[0].RowNum !== PrevRowNum + 1)
                    return undefined;
            }
            
            if(IsZeroArr(RowHash))
                return undefined;
            
            var VBlockItem = {Type:TYPE_TRANSACTION_VBLOCK, ShardName:ShardData.ShardName, Confirms:ShardData.Confirms, PrevRowHash:PrevRowHash,
                PrevRowNum:PrevRowNum, CrossTx:Arr, StartRun:1, RowNum:RowNum, RowHash:RowHash, Height:Height + 1, };
            
            VBlockItem._Body = SerializeLib.GetBufferFromObject(VBlockItem, FORMAT_VBLOCK, WorkStructVBlock);
            VBlockItem.body = VBlockItem._Body;
            VBlockItem.Hash = sha3(VBlockItem._Body);
            
            return VBlockItem;
        }
        
        return undefined;
    };
    Engine.DoSendingCrossArr = function (BlockNum)
    {
        if(!global.USE_MINING || !global.USE_MINING_SHARDS)
            return [];
        if(SERVER.CrossReceive.Ready === 100)
            return [];
        
        if(Engine.IsCorrectTxData() !== 1)
            return  - 2;
        
        if(!SERVER.CrossReceive.Ready)
            return  - 3;
        
        Engine.UpdateVBlockChannelList();
        var TxArr = [];
        for(var Shard in Engine.VBlockChannelList)
        {
            var ShardData = Engine.VBlockChannelList[Shard];
            if(Engine.IsReadyCrossReceive(ShardData.Num) <= 0)
                continue;
            
            var HeadNum = ShardData.VBlockArr.length;
            if(HeadNum > 2)
            {
                HeadNum = 2;
                ShardData.VBlockArr.length = HeadNum;
            }
            
            var VBlockFirst = ShardData.VBlockArr[HeadNum - 1];
            var VBlock = Engine.CreateVBlock(ShardData, VBlockFirst);
            if(!VBlock)
                continue;
            if(Engine.StopSendCrossVBlock(ShardData, VBlock))
                continue;
            
            ShardData.VBlockArr.push(VBlock);
            VBlock.BlockNumAdd = BlockNum;
            
            TxArr.push(VBlock);
            if(DEBUG_CROSS && LOG_LEVEL >= 3)
            {
                var Str = "INFO: ";
                for(var i = 0; i < ShardData.VBlockArr.length; i++)
                {
                    var VBlock = ShardData.VBlockArr[i];
                    Str += VBlockInfo(VBlock);
                }
                ToLog(Str);
            }
        }
        
        return TxArr;
    };
    SERVER.DoCreateCrossArr = function (Block)
    {
        if(!global.USE_MINING_SHARDS)
            return [];
        
        if(Engine.IsCorrectTxData(Block.BlockNum - 1) !== 1)
            return [];
        
        var BlockNum = Block.BlockNum;
        
        Engine.UpdateVBlockChannelList();
        
        var Arr = [];
        for(var Shard in Engine.VBlockChannelList)
        {
            var ShardData = Engine.VBlockChannelList[Shard];
            
            var VBlockFirst = Engine.FindFirstVBlock(ShardData, BlockNum);
            if(!VBlockFirst)
                continue;
            if(VBlockFirst.BlockNumAdd > BlockNum)
                continue;
            
            var Find1 = SHARDS.CrossRowHashBlock.Find({RowHash:VBlockFirst.PrevRowHash});
            var Find2 = SHARDS.CrossRowHashBlock.Find({RowHash:VBlockFirst.RowHash});
            if(!Find1 && VBlockFirst.PrevRowNum || Find2 && VBlockFirst.RowNum > Find2.RowNum && VBlockFirst.CrossTx.length)
            {
                if(!Find1 && VBlockFirst.PrevRowNum)
                    ToLog("PrevRowHash not saved", 3);
                if(Find2 && VBlockFirst.RowNum > Find2.RowNum)
                    ToLog("Last RowHash was saved, TX:" + VBlockFirst.CrossTx.length, 3);
                ShardData.VBlockArr.length = 0;
                continue;
            }
            var LastHead = Engine.FindCrossHeadBlock(ShardData);
            if(!LastHead || !IsEqArr(LastHead.RowHash, VBlockFirst.PrevRowHash))
            {
                ToLog("HeadBlock was changed from: " + VBlockInfo(VBlockFirst) + " to: " + (LastHead ? GetHexFromArr8(LastHead.RowHash) : "-"),
                3);
                ShardData.VBlockArr.length = 0;
                continue;
            }
            
            DEBUG_CROSS && LOG_LEVEL >= 3 && ToLog("CREATE: " + VBlockInfo(VBlockFirst) + " on BlockNum=" + BlockNum);
            
            Arr.push({body:VBlockFirst._Body});
        }
        
        return Arr;
    };
}
