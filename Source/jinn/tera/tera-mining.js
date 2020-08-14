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
    Engine.FillBodyFromTransferNext = function (Block)
    {
        
        var Tx0 = SERVER.GetDAppTransactions(Block.BlockNum);
        if(Tx0)
        {
            var TreeTTAll = Engine.GetTreeTicketAll(Block.BlockNum);
            var Tx = Engine.GetTx(Tx0.body, Block.BlockNum, undefined, 8);
            var TxAdd = Engine.AddToTreeWithAll(TreeTTAll, Tx);
            if(TxAdd)
                Block.TxData.unshift(TxAdd);
            else
                Block.TxData.unshift(Tx);
        }
    };
    
    Engine.GetNewBlockNext = function (Block,PrevBlock)
    {
        if(Block.BlockNum < global.UPDATE_CODE_JINN)
            return 0;
        var PrevHashNum = ReadUint32FromArr(Block.PrevSumHash, 28);
        Block.MinerHash = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        WriteUintToArrOnPos(Block.MinerHash, 0, 0);
        WriteUint32ToArrOnPos(Block.MinerHash, PrevHashNum, 28);
        
        return 1;
    };
    
    Engine.AddToMiningInner = function (Block)
    {
        
        var CurBlockNum = Engine.CurrentBlockNum;
        if(global.USE_MINING)
        {
            var Delta = CurBlockNum - Block.BlockNum;
            ToLog("Run mining BlockNum=" + Block.BlockNum + ", Delta=" + Delta, 5);
            
            Engine.ConvertToTera(Block);
            
            global.SetCalcPOW(Block, "FastCalcBlock");
        }
    };
    
    SERVER.MiningProcess = function (msg)
    {
        var MiningBlock;
        var PrevHash = msg.PrevHash;
        var DataHash = msg.SeqHash;
        var MinerHash = msg.AddrHash;
        
        var bWas = 0;
        var bFind = 0;
        var Arr = Engine.MiningBlockArr[msg.BlockNum];
        for(var i = 0; Arr && i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(IsEqArr(DataHash, Block.DataHash) && IsEqArr(PrevHash, Block.PrevHash))
            {
                bFind = 1;
                var MinerHashArr = Block.MinerHash.slice(0);
                if(DoBestMiningArr(Block, MinerHash, MinerHashArr))
                {
                    MiningBlock = Engine.GetCopyBlock(Block);
                    MiningBlock.PrevHash = PrevHash;
                    MiningBlock.MinerHash = MinerHashArr;
                    Engine.CalcBlockData(MiningBlock);
                    
                    bWas = 2;
                    Engine.AddFromMining(MiningBlock);
                    break;
                }
            }
        }
        
        if(!bFind)
        {
            var PrevBlock = Engine.DB.FindBlockByHash(msg.BlockNum - 1, PrevHash);
            if(PrevBlock)
            {
                MiningBlock = Engine.GetNewBlock(PrevBlock);
                MiningBlock.PrevHash = PrevHash;
                MiningBlock.MinerHash = MinerHash;
                Engine.CalcBlockData(MiningBlock);
                
                if(!IsEqArr(DataHash, MiningBlock.DataHash))
                {
                    
                    return;
                }
                
                bWas = 1;
                
                Engine.AddFromMining(MiningBlock);
            }
        }
        
        if(bWas && MiningBlock)
        {
            Engine.ToLog("Mining Block = " + BlockInfo(MiningBlock) + " Total=" + (msg.TotalCount / 1000000) + " M Power=" + MiningBlock.Power + "  Mode=" + bWas,
            5);
            
            ADD_TO_STAT("MAX:POWER", MiningBlock.Power);
            var HashCount = Math.pow(2, MiningBlock.Power);
            ADD_HASH_RATE(HashCount);
        }
    };
    
    function DoBestMiningArr(Block,MinerHashMsg,MinerHashArr)
    {
        
        var ValueOld = GetHashFromSeqAddr(Block.DataHash, Block.MinerHash, Block.BlockNum, Block.PrevHash);
        var ValueMsg = GetHashFromSeqAddr(Block.DataHash, MinerHashMsg, Block.BlockNum, Block.PrevHash);
        
        var bWas = 0;
        if(CompareArr(ValueOld.Hash1, ValueMsg.Hash1) > 0)
        {
            
            var Nonce1 = ReadUintFromArr(MinerHashMsg, 12);
            var DeltaNum1 = ReadUint16FromArr(MinerHashMsg, 24);
            WriteUintToArrOnPos(MinerHashArr, Nonce1, 12);
            WriteUint16ToArrOnPos(MinerHashArr, DeltaNum1, 24);
            
            bWas += 1;
        }
        if(CompareArr(ValueOld.Hash2, ValueMsg.Hash2) > 0)
        {
            
            var Nonce0 = ReadUintFromArr(MinerHashMsg, 6);
            var Nonce2 = ReadUintFromArr(MinerHashMsg, 18);
            var DeltaNum2 = ReadUint16FromArr(MinerHashMsg, 26);
            WriteUintToArrOnPos(MinerHashArr, Nonce0, 6);
            WriteUintToArrOnPos(MinerHashArr, Nonce2, 18);
            WriteUint16ToArrOnPos(MinerHashArr, DeltaNum2, 26);
            
            bWas += 2;
        }
        
        return bWas;
    };
}
