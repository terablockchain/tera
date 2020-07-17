/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Mining"});

function InitClass(Engine)
{
    Engine.MiningBuffer = new CBlockCache(function (a,b)
    {
        return CompareArr(a.SumHash, b.SumHash);
    });
    Engine.CurrentBodyTx = new CBlockCache(function (a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    
    Engine.IsReadyChain = function (Block)
    {
        
        var CurBlockNumT = Engine.CurrentBlockNum;
        var BlockNumSave = CurBlockNumT - JINN_CONST.STEP_SAVE;
        var BlockNumDB = Engine.GetMaxNumBlockDB();
        if(BlockNumDB < BlockNumSave - 1)
            return 0;
        
        while(Block && Block.BlockNum >= BlockNumDB)
        {
            if(NeedLoadBodyFromNet(Block))
                break;
            
            if(Block.BlockNum === BlockNumDB)
                return Engine.IsExistBlockDB(Block);
            
            Block = Engine.GetPrevBlock(Block);
        }
        
        return 0;
    };
    
    Engine.AddToMining = function (BlockNew,bDB)
    {
        if(!global.USE_MINING)
            return;
        
        var Find = Engine.MiningBuffer.FindItemInCache({SumHash:BlockNew.PrevSumHash});
        if(Find && !Find.DB && bDB)
            Find = undefined;
        
        if(!Find)
        {
            BlockNew.DB = bDB;
            Engine.MiningBuffer.AddItemToCache({SumHash:BlockNew.PrevSumHash, BlockNum:BlockNew.BlockNum, DB:bDB});
            
            BlockNew.DB = bDB;
            Engine.AddToMiningInner(BlockNew);
            
            Engine.ToLog("Add new block to POW Block=" + BlockInfo(BlockNew), 4);
        }
    };
    
    Engine.DoSaveMainWithContinues = function ()
    {
        
        var CurBlockNumT = Engine.CurrentBlockNum;
        var BlockNumSave = CurBlockNumT - JINN_CONST.STEP_SAVE;
        
        var LastBlockNumMain = Engine.GetMaxNumBlockDB();
        if(LastBlockNumMain >= BlockNumSave)
            return;
        var BlockNum = LastBlockNumMain + 1;
        
        if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Engine.WriteGenesisDB();
            return;
        }
        
        var Block = Engine.GetMaxPowerBlockWithContinues(LastBlockNumMain, BlockNum, 1);
        if(!Block)
            return;
        if(!global.USE_MINING && Block.CreateMode)
            return;
        
        if(!Engine.SaveToDB(Block))
        {
            Engine.ToLog("--Can not save DB block=" + BlockNum);
            return;
        }
        
        var Miner = ReadUintFromArr(Block.MinerHash, 0);
        var Delta = CurBlockNumT - Block.BlockNum;
        Engine.ToLog("SAVE BLOCK=" + BlockInfo(Block) + " ### SumPow=" + Block.SumPow + " Miner=" + Miner + " Delta=" + Delta, 4);
    };
    
    Engine.DoCreateNewBlock = function ()
    {
        
        var BlockNumTime = Engine.CurrentBlockNum;
        var BlockNumSave = BlockNumTime - JINN_CONST.STEP_SAVE;
        var BlockNumNew = BlockNumTime - JINN_CONST.STEP_NEW_BLOCK;
        
        var LastBlockNumMain = Engine.GetMaxNumBlockDB();
        if(LastBlockNumMain < JINN_CONST.BLOCK_GENESIS_COUNT || LastBlockNumMain < BlockNumSave)
            return;
        if(BlockNumSave < JINN_CONST.BLOCK_GENESIS_COUNT)
            BlockNumSave = JINN_CONST.BLOCK_GENESIS_COUNT - 1;
        
        var Block = Engine.GetMaxPowerBlockWithContinues(BlockNumSave, BlockNumNew, 2);
        
        if(!Block)
        {
            Engine.ToLog("---Cannt create block=" + BlockNumNew);
            return;
        }
        
        Engine.AddToMining(Block, 1);
    };
    Engine.GetMaxPowerBlockWithContinues = function (BlockNumDB,BlockNum,CreateMode)
    {
        
        var Block = undefined;
        if(BlockNum <= BlockNumDB)
        {
            Block = Engine.GetBlockHeaderDB(BlockNum, 1);
        }
        else
        {
            var PrevBlock = Engine.GetMaxPowerBlockWithContinues(BlockNumDB, BlockNum - 1, CreateMode);
            if(PrevBlock)
            {
                var ArrBlock = Engine.DB.GetChainArrByNum(BlockNum);
                Block = Engine.GetMaxPowerBlockFromArr(ArrBlock, PrevBlock.SumHash);
                if(!Block)
                {
                    Block = Engine.GetNewBlock(PrevBlock, 1);
                    if(Block)
                    {
                        Block.CreateMode = CreateMode;
                        Block = Engine.AddBlockToChain(Block);
                    }
                }
            }
        }
        return Block;
    };
    
    Engine.GetMaxPowerBlockFromArr = function (ArrBlock,PrevBlockSumHash)
    {
        var MaxBlock = undefined;
        for(var n = 0; n < ArrBlock.length; n++)
        {
            var CurBlock = ArrBlock[n];
            if(IsEqArr(CurBlock.PrevSumHash, PrevBlockSumHash) && Engine.IsReadyChain(CurBlock))
            {
                if(!MaxBlock || (MaxBlock.SumPow < CurBlock.SumPow || (MaxBlock.SumPow === CurBlock.SumPow && CompareArr(CurBlock.Hash, MaxBlock.Hash) < 0)))
                    MaxBlock = CurBlock;
            }
        }
        return MaxBlock;
    };
    
    Engine.FillBodyFromTransfer = function (Block)
    {
        var Arr = Engine.GetArrTx(Block.BlockNum);
        
        Block.TxData = Arr.slice(0);
        Engine.SortBlockPriority(Block);
        Engine.CheckSizeBlockTXArray(Block.TxData);
        
        if(Engine.FillBodyFromTransferNext)
            Engine.FillBodyFromTransferNext(Block);
    };
    
    Engine.FillBodyTransferTx = function (Block)
    {
        var CurBlockNum = Engine.CurrentBlockNum;
        var BlockNumLast = CurBlockNum - JINN_CONST.STEP_LAST;
        var BlockNumNew = CurBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        
        if(Block.BlockNum < BlockNumLast || Block.BlockNum > BlockNumNew)
        {
            Block.TreeHash = ZERO_ARR_32;
            Block.TxCount = 0;
            return 0;
        }
        
        var Find = Engine.CurrentBodyTx.FindItemInCache(Block);
        if(Find)
        {
            Engine.CopyBodyTx(Block, Find);
        }
        else
        {
            Engine.FillBodyFromTransfer(Block);
            
            Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
            
            Block.TxCount = Block.TxData.length;
            Engine.CurrentBodyTx.AddItemToCache(Block);
        }
        
        return 1;
    };
    Engine.InitMiningBlockArr = function ()
    {
        Engine.MiningBlockArr = {};
    };
    
    Engine.AddToMiningInner = function (Block)
    {
        var BlockTest = Engine.GetCopyBlock(Block);
        BlockTest.DataHash = Block.DataHash;
        
        var MinerMaxArr;
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
            
            Block = Engine.GetCopyBlock(Block);
            
            Block.MinerHash = MinerMaxArr;
            Engine.CalcBlockData(Block);
            
            var Arr = Engine.MiningBlockArr[Block.BlockNum];
            if(!Arr)
            {
                Arr = [];
                Engine.MiningBlockArr[Block.BlockNum] = Arr;
            }
            Arr.push(Block);
        }
    };
    
    Engine.AfterMiningDoBlockArr = function (BlockNum)
    {
        var Arr = Engine.MiningBlockArr[BlockNum];
        if(!Arr)
            return;
        
        for(var i = 0; i < Arr.length; i++)
        {
            var MiningBlock = Arr[i];
            
            if(Engine.AddBlockToChain(MiningBlock, 1))
            {
                Engine.ToLog("AddBlockToChain Block = " + BlockInfo(MiningBlock) + " Power=" + MiningBlock.Power, 4);
                
                Engine.StepTaskMax[BlockNum] = 1;
            }
        }
    };
    Engine.AddBlockToChain = function (Block,bAddOnlyMax)
    {
        var Result =  - 1;
        var CurBlockNum = Engine.CurrentBlockNum;
        if(Block.BlockNum >= CurBlockNum - JINN_CONST.STEP_LAST - JINN_CONST.MAX_DELTA_PROCESSING)
            Result = Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
        
        if(Block.DB)
            bAddOnlyMax = 0;
        
        if(bAddOnlyMax && Result ===  - 1)
        {
            return undefined;
        }
        
        var Find = Engine.DB.FindBlockByHash(Block.BlockNum, Block.SumHash);
        if(Find)
        {
            if(NeedLoadBodyFromNet(Find))
            {
                Engine.CopyBodyTx(Find, Block);
                Block = Find;
            }
            else
            {
                Block = Find;
                return Block;
            }
        }
        Engine.DB.WriteBlock(Block);
        return Block;
    };
    Engine.InitMiningBlockArr();
}
