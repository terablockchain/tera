/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * The entry in the database (the base class, DB emulation)
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter, DoNode:DoNode, Name:"BlockDB"});

var BWRITE_MODE = (global.PROCESS_NAME === "MAIN");

//Engine context

function InitClass(Engine)
{
    
    Engine.InitDB = function ()
    {
        
        if(BWRITE_MODE)
            Engine.DB = new CDBBlockCache(Engine.ID, Engine.CalcBlockData);
        else
            Engine.DB = new CDBBodyCache(Engine.ID, Engine.CalcBlockData);
        
        Engine.DB.OnSaveMainDB = Engine.OnSaveMainDB;
        Engine.DB.InvalidateBufferMainDB = Engine.InvalidateBufferMainDB;
    };
    Engine.Close = function ()
    {
        Engine.DB.Close();
    };
    
    Engine.WriteGenesisDB = function ()
    {
        for(var Num = 0; Num < JINN_CONST.BLOCK_GENESIS_COUNT; Num++)
        {
            var Block = Engine.GetGenesisBlock(Num);
            Engine.SaveToDB(Block, 0, 1);
        }
    };
    
    Engine.OnSaveMainDB = function (Block)
    {
    };
    Engine.InvalidateBufferMainDB = function (Block)
    {
    };
    
    Engine.GetBlockDB = function (BlockNum)
    {
        var Block = Engine.GetBlockHeaderDB(BlockNum);
        Engine.CheckLoadBody(Block);
        return Block;
    };
    
    Engine.GetBlockHeaderDB = function (BlockNum,bMustHave)
    {
        var Block = Engine.GetBlockHeaderDBNext(BlockNum);
        if(!Block && bMustHave)
        {
            ToLogTrace("Error find block in DB on Num = " + BlockNum);
            var Block2 = Engine.GetBlockHeaderDBNext(BlockNum);
        }
        return Block;
    };
    
    Engine.GetBlockHeaderDBNext = function (BlockNum)
    {
        var MaxNum = Engine.GetMaxNumBlockDB();
        if(BlockNum > MaxNum)
            return undefined;
        
        var Block = Engine.DB.ReadBlockMain(BlockNum);
        return Block;
    };
    
    Engine.SaveToDB = function (Block)
    {
        Block.BlockNum = Math.floor(Block.BlockNum);
        var MaxNumDB = Engine.GetMaxNumBlockDB();
        if(global.TEST_DB_BLOCK)
        {
            var BlockNum = Block.BlockNum;
            
            if(BlockNum > MaxNumDB + 1)
            {
                ToLogTrace("Error SaveToDB Block.BlockNum>MaxNumDB+1   BlockNum=" + BlockNum + "  MaxNumDB=" + MaxNumDB);
                return false;
            }
            
            if(!IsZeroArr(Block.TreeHash) && !Block.TxData && !Block.TxPosition)
            {
                ToLogTrace("B=" + BlockNum + " SaveError Block TxPosition=" + Block.TxPosition);
                return 0;
            }
            
            if(BlockNum > 0)
            {
                var PrevBlock = Engine.GetBlockHeaderDB(BlockNum - 1, 1);
                if(!PrevBlock)
                {
                    ToLogTrace("SaveToDB: Error PrevBlock on Block=" + BlockNum);
                    var PrevBlock2 = Engine.GetBlockHeaderDB(BlockNum - 1, 1);
                    return 0;
                }
                if(PrevBlock.BlockNum !== BlockNum - 1)
                {
                    ToLogTrace("SaveToDB: Error PrevBlock.BlockNum on Block=" + BlockNum);
                    return 0;
                }
                var SumPow = Block.PrevSumPow + Block.Power;
                if(Block.SumPow !== SumPow)
                {
                    var Str = "SaveToDB: Error Sum POW: " + Block.SumPow + "/" + SumPow + " on block=" + BlockNum;
                    Engine.ToLog(Str);
                    return 0;
                }
                if(!IsEqArr(Block.PrevSumHash, PrevBlock.SumHash))
                {
                    var Str = "SaveToDB: Error PrevSumHash: " + Block.PrevSumHash + "/" + PrevBlock.SumHash + " on block=" + BlockNum;
                    ToLogTrace(Str);
                    return 0;
                }
            }
        }
        
        var Result = Engine.WriteBlockDBInner(Block);
        return Result;
    };
    
    Engine.WriteBlockDBInner = function (Block)
    {
        JINN_STAT.MainDelta = Math.max(JINN_STAT.MainDelta, Engine.CurrentBlockNum - Block.BlockNum);
        Engine.ResendBlockNum = Math.min(Engine.ResendBlockNum, Block.BlockNum);
        
        return Engine.DB.WriteBlockMain(Block);
    };
    Engine.TruncateChain = function (LastBlockNum)
    {
        Engine.DB.TruncateChain(LastBlockNum);
        Engine.MaxLiderList = {};
    };
    
    Engine.TruncateMain = function (LastBlockNum)
    {
        Engine.DB.TruncateMain(LastBlockNum);
    };
    
    Engine.GetMaxNumBlockDB = function ()
    {
        return Engine.DB.GetMaxNumBlockDB();
    };
    
    Engine.GetMaxNumChain = function ()
    {
        return Engine.DB.GetMaxIndex();
    };
    
    Engine.CheckLoadBody = function (Block)
    {
        if(!Block)
            return;
        
        if(NeedLoadBodyFromDB(Block))
        {
            Engine.DB.LoadBlockTx(Block);
        }
        var Count = 0;
        for(var i = 0; Block.TxData && i < Block.TxData.length; i++)
        {
            var Item = Block.TxData[i];
            if(Item.HASH)
                break;
            var Tx = Engine.GetTx(Item.body, Block.BlockNum, undefined, 5);
            Block.TxData[i] = Tx;
            CheckTx("GetBlock", Tx, Block.BlockNum);
            Count++;
        }
    };
    
    Engine.ClearDataBase = function ()
    {
        Engine.ToLog("START CLEARDATABASE");
        
        Engine.MaxLiderList = {};
        Engine.Header1 = 0;
        Engine.Header2 = 0;
        Engine.Block1 = 0;
        Engine.Block2 = 0;
        
        Engine.BAN_IP = {};
        Engine.TestLoadMap = {};
        
        if(Engine.DB)
            Engine.DB.Clear();
        
        Engine.InitDB();
        Engine.InitBlockList();
        
        Engine.GenesisArr = [];
        
        Engine.WriteGenesisDB();
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child)
            {
                
                Child.LastTransferTime = Date.now();
                Child.FirstTransferTime = Date.now();
            }
        }
    };
}

function DoNode(Engine)
{
    
    if(Engine.TickNum % 10 === 0)
    {
        Engine.DB.DoNode();
    }
    
    Engine.ResizeDBChain = function ()
    {
        if(!BWRITE_MODE)
        {
            ToLog("Error: DB not in write mode");
            return 0;
        }
        
        var DB2 = new CDBChain(Engine.ID, Engine.CalcBlockData, "_");
        DB2.Clear();
        
        var EndNum = Engine.GetMaxNumBlockDB();
        for(var BlockNum = 0; BlockNum < EndNum; BlockNum++)
        {
            var Block = Engine.GetBlockDB(BlockNum);
            Block.Position = undefined;
            Block.TxPosition = undefined;
            
            var Res1 = DB2.WriteBlock(Block);
            var Res2 = DB2.WriteBlockMain(Block);
            if(!Res1 || !Res2)
            {
                console.log("Error write on block: " + BlockNum);
                return 0;
            }
            
            if(BlockNum % 100000 === 0)
                console.log("DONE: " + BlockNum);
        }
        
        StopAndExit("ResizeDBChain " + DB2.GetMaxNumBlockDB());
        
        return DB2.GetMaxNumBlockDB();
    };
    
    Engine.ReOrganizationDBChain = function ()
    {
        if(global.NETWORK === "MAIN-JINN")
        {
            ToLog("Error: NETWORK");
            return 0;
        }
        
        if(!BWRITE_MODE)
        {
            ToLog("Error: DB not in write mode");
            return 0;
        }
        
        var DB2 = new CDBChain(Engine.ID, Engine.CalcBlockData, "_");
        DB2.Clear();
        
        var EndNum = Engine.GetMaxNumBlockDB();
        var PrevBlock, BlockNumNew;
        for(var BlockNum = 0; BlockNum < EndNum; BlockNum++)
        {
            var Block = Engine.GetBlockDB(BlockNum);
            
            if(BlockNum < 16 || (Block.TxCount > 1 || Block.TxCount === 1 && Block.TxData[0].body[0] !== 210))
            {
                var BlockNew;
                if(BlockNum < 16)
                {
                    BlockNew = Block;
                    BlockNumNew = BlockNum;
                }
                else
                {
                    BlockNumNew++;
                    BlockNew = {};
                    BlockNew.BlockNum = BlockNumNew;
                    BlockNew.TxData = Block.TxData;
                    BlockNew.LinkSumHash = ZERO_ARR_32;
                    BlockNew.TreeHash = ZERO_ARR_32;
                    BlockNew.MinerHash = ZERO_ARR_32;
                    BlockNew.PrevSumHash = PrevBlock.SumHash;
                    BlockNew.PrevSumPow = PrevBlock.SumPow;
                    
                    BlockNew.TxCount = BlockNew.TxData.length;
                    BlockNew.TreeHash = Engine.CalcTreeHash(BlockNew.BlockNum, BlockNew.TxData);
                    
                    Engine.CalcBlockData(BlockNew);
                }
                BlockNew.Position = undefined;
                BlockNew.TxPosition = undefined;
                
                var Res1 = DB2.WriteBlock(BlockNew);
                var Res2 = DB2.WriteBlockMain(BlockNew);
                if(!Res1 || !Res2)
                {
                    console.log("Error write on block: " + BlockNum);
                    return 0;
                }
                PrevBlock = BlockNew;
            }
            
            if(BlockNum % 10000 === 0)
                console.log("DONE: " + BlockNum);
        }
        
        StopAndExit("***************** STOP ReOrganizationDBChain " + DB2.GetMaxNumBlockDB());
        
        return DB2.GetMaxNumBlockDB();
    };
}

function InitAfter(Engine)
{
    Engine.InitDB();
}
function GetCopyObj(Obj)
{
    var Obj2 = {};
    for(var key in Obj)
        Obj2[key] = Obj[key];
    return Obj2;
}

