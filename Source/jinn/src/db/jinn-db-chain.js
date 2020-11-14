/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

global.TEST_DB_BLOCK = 1;

var BWRITE_MODE = (global.PROCESS_NAME === "MAIN");

const JINN_VERSION_DB = 3;
const NUM_FOR_MAX_BLOCK =  - 1;


global.DB_HEADER_FORMAT = {VersionDB:"byte", BlockNum:"uint", PrevPosition:"uint", TreeHash:"hash", MinerHash:"hash", PrevSumPow:"uint",
    PrevSumHash:"hash", TxCount:"uint16", TxPosition:"uint", HeadPosH:"uint", HeadPosB:"uint", PrevBlockPosition:"uint", Reserve:"byte",
    TestZero:"arr8", };

if(global.Init_DB_HEADER_FORMAT)
    global.Init_DB_HEADER_FORMAT(DB_HEADER_FORMAT);

const BODY_FORMAT = {PrevPosition:"uint", PrevCountTx:"uint16", TxArr:[{body:"tr"}], TxIndex:["uint16"]};

class CDBChain
{
    constructor(EngineID, FCalcBlockHash)
    {
        this.EngineID = EngineID
        this.CalcBlockHash = FCalcBlockHash
        
        this.DBMainIndex = new CDBRow("main-index", {MainPosition:"uint"}, !BWRITE_MODE, "BlockNum", 10, 0, EngineID)
        this.DBChainIndex = new CDBRow("chain-index", {LastPosition:"uint"}, !BWRITE_MODE, "BlockNum", 10, 0, EngineID)
        this.DBBlockHeader = new CDBItem("block-data", DB_HEADER_FORMAT, !BWRITE_MODE, EngineID, 1)
        this.DBBlockBody = new CDBItem("block-data", BODY_FORMAT, !BWRITE_MODE, EngineID)
        
        this.MaxSumPow = 0
        this.MaxSumPowNum = 0
    }
    DoNode()
    {
    }
    
    Clear()
    {
        this.DBChainIndex.Clear()
        this.DBMainIndex.Clear()
        this.DBBlockHeader.Clear()
        this.DBBlockBody.Clear()
    }
    
    Close()
    {
        this.DBMainIndex.Close()
        this.DBChainIndex.Close()
        this.DBBlockHeader.Close()
        this.DBBlockBody.Close()
    }
    WriteBlock(Block)
    {
        
        var Item = this.ReadIndex(Block.BlockNum);
        if(!Item)
        {
            Item = {BlockNum:Block.BlockNum, LastPosition:0}
        }
        if(TEST_DB_BLOCK && !Block.Position)
        {
            var Find2 = this.FindBlockByHash(Block.BlockNum, Block.SumHash);
            if(Find2)
            {
                ToLogTrace("Find double block on Block=" + Block.BlockNum, 2)
            }
        }
        
        var bSet = 0;
        if(!Block.Position)
        {
            if(Block.Position === 0)
                ToLogTrace("Block.Position===0 on Block=" + Block.BlockNum)
            if(isNaN(Item.LastPosition))
                ToLogTrace("Is NAN LastPosition on Block=" + Block.BlockNum)
            
            Block.PrevPosition = Item.LastPosition
            bSet = 1
        }
        
        if(!IsZeroArr(Block.TreeHash) && Block.TxData && !Block.TxPosition)
        {
            Block.TxPosition = this.GetBodyFilePosition(Item.LastPosition, Block.BlockNum, Block.TreeHash, Block.TxData)
            Block.TxCount = Block.TxData.length
            if(!Block.TxPosition)
            {
                ToLogTrace("Error write tx on Block=" + Block.BlockNum + "  TxPosition=" + Block.TxPosition)
            }
        }
        
        JINN_STAT.WriteBlock++
        
        Block.VersionDB = JINN_VERSION_DB
        
        if(!this.DBBlockHeader.Write(Block))
            return 0;
        
        if(bSet)
        {
            Item.LastPosition = Block.Position
            return this.WriteIndex(Item);
        }
        
        return 1;
    }
    
    ReadBlock(Position, bRaw)
    {
        JINN_STAT.ReadBlock++
        
        var Block = this.DBBlockHeader.Read(Position);
        if(!Block)
            return undefined;
        if(Block.VersionDB !== JINN_VERSION_DB)
        {
            ToLogTrace("Error version DB: " + Block.VersionDB + "/" + JINN_VERSION_DB)
            return undefined;
        }
        if(!IsZeroArr(Block.TestZero))
        {
            ToLogOne("Error TestZero = " + GetHexFromArr(Block.TestZero) + " on PosFile=" + Position)
        }
        
        if(!bRaw)
            this.CalcBlockHash(Block)
        
        return Block;
    }
    
    WriteBlockMain(Block)
    {
        Block.BlockNum = Math.floor(Block.BlockNum)
        
        if(!Block.TxPosition && !Block.TxData && !IsZeroArr(Block.TreeHash))
        {
            
            ToLogTrace("Error - empty TxData on Block=" + Block.BlockNum)
            return 0;
        }
        if(Block.BlockNum > JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            var PrevBlock = this.ReadBlockMain(Block.BlockNum - 1);
            if(!PrevBlock)
            {
                ToLogTrace("Error read PrevBlock on block=" + Block.BlockNum)
                return 0;
            }
            if(!IsEqArr(PrevBlock.SumHash, Block.PrevSumHash))
            {
                ToLog("Error PrevSumHash on block=" + Block.BlockNum + "  " + GetHexFromArr(Block.PrevSumHash) + "/" + GetHexFromArr(PrevBlock.SumHash),
                3)
                return 0;
            }
        }
        
        if(Block.BlockNum >= this.MaxSumPowNum)
        {
            this.MaxSumPowNum = Block.BlockNum
            this.MaxSumPow = Block.SumPow
        }
        JINN_STAT.MaxSumPow = this.MaxSumPow
        
        if(!this.WriteBlock(Block))
            return 0;
        
        if(!IsZeroArr(Block.TreeHash) && !Block.TxPosition)
        {
            ToLogTrace("WriteBlockMain Zero TxPosition on Block=" + Block.BlockNum + "  TxPosition=" + Block.TxPosition + "  TxCount" + Block.TxCount)
            return 0;
        }
        
        if(!this.WriteMainIndex(Block.BlockNum, Block.Position))
            return 0;
        
        if(this.OnSaveMainDB)
            this.OnSaveMainDB(Block)
        
        this.TruncateMain(Block.BlockNum)
        
        return 1;
    }
    
    ReadBlockMain(BlockNum, bRaw)
    {
        var Item = this.ReadMainIndex(BlockNum);
        if(!Item)
            return undefined;
        else
        {
            var Block = this.ReadBlock(Item.MainPosition, bRaw);
            return Block;
        }
    }
    GetMaxIndex()
    {
        return this.DBChainIndex.GetMaxNum();
    }
    
    ReadIndex(BlockNum)
    {
        return this.DBChainIndex.Read(BlockNum);
    }
    
    WriteIndex(Item)
    {
        return this.DBChainIndex.Write(Item);
    }
    
    TruncateIndex(LastBlockNum)
    {
        this.DBChainIndex.Truncate(LastBlockNum)
    }
    GetMaxMainIndex()
    {
        return this.GetMaxNumBlockDBInner();
    }
    ReadMainIndex(BlockNum)
    {
        return this.DBMainIndex.Read(BlockNum);
    }
    
    WriteMainIndex(BlockNum, Position)
    {
        if(BlockNum >= 0 && !Position)
            ToLogTrace("WriteMainIndex:Error Position on Block=" + BlockNum)
        
        return this.DBMainIndex.Write({BlockNum:BlockNum, MainPosition:Position});
    }
    
    TruncateMain(LastBlockNum)
    {
        this.DBMainIndex.Truncate(LastBlockNum)
        this.WriteMainIndex(NUM_FOR_MAX_BLOCK, LastBlockNum)
    }
    GetMaxNumBlockDB()
    {
        return this.GetMaxMainIndex();
    }
    
    GetMaxNumBlockDBInner()
    {
        var Num = this.DBMainIndex.GetMaxNum();
        if(Num < 0)
            return  - 1;
        if(BWRITE_MODE)
            return Num;
        
        var Item = this.DBMainIndex.Read(NUM_FOR_MAX_BLOCK);
        if(!Item)
        {
            ToLogTrace("GetMaxNumBlockDB - no Item")
            return  - 1;
        }
        
        return Item.MainPosition;
    }
    LoadBlockTx(Block)
    {
        if(IsZeroArr(Block.TreeHash))
            return 1;
        if(Block.TxData)
            return 1;
        if(!Block.TxPosition)
        {
            Block.TxData = undefined
            ToLogTrace("Error TxPosition on Block=" + Block.BlockNum + "  TxPosition=" + Block.TxPosition + "  TxCount" + Block.TxCount)
            return 1;
        }
        
        JINN_STAT.ReadBody++
        var Data = this.DBBlockBody.Read(Block.TxPosition);
        if(!Data)
            return 0;
        
        Block.TxData = Data.TxArr
        
        return 1;
    }
    GetBodyFilePosition(LastPosition, BlockNum, TreeHash, TxData)
    {
        var Position = LastPosition;
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                Position = 0
                break;
            }
            
            if(Block.TxPosition && IsEqArr(TreeHash, Block.TreeHash))
            {
                return Block.TxPosition;
            }
            
            Position = Block.PrevPosition
        }
        
        if(!TxData)
            return 0;
        
        JINN_STAT.WriteBody++
        var Data = {TxArr:TxData};
        this.DBBlockBody.Write(Data)
        return Data.Position;
    }
    SetTxData(BlockNum, TreeHash, TxData)
    {
        if(IsZeroArr(TreeHash))
            return 0;
        var Item = this.ReadIndex(BlockNum);
        if(!Item)
            return 0;
        
        var TxPosition = this.GetBodyFilePosition(Item.LastPosition, BlockNum, TreeHash, TxData);
        if(!TxPosition)
            return 0;
        var Count = 0;
        var Position = Item.LastPosition;
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                Position = 0
                break;
            }
            
            if(IsEqArr(TreeHash, Block.TreeHash))
            {
                Count++
                
                if(!Block.TxPosition)
                {
                    Block.TxPosition = TxPosition
                    Block.TxCount = TxData.length
                    this.WriteBlock(Block)
                }
            }
            
            Position = Block.PrevPosition
        }
        
        return Count;
    }
    GetLastPosition(BlockNum)
    {
        if(BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            var Item = this.ReadMainIndex(BlockNum);
            if(Item)
                return Item.MainPosition;
        }
        else
        {
            var Item = this.ReadIndex(BlockNum);
            if(Item)
                return Item.LastPosition;
        }
        return 0;
    }
    
    GetChainArrByNum(BlockNum)
    {
        var Arr = [];
        var Position = this.GetLastPosition(BlockNum);
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                break;
            }
            
            Arr.push(Block)
            Position = Block.PrevPosition
        }
        JINN_STAT.MAXChainHeight = Math.max(JINN_STAT.MAXChainHeight, Arr.length)
        return Arr;
    }
    
    FindBlockByHash(BlockNum, Hash)
    {
        if(BlockNum > 0 && IsZeroArr(Hash))
        {
            ToLogTrace("ZERO Hash on FindBlockByHash Block=" + BlockNum)
            return undefined;
        }
        var Count = 0;
        var Position = this.GetLastPosition(BlockNum);
        while(Position)
        {
            var Block = this.ReadBlock(Position);
            if(!Block)
            {
                ToLogTrace("Error read block on Pos = " + Position + " on Block=" + BlockNum)
                break;
            }
            
            Count++
            
            if(IsEqArr(Hash, Block.SumHash))
            {
                return Block;
            }
            if(IsEqArr(Hash, Block.Hash))
            {
                return Block;
            }
            if(IsEqArr(Hash, Block.TreeHash))
            {
                return Block;
            }
            
            Position = Block.PrevPosition
        }
        
        JINN_STAT.MAXChainHeight = Math.max(JINN_STAT.MAXChainHeight, Count)
        
        return undefined;
    }
    
    GetPrevBlockDB(Block, bRaw, bMustHave)
    {
        if(Block.PrevBlockPosition)
        {
            if(global.TEST_DB_BLOCK)
                bRaw = 0
            
            var PrevBlock = this.ReadBlock(Block.PrevBlockPosition, bRaw);
            
            if(global.TEST_DB_BLOCK && PrevBlock && !IsEqArr(Block.PrevSumHash, PrevBlock.SumHash))
                PrevBlock = undefined
            
            if(PrevBlock)
                return PrevBlock;
            
            if(bMustHave)
            {
                ToLog("********* Must have GetPrevBlockDB on block = " + Block.BlockNum)
            }
        }
        
        var PrevBlock = this.GetPrevBlockDBInner(Block, bMustHave);
        if(PrevBlock)
        {
            if(JINN_CONST.HOT_BLOCK_DELTA && Block.BlockNum > JINN_EXTERN.GetCurrentBlockNumByTime() - JINN_CONST.HOT_BLOCK_DELTA)
                return PrevBlock;
            
            Block.PrevBlockPosition = PrevBlock.Position
            this.WriteBlock(Block)
        }
        return PrevBlock;
    }
    
    GetPrevBlockDBInner(Block)
    {
        if(!Block.BlockNum)
            return undefined;
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            return this.ReadBlockMain(Block.BlockNum - 1);
        
        if(IsZeroArr(Block.PrevSumHash))
        {
            ToLogTrace("ZERO PrevSumHash on Block=" + Block.BlockNum)
            return undefined;
        }
        var PrevBlock = this.FindBlockByHash(Block.BlockNum - 1, Block.PrevSumHash);
        return PrevBlock;
    }
    SetBlockJump(BlockSeed, Block, StrType)
    {
        if(StrType === "H" && JINN_CONST.HOT_BLOCK_DELTA && BlockSeed.BlockNum > JINN_EXTERN.GetCurrentBlockNumByTime() - JINN_CONST.HOT_BLOCK_DELTA)
            return 0;
        
        if(!Block.BlockNum)
            ToLogTrace("SetBlockJump: Block.BlockNum on BlockNum=" + BlockSeed.BlockNum + " to " + Block.BlockNum)
        
        if(!Block.Position)
        {
            ToLogTrace("SetBlockJump: Block.Position on BlockNum=" + BlockSeed.BlockNum)
            return 0;
        }
        
        if(Block.BlockNum >= BlockSeed.BlockNum)
        {
            ToLogTrace("SetBlockJump: BlockNum=" + Block.BlockNum + ">=" + BlockSeed.BlockNum)
            return 0;
        }
        
        if(BlockSeed["HeadPos" + StrType] === Block.Position)
            return 0;
        BlockSeed["HeadPos" + StrType] = Block.Position
        this.WriteBlock(BlockSeed)
        return 1;
    }
    
    GetBlockJump(BlockSeed, StrType, bRaw)
    {
        
        var BlockPosJump = BlockSeed["HeadPos" + StrType];
        if(!BlockPosJump)
            return undefined;
        
        var Block = this.ReadBlock(BlockPosJump, bRaw);
        return Block;
    }
    SaveChainToDBInner(BlockHead, BlockSeed)
    {
        var DB = this;
        
        var Result = this.WriteBlockMain(BlockHead);
        if(!Result)
            return Result;
        DB.TruncateMain(BlockHead.BlockNum)
        
        var Block = BlockSeed;
        var ArrNum = [], ArrPos = [];
        while(Block)
        {
            if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
                break;
            if(Block.BlockNum <= BlockHead.BlockNum)
                break;
            
            if(!Block.Position)
            {
                ToLogTrace("Error Block.Position on " + Block.BlockNum)
                return 0;
            }
            ArrNum.push(Block.BlockNum)
            ArrPos.push(Block.Position)
            if(ArrNum.length >= 100000)
            {
                if(!this.WriteArrNumPos(ArrNum, ArrPos))
                    return 0;
            }
            
            var PrevBlock = DB.GetPrevBlockDB(Block, 1);
            if(!PrevBlock)
            {
                ToLog("Error PrevBlock on Block=" + Block.BlockNum + " BlockHead=" + BlockHead.BlockNum + " PrevSumHash=" + GetHexFromArr(Block.PrevSumHash),
                4)
                return  - 1;
            }
            Block = PrevBlock
        }
        
        if(!this.WriteArrNumPos(ArrNum, ArrPos))
            return 0;
        DB.TruncateMain(BlockSeed.BlockNum)
        
        return 1;
    }
    
    WriteArrNumPos(ArrNum, ArrPos)
    {
        for(var i = ArrNum.length - 1; i >= 0; i--)
        {
            var BlockNum = ArrNum[i];
            var Pos = ArrPos[i];
            if(!Pos)
            {
                ToLog("Error Pos=" + Pos + " on Block=" + BlockNum, 1)
                return 0;
            }
            if(!this.WriteMainIndex(BlockNum, ArrPos[i]))
            {
                ToLog("Error WriteMainIndex on Block=" + BlockNum, 1)
                return 0;
            }
        }
        
        ArrNum.length = 0
        ArrPos.length = 0
        return 1;
    }
    
    TruncateChain(StartNum)
    {
        if(StartNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            this.Clear()
            return;
        }
        
        this.TruncateIndex(StartNum)
        this.TruncateMain(StartNum)
    }
    
    SaveChainToDB(BlockHead, BlockSeed)
    {
        var StartHotBlockNum = BlockSeed.BlockNum - JINN_CONST.HOT_BLOCK_DELTA;
        
        var Arr = [];
        while(BlockSeed.BlockNum >= StartHotBlockNum)
        {
            Arr.push(BlockSeed)
            var PrevBlockSeed = this.GetPrevBlockDB(BlockSeed, 0, 1);
            if(!PrevBlockSeed)
            {
                ToLog("#2 SaveChainToDB: Error PrevBlock on Block=" + BlockSeed.BlockNum, 2)
                return  - 1;
            }
            BlockSeed = PrevBlockSeed
        }
        var Result = 1;
        if(BlockSeed.BlockNum > BlockHead.BlockNum)
        {
            Result = this.SaveChainToDBInner(BlockHead, BlockSeed)
            if(this.InvalidateBufferMainDB)
                this.InvalidateBufferMainDB(BlockHead)
        }
        
        if(Result <= 0)
            return Result;
        for(var i = Arr.length - 1; i >= 0; i--)
        {
            if(!this.WriteBlockMain(Arr[i]))
            {
                ToError("Error WriteBlockMain")
                return 0;
            }
        }
        return Result;
    }
};

global.CDBChain = CDBChain;
