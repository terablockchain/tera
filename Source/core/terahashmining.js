/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/



const DELTA_LONG_MINING = 5000;

require('./library.js');
require('./crypto-library.js');
require('../HTML/JS/terahashlib.js');

var MAX_MEMORY3 = 0, SHIFT_MASKA3;
var BufferNonce3, BufferBlockNum3;
var bWasInitVer3, bWasInitVerOK3;
function InitMiningMemory(Block)
{
    
    bWasInitVer3 = 1;
    if(Block.ProcessMemorySize > 0)
    {
        var MAXARRAYSIZE = (1 << 30) * 2 - 1;
        var MaxArrCount = Math.min(Math.trunc(Block.ProcessMemorySize / 8), MAXARRAYSIZE);
        
        var BitCount = 0;
        MAX_MEMORY3 = 1;
        for(var b = 0; b < 32; b++)
        {
            if(MAX_MEMORY3 > MaxArrCount)
            {
                BitCount--;
                MAX_MEMORY3 = MAX_MEMORY3 / 2;
                break;
            }
            
            BitCount++;
            MAX_MEMORY3 = MAX_MEMORY3 * 2;
        }
        SHIFT_MASKA3 = 32 - BitCount;
        
        try
        {
            BufferNonce3 = new Uint32Array(MAX_MEMORY3);
            BufferBlockNum3 = new Uint32Array(MAX_MEMORY3);
        }
        catch(e)
        {
            SHIFT_MASKA3 = SHIFT_MASKA3 + 1;
            MAX_MEMORY3 = MAX_MEMORY3 / 2;
            ToLog("WAS ALLOC MEMORY ERROR. NEW TRY: " + MAX_MEMORY3);
            BufferNonce3 = new Uint32Array(MAX_MEMORY3);
            BufferBlockNum3 = new Uint32Array(MAX_MEMORY3);
        }
        
        bWasInitVerOK3 = 1;
        ToLog("MAX HASH ITEMS=" + Math.trunc(MAX_MEMORY3 / 1024 / 1024) + " M");
    }
}
function CheckMiningBlock(Block)
{
    if(!bWasInitVer3)
    {
        InitMiningMemory(Block);
    }
    if(!bWasInitVerOK3)
        return 0;
    
    if(!Block.LastNonce)
        Block.LastNonce = 0;
    if(!Block.HashCount)
        Block.HashCount = 0;
    
    if(!Block.LastNonce0)
        Block.LastNonce0 = 0;
    
    if(!Block.MaxLider)
    {
        Block.HashCount = 0;
        Block.MaxLider = {Nonce0:0, Nonce1:0, Nonce2:0, DeltaNum1:0, DeltaNum2:0, Hash1:[255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], Hash2:[255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255], };
    }
    
    return 1;
}

function DoPumpMemoryHash(Block)
{
    if(!CheckMiningBlock(Block))
        return  - 1;
    
    var RunCount = Block.RunCount;
    var BlockNum = Block.BlockNum;
    var Miner = Block.MinerID;
    
    var StartNonceRnd = Block.LastNonce + Math.trunc(3000000000 * Math.random());
    
    var List = GetNonceHashArr(BlockNum, Miner, StartNonceRnd, RunCount);
    for(var n = 0; n < RunCount; n++)
    {
        var Nonce = List.ArrNonce[n];
        var HashNum = List.ArrHash[n] >>> SHIFT_MASKA3;
        
        BufferNonce3[HashNum] = Nonce;
        BufferBlockNum3[HashNum] = BlockNum;
    }
    Block.LastNonce += RunCount;
    
    if(BlockPump.TotalCount !== undefined)
        BlockPump.TotalCount += RunCount;
}

function FindMiningPOW(Block,bHashPump)
{
    if(!CheckMiningBlock(Block))
        return  - 1;
    
    if(bHashPump)
    {
        DoPumpMemoryHash(Block);
        return  - 2;
    }
    
    var MaxLider = Block.MaxLider;
    var BlockNum = Block.BlockNum;
    var Miner = Block.MinerID;
    var Ret = 0;
    var PrevHashNum = ReadUint32FromArr(Block.PrevHash, 28);
    
    var HashBase = GetHashFromNum2(BlockNum, PrevHashNum);
    var Value1 = FindHashBuffer3(HashBase, BlockNum, Miner, 4);
    if(Value1)
    {
        var Hash1 = XORArr(HashBase, Value1.Hash);
        if(CompareArr(MaxLider.Hash1, Hash1) > 0)
        {
            MaxLider.Hash1 = Hash1;
            MaxLider.Nonce1 = Value1.Nonce;
            MaxLider.DeltaNum1 = Value1.DeltaNum;
            Ret = 1;
        }
    }
    
    var StartNonce = Block.LastNonce0;
    var CountEnd = StartNonce + 50000;
    
    var Nonce0;
    for(Nonce0 = StartNonce; Nonce0 < CountEnd; Nonce0++)
    {
        var HashCurrent = GetHashFromArrNum2(Block.SeqHash, Miner, Nonce0);
        var Value2 = FindHashBuffer3(HashCurrent, BlockNum, Miner, 1);
        if(Value2)
        {
            var Hash2 = XORArr(HashCurrent, Value2.Hash);
            if(CompareArr(MaxLider.Hash2, Hash2) > 0)
            {
                MaxLider.Nonce0 = Nonce0;
                MaxLider.Hash2 = Hash2;
                MaxLider.Nonce2 = Value2.Nonce;
                MaxLider.DeltaNum2 = Value2.DeltaNum;
                Ret = 1;
                
                if(CompareArr(MaxLider.Hash1, Hash2) > 0)
                {
                    break;
                }
            }
        }
    }
    Block.LastNonce0 = Nonce0;
    
    if(Ret)
    {
        Block.AddrHash = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        WriteUintToArrOnPos(Block.AddrHash, Miner, 0);
        WriteUintToArrOnPos(Block.AddrHash, MaxLider.Nonce0, 6);
        WriteUintToArrOnPos(Block.AddrHash, MaxLider.Nonce1, 12);
        WriteUintToArrOnPos(Block.AddrHash, MaxLider.Nonce2, 18);
        WriteUint16ToArrOnPos(Block.AddrHash, MaxLider.DeltaNum1, 24);
        WriteUint16ToArrOnPos(Block.AddrHash, MaxLider.DeltaNum2, 26);
        
        Block.Hash = MaxLider.Hash2;
        if(CompareArr(MaxLider.Hash1, MaxLider.Hash2) > 0)
        {
            Block.PowHash = MaxLider.Hash1;
        }
        else
        {
            Block.PowHash = MaxLider.Hash2;
        }
        
        if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
            Block.Hash = sha3arr2(MaxLider.Hash1, MaxLider.Hash2);
        else
            Block.Hash = shaarr2(MaxLider.Hash1, MaxLider.Hash2);
        var Power = GetPowPower(Block.PowHash);
        Block.HashCount = (1 << Power) >>> 0;
    }
    
    return Ret;
}

function FindHashBuffer3(HashFind,BlockNum,Miner,CountFind)
{
    var HashNum = ReadIndexFromArr(HashFind);
    for(var i = 0; i < CountFind; i++)
    {
        var Index = HashNum ^ i;
        
        var BlockNum2 = BufferBlockNum3[Index];
        if(BlockNum2 && BlockNum2 > BlockNum - DELTA_LONG_MINING)
        {
            var Nonce2 = BufferNonce3[Index];
            var Hash2 = GetHashFromNum3(BlockNum2, Miner, Nonce2);
            return {Hash:Hash2, DeltaNum:BlockNum - BlockNum2, Nonce:Nonce2};
        }
    }
    return undefined;
}

function ReadIndexFromArr(arr)
{
    var value = (arr[0] << 23) * 2 + (arr[1] << 16) + (arr[2] << 8) + arr[3];
    value = value >>> SHIFT_MASKA3;
    return value;
}

global.GetNonceHashArr = function (BlockNum,Miner,StartNonceRnd,CountNonce)
{
    
    var ArrNonce = [];
    var ArrHash = [];
    for(var n = 0; n < CountNonce; n++)
    {
        var Nonce = StartNonceRnd + n;
        
        var HashNonce = GetHashFromNum3(BlockNum, Miner, Nonce);
        var HashNum = (HashNonce[0] << 23) * 2 + (HashNonce[1] << 16) + (HashNonce[2] << 8) + HashNonce[3];
        ArrNonce[n] = Nonce;
        ArrHash[n] = HashNum;
    }
    return {ArrNonce:ArrNonce, ArrHash:ArrHash};
}


global.DoPumpMemoryHash = DoPumpMemoryHash;
global.FindMiningPOW = FindMiningPOW;
global.CreatePOWVersionX = FindMiningPOW;

