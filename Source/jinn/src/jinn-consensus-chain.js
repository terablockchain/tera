/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"ConsensusChain"});

global.TEST_BLOCK_LIST = 0;

//Engine context

function InitClass(Engine)
{
    Engine.InitBlockList = function ()
    {
    };
    
    Engine.SetBlockBody = function (BlockDst,BlockSrc)
    {
        BlockDst.TxData = BlockSrc.TxData;
        
        BlockDst.TxPosition = BlockSrc.TxPosition;
        BlockDst.TxCount = BlockSrc.TxCount;
    };
    
    Engine.GetPrevBlock = function (Block)
    {
        return Engine.DB.GetPrevBlockDB(Block);
    };
    Engine.GetFirstHeadBlock0 = function (BlockSeed)
    {
        var Block = BlockSeed;
        while(Block)
        {
            if(Engine.IsExistBlockMain(Block))
                break;
            
            var PrevBlock = Engine.GetPrevBlock(Block);
            if(!PrevBlock)
                break;
            
            Block = PrevBlock;
        }
        return Block;
    };
    Engine.GetFirstEmptyBodyBlock0 = function (FirstBlockHeadNum,BlockSeed)
    {
        var Block = BlockSeed;
        while(Block)
        {
            if(Block.BlockNum < FirstBlockHeadNum)
            {
                Block = undefined;
                break;
            }
            
            if(NeedLoadBodyFromNet(Block))
            {
                break;
            }
            
            Block = Engine.GetPrevBlock(Block);
        }
        
        return Block;
    };
    
    Engine.GetStrFromJumpArr = function (ArrJump)
    {
        var Str = " Arr:";
        var Str2 = "";
        var bWas = 0;
        for(var i = 0; i < ArrJump.length; i++)
        {
            var CurBlock = ArrJump[i];
            if(CurBlock)
            {
                if(bWas)
                {
                    Str += "-";
                    Str2 += "-";
                }
                Str += CurBlock.BlockNum;
                Str2 += GetHexFromArr(CurBlock.SumHash).substr(0, 6);
                bWas = 1;
            }
        }
        return Str + " (" + Str2 + ")";
    };
    Engine.AddJumpToArr = function (BlockSeed,Block,Arr)
    {
        var Delta = BlockSeed.BlockNum - Block.BlockNum;
        if(Delta > 0)
        {
            
            var Level = Math.floor(Math.log10(Delta));
            
            if(!Arr[Level])
                Arr[Level] = Block;
        }
    };
    Engine.GetFirstHeadBlock = function (BlockSeed)
    {
        
        var bRaw = 1;
        if(global.TEST_BLOCK_LIST)
            bRaw = 0;
        
        var Count = 0;
        var BlockSeed0 = BlockSeed;
        var Block = BlockSeed;
        
        var ArrJump = [];
        var BlockJump = undefined;
        while(true)
        {
            Count++;
            if(Engine.IsExistBlockMain(Block))
            {
                break;
            }
            
            if(Count >= 2)
            {
                var BlockHead = Engine.DB.GetBlockJump(Block, "H", bRaw);
                if(BlockHead)
                {
                    Engine.AddJumpToArr(BlockSeed0, BlockHead, ArrJump);
                    
                    BlockJump = BlockHead;
                    Block = BlockHead;
                    
                    continue;
                }
            }
            
            var PrevBlock = Engine.GetPrevBlock(Block, bRaw);
            if(!PrevBlock)
                break;
            
            if(!IsEqArr(Block.PrevSumHash, PrevBlock.SumHash))
                ToLogTrace("Error PrevSumHash on Block=" + Block.BlockNum);
            
            Engine.AddJumpToArr(BlockSeed0, Block, ArrJump);
            Block = PrevBlock;
        }
        if(TEST_BLOCK_LIST)
        {
            var Block0 = Engine.GetFirstHeadBlock0(BlockSeed);
            if(Block && Block0 && Block0 !== Block && !IsEqArr(Block0.SumHash, Block.SumHash) && Block.BlockNum > Block0.BlockNum)
            {
                var Str = "Err from seed:" + BlockInfo(BlockSeed) + " BlockHead = " + BlockInfo(Block) + "  Need = " + BlockInfo(Block0);
                Engine.ToLog(Str);
            }
        }
        
        var Delta = BlockSeed0.BlockNum - Block.BlockNum;
        if(Delta > 0 && Count >= 2)
        {
            if(!ArrJump.length || ArrJump[ArrJump.length - 1] !== Block)
                ArrJump.push(Block);
            
            var nSet = 0;
            var StrSet = "";
            var PrevBlock = BlockSeed0;
            for(var i = 0; i < ArrJump.length; i++)
            {
                var CurBlock = ArrJump[i];
                if(CurBlock)
                {
                    if(Engine.DB.SetBlockJump(PrevBlock, CurBlock, "H"))
                    {
                        if(StrSet)
                            StrSet += ",";
                        StrSet += "" + PrevBlock.BlockNum + "->" + CurBlock.BlockNum;
                        nSet++;
                    }
                    PrevBlock = CurBlock;
                }
            }
            if(Count > 2000)
                Engine.ToLog("[" + Count + "/" + nSet + "]" + "  jump: " + Delta + "   " + BlockSeed0.BlockNum + "->" + Block.BlockNum + "   " + GetHexFromArr(BlockSeed0.SumHash).substr(0,
                8) + "->" + GetHexFromArr(Block.SumHash).substr(0, 8) + Engine.GetStrFromJumpArr(ArrJump) + "  " + StrSet, 3);
        }
        
        JINN_STAT.FindHeadCount += Count;
        JINN_STAT.MAXFindHeadCount = Math.max(JINN_STAT.MAXFindHeadCount, Count);
        if(Block && !Block.Hash)
            Engine.CalcBlockData(Block);
        return Block;
    };
    
    Engine.GetFirstEmptyBodyBlock = function (FirstBlockHeadNum,BlockSeed)
    {
        var Count = 0;
        var Block = BlockSeed;
        var BlockSet, JumpBlock, JumpBlockTo;
        
        var bRaw = 1;
        if(global.TEST_BLOCK_LIST)
            bRaw = 0;
        while(Block)
        {
            BlockSet = Block;
            Count++;
            if(Block.BlockNum < FirstBlockHeadNum || Engine.IsExistBlockMain(Block))
            {
                Block = undefined;
                break;
            }
            
            if(NeedLoadBodyFromNet(Block))
            {
                break;
            }
            
            var FirstBlock = Engine.DB.GetBlockJump(Block, "B", bRaw);
            if(FirstBlock)
            {
                JumpBlock = Block;
                JumpBlockTo = FirstBlock;
                
                Block = FirstBlock;
                BlockSet = JumpBlockTo;
                continue;
            }
            
            Block = Engine.GetPrevBlock(Block, bRaw);
        }
        JINN_STAT.FindEmptyCount += Count;
        JINN_STAT.MAXFindEmptyCount = Math.max(JINN_STAT.MAXFindEmptyCount, Count);
        if(TEST_BLOCK_LIST)
        {
            var Block0 = Engine.GetFirstEmptyBodyBlock0(FirstBlockHeadNum, BlockSeed);
            if(Block && Block0 && Block0 !== Block && !IsEqArr(Block0.SumHash, Block.SumHash))
            {
                var Str = "Err EmptyBody = " + BlockInfo(Block) + "  Need = " + BlockInfo(Block0) + "  FirstBlockHead=" + FirstBlockHeadNum;
                if(JumpBlock)
                    Str += "  JumpBlock = " + BlockInfo(JumpBlock) + " -> " + BlockInfo(JumpBlockTo);
                Engine.ToLog(Str);
            }
        }
        
        if(BlockSeed && BlockSet && BlockSeed.BlockNum !== BlockSet.BlockNum)
        {
            Engine.DB.SetBlockJump(BlockSeed, BlockSet, "B");
        }
        
        if(Block && !Block.Hash)
            Engine.CalcBlockData(Block);
        
        return Block;
    };
    
    Engine.IsExistBlockMain = function (Block)
    {
        
        if(Block.BlockNum > Engine.GetMaxNumBlockDB())
            return 0;
        
        var BlockDB = Engine.DB.ReadBlockMain(Block.BlockNum, 1);
        if(!BlockDB)
            return 0;
        if(!IsEqArr(Block.TreeHash, BlockDB.TreeHash))
            return 0;
        if(!IsEqArr(Block.MinerHash, BlockDB.MinerHash))
            return 0;
        if(!IsEqArr(Block.PrevSumHash, BlockDB.PrevSumHash))
            return 0;
        if(Block.PrevSumPow !== BlockDB.PrevSumPow)
            return 0;
        
        return 1;
    };
    Engine.InitBlockList();
}

