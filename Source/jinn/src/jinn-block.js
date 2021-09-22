/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 * Working with blocks, creating a new block, determining the Genesis of the block
 *
 * The formula for calculating hashes:
 *
 *   LinkSumHash | -----------> DataHash | ---------------->    Hash
 *        +      |                  +    |
 *     TreeHash  |              MinerHash|
 *
 * i.e.:
 * LinkSumHash + TreeHash  = DataHash
 * DataHash + MinerHash    = Hash
 **/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Block"});

function DoNode(Engine)
{
    Engine.TickNum++;
}

//Engine context

function InitClass(Engine)
{
    Engine.TickNum = 0;
    
    // Modeling...
    
    Engine.GenesisArr = [];
    
    Engine.GetGenesisBlock = function (Num)
    {
        if(Engine.GenesisArr[Num])
            return Engine.GenesisArr[Num];
        
        if(Num >= JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            ToLogTrace("Error GenesisBlock Num = " + Num);
            return undefined;
        }
        
        var Block = Engine.GetGenesisBlockInner(Num);
        Engine.GenesisArr[Num] = Block;
        
        return Block;
    };
    
    Engine.GetGenesisBlockInner = function (Num)
    {
        
        var PrevBlock;
        if(!Num)
            PrevBlock = {Hash:ZERO_ARR_32, SumPow:0, SumHash:ZERO_ARR_32, };
        else
            PrevBlock = Engine.GetGenesisBlock(Num - 1);
        
        var Block = {};
        Block.Genesis = 1;
        Block.BlockNum = Num;
        Block.TxData = [];
        Block.LinkSumHash = ZERO_ARR_32;
        Block.TreeHash = ZERO_ARR_32;
        Block.MinerHash = ZERO_ARR_32;
        Block.PrevSumHash = PrevBlock.SumHash;
        Block.PrevSumPow = PrevBlock.SumPow;
        Engine.CalcBlockData(Block);
        
        return Block;
    };
    
    Engine.GetCopyBlock = function (Block)
    {
        var BlockNew = {};
        BlockNew.BlockNum = Block.BlockNum;
        BlockNew.TreeHash = Block.TreeHash;
        BlockNew.MinerHash = Block.MinerHash;
        BlockNew.TxCount = Block.TxCount;
        
        BlockNew.PrevSumPow = Block.PrevSumPow;
        BlockNew.PrevSumHash = Block.PrevSumHash;
        BlockNew.PrevBlockPosition = Block.PrevBlockPosition;
        BlockNew.SysTreeHash = Block.SysTreeHash;
        
        return BlockNew;
    };
    
    Engine.CopyBodyTx = function (BlockDst,BlockSrc)
    {
        BlockDst.TreeHash = BlockSrc.TreeHash;
        BlockDst.TxData = BlockSrc.TxData;
        BlockDst.TxCount = BlockSrc.TxCount;
        BlockDst.TxPosition = BlockSrc.TxPosition;
        BlockDst.SysTreeHash = BlockSrc.SysTreeHash;
        
        return 1;
    };
    
    Engine.GetNewBlock = function (PrevBlock)
    {
        if(!PrevBlock)
            return undefined;
        
        if(PrevBlock.BlockNum < global.UPDATE_CODE_JINN)
            return undefined;
        
        var Block = {};
        Block.BlockNum = PrevBlock.BlockNum + 1;
        Block.PrevSumHash = PrevBlock.SumHash;
        Block.PrevSumPow = PrevBlock.SumPow;
        Engine.FillBodyFromTransfer(Block);
        Block.MinerHash = ZERO_ARR_32;
        
        Engine.CalcBlockData(Block);
        
        return Block;
    };
    
    // Serylizing...
    
    Engine.HeaderFromBlock = function (Block)
    {
        if(!Block)
            return undefined;
        
        if(Block.BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT && IsZeroArr(Block.PrevSumHash))
            ToLog("ZeroArr PrevSumHash on BlockNum=" + Block.BlockNum);
        var Data = {BlockNum:Block.BlockNum, LinkSumHash:Block.PrevSumHash, TreeHash:Block.TreeHash, MinerHash:Block.MinerHash, PrevSumPow:Block.PrevSumPow,
            PrevSumHash:Block.PrevSumHash, OldPrevHash8:Block.OldPrevHash8, SysTreeHash:Block.SysTreeHash, Size:5 * 33 + 4 + 6, };
        
        return Data;
    };
    
    Engine.BodyFromBlock = function (Block)
    {
        if(!IsZeroArr(Block.TreeHash) && (!Block.TxData || Block.TxData.length === 0))
            ToLogTrace("BodyFromBlock : Error block tx data TreeHash=" + Block.TreeHash + " on block: " + Block.BlockNum);
        
        var Data = {BlockNum:Block.BlockNum, TreeHash:Block.TreeHash, PrevSumHash:Block.PrevSumHash, TxData:Block.TxData, };
        
        var Size = 10;
        for(var i = 0; i < Data.TxData.length; i++)
        {
            Size += Data.TxData[i].body.length;
        }
        Data.Size = Size;
        
        return Data;
    };
    
    Engine.CalcTreeHash = function (BlockNum,TxArr)
    {
        if(!TxArr || !TxArr.length)
            return ZERO_ARR_32;
        return Engine.CalcTreeHashInner(BlockNum, TxArr);
    };
    
    Engine.CalcTreeHashInner = function (BlockNum,TxArr)
    {
        
        var Buf = [];
        for(var n = 0; TxArr && n < TxArr.length; n++)
        {
            var Tx = TxArr[n];
            
            if(!CheckTx("=CalcTreeHash=", Tx, BlockNum, 0))
            {
                return ZERO_ARR_32;
            }
            
            var Hash = Tx.HASH;
            for(var h = 0; h < Hash.length; h++)
                Buf.push(Hash[h]);
        }
        
        if(!Buf.length)
            return ZERO_ARR_32;
        
        var arr = sha3(Buf, 4);
        return arr;
    };
    
    Engine.CheckHashExistArr = function (Arr,BlockNum)
    {
        if(!Arr)
            return;
        
        var LastBlockNumMain = Engine.GetMaxNumBlockDB();
        
        var ArrErr = Engine.GetArrErrTx(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            if(Tx.OperationID === undefined)
            {
                Engine.CheckHashExist(Tx, BlockNum);
                Tx.OperationID = Engine.GetTxSenderOperationID(Tx, BlockNum);
                if(JINN_CONST.TX_PRIORITY_MODE || JINN_CONST.TX_CHECK_SIGN_ON_TRANSFER)
                    Tx.SenderNum = Engine.GetTxSenderNum(Tx, BlockNum);
                if(JINN_CONST.TX_BASE_VALUE)
                {
                    Tx.BaseValue = Engine.GetAccountBaseValue(Tx.SenderNum, BlockNum);
                }
                if(JINN_CONST.TX_PRIORITY_MODE)
                    Tx.CountTX = Engine.GetTxSenderCount(Tx.SenderNum);
            }
            if(BlockNum <= LastBlockNumMain)
                continue;
            
            Engine.DoCheckErrTx(Tx, BlockNum, TreeTTAll, ArrErr);
            
            if(Tx.ErrSign || Tx.ErrOperationID)
            {
                ToLog("Remove error tx at " + i + " on Block:" + BlockNum + " - " + Tx.ErrSign + ":" + Tx.ErrOperationID, 3);
                
                Arr.splice(i, 1);
                i--;
                continue;
            }
        }
    };
    
    Engine.SortBlock = function (Block)
    {
        if(!Block || !Block.TxData || Block.TxData.length <= 1)
            return;
        
        Engine.CheckHashExistArr(Block.TxData, Block.BlockNum);
        Block.TxData.sort(function (a,b)
        {
            if(typeof a.OperationID !== "number")
                ToLogTrace("Error type a.OperationID");
            if(typeof b.OperationID !== "number")
                ToLogTrace("Error type b.OperationID");
            if(!a.HASH)
                ToLogTrace("Error a.HASH");
            if(!b.HASH)
                ToLogTrace("Error b.HASH");
            
            if(a.OperationID !== b.OperationID)
                return a.OperationID - b.OperationID;
            return CompareArr(a.HASH, b.HASH);
        });
    };
    
    Engine.CalcBlockData = function (Block)
    {
        
        Engine.CalcBlockHash(Block);
        Engine.CalcSumHash(Block);
        
        Block.Miner = ReadUintFromArr(Block.MinerHash, 0);
        
        if(Engine.CheckMaxHashReceive)
            Engine.CheckMaxHashReceive(Block);
    };
    
    Engine.CalcBlockHash = function (Block)
    {
        if(!Block.PrevSumHash)
            ToLogTrace("Error No PrevSumHash on Block=" + Block.BlockNum);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.LinkSumHash = ZERO_ARR_32;
        }
        else
        {
            Block.LinkSumHash = Block.PrevSumHash;
        }
        
        if(Block.PrevSumPow === undefined)
            ToLogTrace("Error No Block.PrevSumPow on Block=" + Block.BlockNum);
        
        Block.DataHash = Engine.CalcDataHashInner(Block);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.Hash = ZERO_ARR_32.slice();
            Block.Hash[0] = 1 + Block.BlockNum;
            Block.Hash[31] = Block.Hash[0];
        }
        else
        {
            Block.Hash = Engine.CalcBlockHashInner(Block);
        }
        Block.PowHash = Block.Hash;
        
        Block.Power = GetPowPower(Block.PowHash);
        Block.SumPow = Block.PrevSumPow + Block.Power;
    };
    
    Engine.CalcDataHashInner = function (Block)
    {
        if(Block.PrevSumPow === undefined)
            ToLogTrace("Error No Block.PrevSumPow on Block=" + Block.BlockNum);
        
        return sha3(Block.LinkSumHash.concat(Block.TreeHash).concat(GetArrFromValue(Block.PrevSumPow)), 5);
    };
    
    Engine.CalcBlockHashInner = function (Block)
    {
        return sha3(Block.DataHash.concat(Block.MinerHash).concat(GetArrFromValue(Block.BlockNum)), 6);
    };
    
    Engine.CalcSumHash = function (Block)
    {
        Block.SumHash = Block.Hash;
    };
    
    Engine.CheckHashExist = function (Tx,BlockNum)
    {
        if(!Tx.HASH)
        {
            var Tx2 = Engine.GetTx(Tx.body, BlockNum, undefined, 10);
            CopyObjKeys(Tx, Tx2);
        }
    };
    
    Engine.DoTxFromTicket = function (Tt,Item)
    {
        Tt.IsTx = Item.IsTx;
        Tt.HASH = Item.HASH;
        Tt.body = Item.body;
    };
    
    Engine.GetTicket = function (HashTicket)
    {
        
        var Key = GetHexFromArr(HashTicket);
        var Tx = {HashTicket:HashTicket, KEY:Key};
        return Tx;
    };
    
    Engine.GetTx = function (body,BlockNum,HASH)
    {
        
        var Tx = {};
        Tx.IsTx = 1;
        if(HASH)
            Tx.HASH = HASH;
        else
            Tx.HASH = sha3(body, 9);
        
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TT_TICKET_HASH_LENGTH);
        Tx.KEY = GetHexFromArr(Tx.HashTicket);
        Tx.body = body;
        
        return Tx;
    };
}

function NeedLoadBodyFromNet(Block)
{
    if(IsZeroArr(Block.TreeHash))
        return 0;
    
    if(Block.TxPosition)
        return 0;
    
    if(Block.TxData)
        return 0;
    
    return 1;
}

function NeedLoadBodyFromDB(Block)
{
    if(IsZeroArr(Block.TreeHash))
        return 0;
    
    if(Block && !Block.TxData && Block.TxPosition)
        return 1;
    return 0;
}

function CalcAvgSumPow(Block)
{
    Block.AvgSumPow = Block.SumPow / Block.BlockNum;
}
function GetPowPowerBlock(BlockNum,arrhash)
{
    var Power = GetPowPower(arrhash);
    return Power;
}

global.GetPowPowerBlock = GetPowPowerBlock;
global.CalcAvgSumPow = CalcAvgSumPow;
global.NeedLoadBodyFromNet = NeedLoadBodyFromNet;
global.NeedLoadBodyFromDB = NeedLoadBodyFromDB;

global.BlockInfo = function (Block)
{
    if(!Block)
        return "{}";
    
    if(!Block.MinerHash)
        Block.MinerHash = ZERO_ARR_32;
    if(!Block.Power)
        Block.Power = 0;
    Block.Miner = ReadUintFromArr(Block.MinerHash, 0);
    return "{" + Block.BlockNum + " M:" + Block.Miner + " Tx:" + (Block.TxData ? Block.TxData.length : 0) + " Pow:" + Block.Power + "}";
}
