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
    Engine.MiningBlockArr = {};
    Engine.CurrentBodyTx = new CBlockCache(function (a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    
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
        if(LastBlockNumMain >= BlockNumSave)
            return;
        var BlockNum = LastBlockNumMain + 1;
        if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Engine.WriteGenesisDB();
            return;
        }
        
        var PrevBlock = Engine.GetBlockHeaderDB(LastBlockNumMain);
        if(!PrevBlock)
            return;
        
        var BlockNew = Engine.GetNewBlock(PrevBlock);
        if(!BlockNew)
            return;
        BlockNew.CreateMode = 1;
        var ArrBlock = Engine.DB.GetChainArrByNum(BlockNum);
        var Block = undefined;
        var FindMax = 0;
        for(var n = 0; n < ArrBlock.length; n++)
        {
            var CurBlock = ArrBlock[n];
            if(IsEqArr(CurBlock.PrevSumHash, BlockNew.PrevSumHash) && IsEqArr(CurBlock.TreeHash, BlockNew.TreeHash))
            {
                
                if(!Block || (Block.SumPow < CurBlock.SumPow || (Block.SumPow === CurBlock.SumPow && CompareArr(CurBlock.PowHash, Block.PowHash) < 0)))
                    Block = CurBlock;
            }
        }
        
        if(Block)
        {
            FindMax = 1;
            Engine.CopyBodyTx(Block, BlockNew);
        }
        else
            if(!Block)
            {
                FindMax = 0;
                if(!global.USE_MINING)
                    return;
                
                Block = BlockNew;
            }
        
        if(!Engine.SaveToDB(Block))
        {
            Engine.ToLog("--Can not save DB block=" + BlockNum);
            return;
        }
        
        var Miner = ReadUintFromArr(Block.MinerHash, 0);
        Engine.ToLog("SAVE BLOCK=" + BlockInfo(Block) + " ### Miner=" + Miner, 4);
    };
    
    Engine.DoCreateNewBlock = function ()
    {
        var BlockNumNew = Engine.CurrentBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        var PrevBlockNum = BlockNumNew - 1;
        var LastBlockNumMain = Engine.GetMaxNumBlockDB();
        var PrevBlock = Engine.GetBlockHeaderDB(PrevBlockNum);
        if(!PrevBlock)
            return;
        
        var Block = Engine.GetNewBlock(PrevBlock);
        if(!Block)
        {
            Engine.ToLog("---Cannt create block=" + BlockNumNew);
            return;
        }
        
        Block.CreateMode = 2;
        Engine.AddToMining(Block);
        Engine.AddBlockToChain(Block);
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
        
        var Find = Engine.DB.FindBlockByHash(Block.BlockNum, Block.SumHash);
        if(Find)
        {
            if(NeedLoadBodyFromNet(Find))
            {
                Engine.CopyBodyTx(Find, Block);
            }
            else
            {
                Block = Find;
                return 1;
            }
        }
        Engine.DB.WriteBlock(Block);
        return 1;
    };
}
