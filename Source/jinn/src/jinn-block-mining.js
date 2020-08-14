/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Mining"});

const MAX_BLOCK_RECALC_DEPTH = 10;

function InitClass(Engine)
{
    Engine.MiningBlockArr = {};
    Engine.LastPrevMiningBlock = undefined;
    Engine.CurrentBodyTx = new CBlockCache(function (a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    
    Engine.FillBodyFromTransfer = function (Block)
    {
        var CurBlockNum = Engine.CurrentBlockNum;
        var BlockNumLast = CurBlockNum - JINN_CONST.STEP_LAST;
        var BlockNumNew = CurBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        
        var Find = Engine.CurrentBodyTx.FindItemInCache(Block);
        if(Find)
        {
            Engine.CopyBodyTx(Block, Find);
        }
        else
        {
            if(Block.BlockNum < BlockNumLast || Block.BlockNum > BlockNumNew)
            {
                Block.TreeHash = ZERO_ARR_32;
                Block.TxCount = 0;
                return 0;
            }
            var Arr = Engine.GetArrTx(Block.BlockNum);
            Block.TxData = Arr.slice(0);
            Engine.SortBlockPriority(Block);
            Engine.CheckSizeBlockTXArray(Block.TxData);
            
            if(Engine.FillBodyFromTransferNext)
                Engine.FillBodyFromTransferNext(Block);
            
            Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
            
            Block.TxCount = Block.TxData.length;
            Engine.CurrentBodyTx.AddItemToCache(Block);
        }
        
        return 1;
    };
    
    Engine.AddToMining = function (BlockNew)
    {
        if(!global.USE_MINING)
            return;
        
        Engine.AddToMiningInner(BlockNew);
    };
    
    Engine.DoSaveMain = function ()
    {
        
        var CurBlockNumT = Engine.CurrentBlockNum;
        var BlockNumSave = CurBlockNumT - JINN_CONST.STEP_SAVE;
        
        var LastBlockNumMain = Engine.GetMaxNumBlockDB();
        
        if(LastBlockNumMain + 1 < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Engine.WriteGenesisDB();
            return;
        }
        
        if(LastBlockNumMain >= BlockNumSave)
            return;
        else
            if(LastBlockNumMain < BlockNumSave)
            {
                var BlockNum = LastBlockNumMain + 1;
                
                var PrevBlock = Engine.GetBlockHeaderDB(LastBlockNumMain);
                if(!PrevBlock)
                    return;
                
                var BlockNew = Engine.GetNewBlock(PrevBlock);
                if(!BlockNew)
                    return;
                BlockNew.CreateMode = 1;
                var Block = Engine.GetMaxBlockFromDBChain(BlockNum, undefined, BlockNew.TreeHash);
                if(Block)
                {
                    Engine.CopyBodyTx(Block, BlockNew);
                }
                else
                    if(!Block)
                    {
                        if(!global.USE_MINING)
                            return;
                        
                        Block = BlockNew;
                    }
            }
        if(!Engine.SaveToDBWithPrevs(Block, MAX_BLOCK_RECALC_DEPTH))
        {
            Engine.ToLog("--Can not save DB block=" + Block.BlockNum);
            return;
        }
    };
    
    Engine.GetMaxBlockFromDBChain00 = function (BlockNum,MaxBlock,TreeHash,PrevSumHash)
    {
        var ArrBlock = Engine.DB.GetChainArrByNum(BlockNum);
        for(var n = 0; n < ArrBlock.length; n++)
        {
            var CurBlock = ArrBlock[n];
            if(IsEqArr(CurBlock.PrevSumHash, PrevSumHash) && IsEqArr(CurBlock.TreeHash, TreeHash))
            {
                if(!MaxBlock || (MaxBlock.SumPow < CurBlock.SumPow || (MaxBlock.SumPow === CurBlock.SumPow && CompareArr(CurBlock.PowHash,
                MaxBlock.PowHash) < 0)))
                    MaxBlock = CurBlock;
            }
        }
        return MaxBlock;
    };
    
    Engine.GetMaxBlockFromDBChain = function (BlockNum,MaxBlock,TreeHash)
    {
        var ArrBlock = Engine.DB.GetChainArrByNum(BlockNum);
        for(var n = 0; n < ArrBlock.length; n++)
        {
            var CurBlock = ArrBlock[n];
            if(!IsEqArr(CurBlock.TreeHash, TreeHash))
                continue;
            if(!Engine.IsFullLoadedBlock(CurBlock, MAX_BLOCK_RECALC_DEPTH))
                continue;
            if(!MaxBlock || (MaxBlock.SumPow < CurBlock.SumPow || (MaxBlock.SumPow === CurBlock.SumPow && CompareArr(CurBlock.PowHash,
            MaxBlock.PowHash) < 0)))
                MaxBlock = CurBlock;
        }
        return MaxBlock;
    };
    
    Engine.IsFullLoadedBlock = function (Block,MaxIteration)
    {
        if(MaxIteration <= 0)
            return 0;
        
        if(!Block)
            return 0;
        
        if(Engine.IsExistBlockMain(Block))
            return 1;
        
        if(!IsZeroArr(Block.TreeHash) && !Block.TxPosition)
            return 0;
        
        return Engine.IsFullLoadedBlock(Engine.GetPrevBlock(Block), MaxIteration - 1);
    };
    
    Engine.SaveToDBWithPrevs = function (Block,MaxIteration)
    {
        if(MaxIteration <= 0)
            return 0;
        
        if(!Block)
            return 0;
        
        if(!IsZeroArr(Block.TreeHash) && !Block.TxPosition && !Block.TxData)
        {
            Engine.ToLog("SaveToDBWithPrevs : Not found body tx in BLOCK=" + Block.BlockNum, 3);
            return 0;
        }
        
        if(Engine.IsExistBlockMain(Block))
            return 1;
        
        var Result = Engine.SaveToDBWithPrevs(Engine.GetPrevBlock(Block), MaxIteration - 1);
        if(Result)
        {
            
            Result = Engine.SaveToDB(Block);
            var Miner = ReadUintFromArr(Block.MinerHash, 0);
            Engine.ToLog("SAVE BLOCK=" + BlockInfo(Block) + " ### Miner=" + Miner + " Result=" + Result, 4);
        }
        
        return Result;
    };
    
    Engine.DoCreateNewBlock = function ()
    {
        var BlockNumNew = Engine.CurrentBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        var PrevBlockNum = BlockNumNew - 1;
        var PrevBlock = Engine.GetBlockHeaderDB(PrevBlockNum);
        if(!PrevBlock)
            return;
        
        if(Engine.LastPrevMiningBlock && Engine.LastPrevMiningBlock.BlockNum != PrevBlock.BlockNum)
            Engine.LastPrevMiningBlock = undefined;
        
        if(Engine.LastPrevMiningBlock)
        {
            if(!global.USE_MINING)
                return;
            
            var WasBlock = Engine.LastPrevMiningBlock;
            if(PrevBlock.SumPow < WasBlock.SumPow || PrevBlock.SumPow === WasBlock.SumPow && CompareArr(WasBlock.PowHash, PrevBlock.PowHash) <= 0)
                return;
            
            Engine.MiningBlockArr[BlockNumNew.BlockNum] = [];
            
            Engine.ToLog("--- Remining Block:" + BlockNumNew + " prev Power=" + PrevBlock.Power + " was Power=" + Engine.LastPrevMiningBlock.Power,
            4);
        }
        
        var Block = Engine.GetNewBlock(PrevBlock);
        if(!Block)
        {
            Engine.ToLog("---Cannt create block=" + BlockNumNew);
            return;
        }
        
        Block.CreateMode = 2;
        Block.StepNum = (Engine.LastPrevMiningBlock ? 2 : 1);
        Engine.AddToMining(Block);
        Engine.AddBlockToChain(Block);
        Engine.LastPrevMiningBlock = PrevBlock;
    };
    
    Engine.AddToMiningInner = function (Block)
    {
        var CountCPU = 3;
        //Only modeling
        for(var i = 0; i < CountCPU; i++)
            Engine.StartModelingMining(Block, i);
    };
    
    Engine.StartModelingMining = function (Block,Stage)
    {
        //Only modeling for a test purpose
        
        var BlockTest = Engine.GetCopyBlock(Block);
        BlockTest.DataHash = Block.DataHash;
        
        var MinerMaxArr = undefined;
        var HashMaxArr = Block.Hash;
        BlockTest.MinerHash = [Engine.ID % 256, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0];
        for(var i = 0; i < 8; i++)
        {
            BlockTest.MinerHash[10] = random(255);
            BlockTest.MinerHash[11] = random(255);
            
            var HashTest = Engine.CalcBlockHashInner(BlockTest);
            if(CompareArr(HashTest, HashMaxArr) < 0)
            {
                HashMaxArr = HashTest;
                MinerMaxArr = BlockTest.MinerHash.slice(0);
            }
        }
        
        if(MinerMaxArr)
        {
            
            var BlockNew = Engine.GetCopyBlock(Block);
            
            BlockNew.MinerHash = MinerMaxArr;
            Engine.CalcBlockData(BlockNew);
            
            Engine.AddFromMining(BlockNew, Stage);
        }
    };
    Engine.AddFromMining = function (Block)
    {
        
        if(Engine.CheckMaxHashCreate)
            Engine.CheckMaxHashCreate(Block);
        var Arr = Engine.MiningBlockArr[Block.BlockNum];
        if(!Arr)
        {
            Arr = [];
            Engine.MiningBlockArr[Block.BlockNum] = Arr;
        }
        
        for(var i = 0; i < Arr.length; i++)
        {
            if(IsEqArr(Block.Hash, Arr[i].Hash))
                return 0;
        }
        
        var bAddOnlyMax = Arr.length;
        Arr.push(Block);
        
        if(Engine.AddBlockToChain(Block, bAddOnlyMax))
        {
            Engine.ToLog("AddBlockToChain Block = " + BlockInfo(Block) + " Power=" + Block.Power, 4);
            
            Engine.StepTaskMax[Block.BlockNum] = 1;
        }
        
        return 1;
    };
    
    Engine.AddBlockToChain = function (Block,bAddOnlyMax)
    {
        
        var Result =  - 1;
        if(Block.BlockNum >= Engine.CurrentBlockNum - JINN_CONST.STEP_LAST - JINN_CONST.MAX_DELTA_PROCESSING)
            Result = Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
        
        if(bAddOnlyMax && Result < 0)
        {
            return undefined;
        }
        
        var Find = Engine.DB.FindBlockByHash(Block.BlockNum, Block.Hash);
        if(Find)
        {
            return 1;
        }
        Engine.DB.WriteBlock(Block);
        return 1;
    };
}
