/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Mining"});

global.MAX_BLOCK_RECALC_DEPTH = 10;

//Engine context
function DoNode(Engine)
{
    if(Engine.ROOT_NODE)
        return 0;
    
    Engine.PrepareAndSendSysTx();
}

function InitClass(Engine)
{
    Engine.MiningBlockArr = {};
    Engine.LastPrevMiningBlock = undefined;
    Engine.TransferArrTree = new CBlockCache(function (a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    Engine.BlockPrevHashTree = new CBlockCache(function (a,b)
    {
        return CompareArr(a.PrevSumHash, b.PrevSumHash);
    });
    
    Engine.FillBodyFromTransfer = function (Block)
    {
        var CurBlockNum = Engine.CurrentBlockNum;
        var BlockNumLast = CurBlockNum - JINN_CONST.STEP_LAST;
        var BlockNumNew = CurBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        
        var Find = Engine.BlockPrevHashTree.FindItemInCache(Block);
        if(Find)
        {
            return Engine.CopyBodyTx(Block, Find);
        }
        
        Find = Engine.TransferArrTree.FindItemInCache(Block);
        if(!Find)
        {
            if(Block.BlockNum < BlockNumLast || Block.BlockNum > BlockNumNew)
            {
                Block.TxData = [];
                Block.SysTreeHash = ZERO_ARR_32;
                Block.TreeHash = ZERO_ARR_32;
                Block.TxCount = 0;
                Block.TxPosition = 0;
                return 0;
            }
            var Arr = Engine.GetArrTx(Block.BlockNum);
            Find = {BlockNum:Block.BlockNum, TxData:Arr.slice(0)};
            Engine.SortBlockPriority(Find);
            Engine.FilterAndCheckSizeBlockTXArray(Find);
            
            Engine.TransferArrTree.AddItemToCache(Find);
        }
        
        Block.TxData = Find.TxData.slice(0);
        Block.TxPosition = 0;
        Engine.FillBodyFromTransferNext(Block);
        Block.TxCount = Block.TxData.length;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        if(Block.PostProcessingVBlock)
            Block.PostProcessingVBlock(Block);
        
        Engine.BlockPrevHashTree.AddItemToCache(Block);
        
        return 1;
    };
    
    Engine.FillBodyFromTransferNext = function (Block)
    {
    };
    
    Engine.AddToMining = function (BlockNew)
    {
        if(!global.USE_MINING && !global.USE_API_MINING)
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
                
                var Block = Engine.GetMaxBlockFromDBChain(BlockNew);
                if(Block)
                {
                    if(IsEqArr(Block.TreeHash, BlockNew.TreeHash))
                    {
                        Engine.CopyBodyTx(Block, BlockNew);
                    }
                }
                else
                    if(!Block)
                    {
                        if(!global.USE_MINING && !global.USE_API_MINING)
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
    
    Engine.GetMaxBlockFromDBChain = function (BlockNew)
    {
        var BlockNum = BlockNew.BlockNum;
        var TreeHash = BlockNew.TreeHash;
        var MaxBlock = undefined;
        var ArrBlock = Engine.DB.GetChainArrByNum(BlockNum);
        for(var n = 0; n < ArrBlock.length; n++)
        {
            var CurBlock = ArrBlock[n];
            
            if(!MaxBlock || (MaxBlock.SumPow < CurBlock.SumPow || (MaxBlock.SumPow === CurBlock.SumPow && CompareArr(CurBlock.PowHash,
            MaxBlock.PowHash) < 0)))
            {
                if(!IsEqArr(CurBlock.TreeHash, TreeHash))
                    continue;
                if(!Engine.IsFullLoadedBlock(CurBlock, MAX_BLOCK_RECALC_DEPTH))
                    continue;
                
                MaxBlock = CurBlock;
            }
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
            JINN_WARNING >= 5 && Engine.ToLog("SAVE BLOCK=" + BlockInfo(Block) + " ### Miner=" + Miner + " Result=" + Result, 4);
        }
        
        return Result;
    };
    
    Engine.CanCreateNewBlock = function (BlockNumNew)
    {
        return 1;
    };
    
    Engine.DoCreateNewBlock = function ()
    {
        var BlockNumNew = Engine.CurrentBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        if(BlockNumNew < JINN_CONST.BLOCK_GENESIS_COUNT)
            return 0;
        if(!Engine.CanCreateNewBlock(BlockNumNew))
            return;
        
        var PrevBlockNum = BlockNumNew - 1;
        
        var PrevBlock = Engine.GetBlockHeaderDB(PrevBlockNum);
        if(!PrevBlock)
            return;
        
        if(Engine.LastPrevMiningBlock && Engine.LastPrevMiningBlock.BlockNum != PrevBlock.BlockNum)
            Engine.LastPrevMiningBlock = undefined;
        
        if(!global.USE_MINING && !global.USE_API_MINING)
            return;
        
        if(Engine.LastPrevMiningBlock)
        {
            
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
            Engine.ToLog("---Cannt create block=" + BlockNumNew, 3);
            return;
        }
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
            
            JINN_WARNING >= 5 && Engine.ToLog("AddFromMining Block = " + BlockInfo(Block) + " Power=" + Block.Power, 4);
            
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
        return Engine.DB.WriteBlock(Block);
    };
    
    Engine.PrepareAndSendSysTx = function ()
    {
    };
}
