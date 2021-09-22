/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var DELTA_LONG_MINING = 5000;
var BLOCKNUM_ALGO2;
var BLOCKNUM_HASH_NEW;
var BLOCKNUM_TICKET_ALGO;

var root = typeof global==="object"?global:window;


root.GetHashFromSeqAddr = GetHashFromSeqAddr;
root.GetHashFromNum2 = GetHashFromNum2;
root.GetHashFromNum3 = GetHashFromNum3;
root.GetHashFromArrNum2 = GetHashFromArrNum2;
root.XORArr = XORArr;

root.GetHash = GetHash;

InitTeraHashConst();

function InitTeraHashConst()
{

    if(root.NETWORK_ID === "MAIN-JINN.TERA")
    {
        BLOCKNUM_ALGO2 = 6560000;
        BLOCKNUM_HASH_NEW = 10195000;
        BLOCKNUM_TICKET_ALGO = 16070000;
    }
    else
    {
        BLOCKNUM_ALGO2 = 0;
        BLOCKNUM_HASH_NEW = 0;
        BLOCKNUM_TICKET_ALGO = 0;
    }
}

function GetHashFromSeqAddr(SeqHash,AddrHash,BlockNum,PrevHash)
{
    if(BlockNum < BLOCKNUM_ALGO2)
    {
        var Hash = shaarrblock2(SeqHash, AddrHash, BlockNum);
        return {Hash:Hash, PowHash:Hash, Hash1:Hash, Hash2:Hash};
    }
    if(!PrevHash)
        ToLogTrace("Not set PrevHash");
    
    var MinerID = ReadUintFromArr(AddrHash, 0);
    var Nonce0 = ReadUintFromArr(AddrHash, 6);
    var Nonce1 = ReadUintFromArr(AddrHash, 12);
    var Nonce2 = ReadUintFromArr(AddrHash, 18);
    
    var DeltaNum1 = ReadUint16FromArr(AddrHash, 24);
    var DeltaNum2 = ReadUint16FromArr(AddrHash, 26);
    var PrevHashNum = ReadUint32FromArr(PrevHash, 28);
    
    var Data = GetHash(SeqHash, PrevHashNum, BlockNum, MinerID, Nonce0, Nonce1, Nonce2, DeltaNum1, DeltaNum2);
    return Data;
}

function GetHash(BlockHash,PrevHashNum,BlockNum,Miner,Nonce0,Nonce1,Nonce2,DeltaNum1,DeltaNum2)
{
    
    if(DeltaNum1 > DELTA_LONG_MINING)
        DeltaNum1 = 0;
    if(DeltaNum2 > DELTA_LONG_MINING)
        DeltaNum2 = 0;
    var HashBase = GetHashFromNum2(BlockNum, PrevHashNum);
    var HashCurrent = GetHashFromArrNum2(BlockHash, Miner, Nonce0);
    var HashNonce1 = GetHashFromNum3(BlockNum - DeltaNum1, Miner, Nonce1);
    var HashNonce2 = GetHashFromNum3(BlockNum - DeltaNum2, Miner, Nonce2);
    var Hash1 = XORArr(HashBase, HashNonce1);
    var Hash2 = XORArr(HashCurrent, HashNonce2);
    var Ret = {Hash:Hash2, Hash1:Hash1, Hash2:Hash2};
    if(CompareArr(Hash1, Hash2) > 0)
    {
        Ret.PowHash = Hash1;
    }
    else
    {
        Ret.PowHash = Hash2;
    }
    
    if(BlockNum >= BLOCKNUM_HASH_NEW)
    {
        if(BlockNum >= BLOCKNUM_TICKET_ALGO)
            Ret.Hash = sha3arr2(Hash1, Hash2);
        else
            Ret.Hash = shaarr2(Hash1, Hash2);
    }
    
    return Ret;
}

function CalcBlockHashJinn(Block,SeqHash,AddrHash,BlockNum,PrevHash)
{
    var Value = GetHashFromSeqAddr(SeqHash, AddrHash, BlockNum, PrevHash);
    Block.Hash = Value.Hash;
    Block.PowHash = Value.PowHash;
    Block.Power = GetPowPower(Value.PowHash);
}


function XORArr(Arr1,Arr2)
{
    var Ret = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for(var i = 0; i < 32; i++)
    {
        Ret[i] = Arr1[i] ^ Arr2[i];
    }
    return Ret;
}

function GetHashFromNum2(Value1,Value2)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    WriteUintToArrOnPos(MeshArr, Value1, 0);
    WriteUintToArrOnPos(MeshArr, Value2, 6);
    return sha3(MeshArr, 41);
}

function GetHashFromArrNum2(Arr,Value1,Value2)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0];
    WriteArrToArrOnPos(MeshArr, Arr, 0, 32);
    WriteUintToArrOnPos(MeshArr, Value1, 32);
    WriteUintToArrOnPos(MeshArr, Value2, 38);
    return sha3(MeshArr, 42);
}

function GetHashFromNum3(Value1,Value2,Value3)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    WriteUintToArrOnPos(MeshArr, Value1, 0);
    WriteUintToArrOnPos(MeshArr, Value2, 6);
    WriteUintToArrOnPos(MeshArr, Value3, 12);
    
    return sha3(MeshArr, 43);
}


function ReadUintFromArr(arr,len)
{
    if(len === undefined)
    {
        len = arr.len;
        arr.len += 6;
    }
    
    var value = (arr[len + 5] << 23) * 2 + (arr[len + 4] << 16) + (arr[len + 3] << 8) + arr[len + 2];
    value = value * 256 + arr[len + 1];
    value = value * 256 + arr[len];
    return value;
}

function ReadUint32FromArr(arr,len)
{
    if(len === undefined)
    {
        len = arr.len;
        arr.len += 4;
    }
    
    var value = (arr[len + 3] << 23) * 2 + (arr[len + 2] << 16) + (arr[len + 1] << 8) + arr[len];
    return value;
}

function ReadUint16FromArr(arr,len)
{
    if(len === undefined)
    {
        len = arr.len;
        arr.len += 2;
    }
    
    var value = (arr[len + 1] << 8) + arr[len];
    return value;
}

function ReadArrFromArr(arr,length)
{
    var Ret = [];
    var len = arr.len;
    for(var i = 0; i < length; i++)
    {
        Ret[i] = arr[len + i];
    }
    arr.len += length;
    return Ret;
}

function WriteUintToArr(arr,Num)
{
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
    arr[len + 2] = (Num >>> 16) & 0xFF;
    arr[len + 3] = (Num >>> 24) & 0xFF;
    
    var NumH = Math.floor(Num / 4294967296);
    arr[len + 4] = NumH & 0xFF;
    arr[len + 5] = (NumH >>> 8) & 0xFF;
}

function WriteUintToArrOnPos(arr,Num,Pos)
{
    arr[Pos] = Num & 0xFF;
    arr[Pos + 1] = (Num >>> 8) & 0xFF;
    arr[Pos + 2] = (Num >>> 16) & 0xFF;
    arr[Pos + 3] = (Num >>> 24) & 0xFF;
    
    var NumH = Math.floor(Num / 4294967296);
    arr[Pos + 4] = NumH & 0xFF;
    arr[Pos + 5] = (NumH >>> 8) & 0xFF;
}

function WriteUint16ToArr(arr,Num)
{
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
}

function WriteUint32ToArr(arr,Num)
{
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
    arr[len + 2] = (Num >>> 16) & 0xFF;
    arr[len + 3] = (Num >>> 24) & 0xFF;
}
function WriteUint32ToArrOnPos(arr,Num,Pos)
{
    arr[Pos] = Num & 0xFF;
    arr[Pos + 1] = (Num >>> 8) & 0xFF;
    arr[Pos + 2] = (Num >>> 16) & 0xFF;
    arr[Pos + 3] = (Num >>> 24) & 0xFF;
}
function WriteUint16ToArrOnPos(arr,Num,Pos)
{
    arr[Pos] = Num & 0xFF;
    arr[Pos + 1] = (Num >>> 8) & 0xFF;
}

function WriteArrToArr(arr,arr2,ConstLength)
{
    var len = arr.length;
    for(var i = 0; i < ConstLength; i++)
    {
        arr[len + i] = arr2[i];
    }
}
function WriteArrToArrOnPos(arr,arr2,Pos,ConstLength)
{
    for(var i = 0; i < ConstLength; i++)
    {
        arr[Pos + i] = arr2[i];
    }
}
function WriteArrToArrHOnPos(arr,arr2,Pos,ConstLength)
{
    for(var i = 0; i < ConstLength; i++)
    {
        arr[Pos + i] |= (arr2[i] << 8);
    }
}

function ConvertBufferToStr(Data)
{
    for(var key in Data)
    {
        var item = Data[key];
        if(item instanceof Buffer)
        {
            Data[key] = GetHexFromArr(item);
        }
        else
            if(typeof item === "object")
            {
                if(item && item.length > 2 && typeof item[0] === "number" && typeof item[1] === "number")
                    Data[key] = GetHexFromArr(item);
                else
                    ConvertBufferToStr(item);
            }
    }
}

function CopyObjValue(obj,num)
{
    if(num && num > 5)
        return obj;
    
    var ret = {};
    for(var key in obj)
    {
        var val = obj[key];
        if((typeof val === "object") && !(val instanceof Buffer) && !(val instanceof ArrayBuffer) && !(val instanceof Array))
            val = CopyObjValue(val, num + 1);
        
        ret[key] = val;
    }
    return ret;
}
function CopyArr(arr1)
{
    var arr2 = [];
    if(arr1)
        for(var i = 0; i < arr1.length; i++)
            arr2[i] = arr1[i];
    return arr2;
}

function ParseNum(a)
{
    var Num = parseInt(a);
    if(!Num)
        Num = 0;
    if(isNaN(Num))
        Num = 0;
    if(Num < 0)
        Num = 0;
    return Num;
}

function CompareArr(a,b)
{
    for(var i = 0; i < a.length; i++)
    {
        if(a[i] !== b[i])
            return a[i] - b[i];
    }
    return 0;
}
function CompareArrL(a,b)
{
    if(a.length !== b.length)
        return a.length - b.length;
    
    for(var i = 0; i < a.length; i++)
    {
        if(a[i] !== b[i])
            return a[i] - b[i];
    }
    return 0;
}

function IsEqArr(a,b)
{
    if(!a)
    {
        ToLogTrace("IsEqArr Error array a");
        throw "IsEqArr Error a";
    }
    if(!b)
    {
        ToLogTrace("IsEqArr Error array b");
        throw "IsEqArr Error b";
    }
    
    if(a.length !== b.length)
        return 0;
    return (CompareArr(a, b) === 0) ? 1 : 0;
}

function arr2(Value1,Value2)
{
    var Buf = [];
    
    for(var n = 0; n < Value1.length; n++)
        Buf.push(Value1[n]);
    
    for(var n = 0; n < Value2.length; n++)
        Buf.push(Value2[n]);
    
    return Buf;
}

function shaarr2(Value1,Value2)
{
    return shaarr(arr2(Value1, Value2));
}
function sha3arr2(Value1,Value2)
{
    return sha3(arr2(Value1, Value2), 44);
}

var BlockArrFormat = [{BlockNum:"uint32", PrevSumPow:"uint", PrevHash:"hash", TreeHash:"zhash", MinerHash:"hash"}];
var BlockFormatWrk = {};

function GetBlockArrFormat()
{
    return BlockArrFormat;
}
function GetBufferFromBlockArr(ArrBlocks)
{
    return SerializeLib.GetBufferFromObject(ArrBlocks, BlockArrFormat, BlockFormatWrk);
}

function GetBlockArrFromBuffer(BufArr)
{
    return SerializeLib.GetObjectFromBuffer(BufArr, BlockArrFormat, BlockFormatWrk);
}

function shaarrblock2(Value1,Value2,BlockNum)
{
    return shaarrblock(arr2(Value1, Value2), BlockNum);
}

function GetSeqHash(BlockNum,PrevHash,TreeHash,PrevSumPow)
{
    return CalcDataHash(BlockNum, PrevHash, TreeHash, PrevSumPow);
}

function CalcDataHash(BlockNum,PrevHash,TreeHash,PrevSumPow)
{
    if(BlockNum > 15 && BlockNum >= root.UPDATE_CODE_JINN)
    {
        // new code
        
        if(PrevSumPow === undefined)
            ToLogTrace("Error PrevSumPow=undefinde on Block=" + BlockNum);
        
        return sha3(PrevHash.concat(TreeHash).concat(GetArrFromValue(PrevSumPow)), 45);
    }
    else
    {
        // old code
        var arr = [GetArrFromValue(BlockNum), PrevHash, TreeHash];
        return CalcHashFromArray(arr, true);
    }
}

function CalcSumHash(PrevSumHash,Hash,BlockNum,SumPow)
{
    if(BlockNum === 0)
        return ZERO_ARR_32;
    if(BlockNum <= 15)
    {
        return shaarr2(PrevSumHash, Hash);
    }
    
    if(BlockNum >= root.UPDATE_CODE_JINN)
    {
        // new code
        
        return Hash;
    }
    else
    {
        // old code
        return shaarr2(PrevSumHash, Hash);
    }
}

function CalcLinkHashFromArray(ArrHashes,BlockNum)
{
    if(BlockNum >= root.UPDATE_CODE_JINN)
    {
        // new code
        ToLogTrace("Error algo for new mode CalcLinkHashFromArray BlockNum=" + BlockNum + "/" + root.UPDATE_CODE_JINN);
    }
    
    // old code
    return CalcHashFromArray(ArrHashes, true);
}

function CalcHashFromArray(ArrHashes,bOriginalSeq)
{
    if(bOriginalSeq === undefined)
        ArrHashes.sort(CompareArr);
    
    var Buf = [];
    for(var i = 0; i < ArrHashes.length; i++)
    {
        var Value = ArrHashes[i];
        for(var n = 0; n < Value.length; n++)
            Buf.push(Value[n]);
    }
    if(Buf.length === 0)
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    else
        if(Buf.length === 32)
            return Buf;
    
    var Hash = shaarr(Buf);
    return Hash;
}

function CalcHash3FromArray(ArrHashes,bOriginalSeq)
{
    if(bOriginalSeq === undefined)
        ArrHashes.sort(CompareArr);
    
    var Buf = [];
    for(var i = 0; i < ArrHashes.length; i++)
    {
        var Value = ArrHashes[i];
        for(var n = 0; n < Value.length; n++)
            Buf.push(Value[n]);
    }
    if(Buf.length === 0)
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    else
        if(Buf.length === 32)
            return Buf;
    
    var Hash = sha3(Buf, 47);
    return Hash;
}

function GetArrFromValue(Num)
{
    var arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    arr[0] = Num & 0xFF;
    arr[1] = (Num >>> 8) & 0xFF;
    arr[2] = (Num >>> 16) & 0xFF;
    arr[3] = (Num >>> 24) & 0xFF;
    
    var NumH = Math.floor(Num / 4294967296);
    arr[4] = NumH & 0xFF;
    arr[5] = (NumH >>> 8) & 0xFF;
    
    return arr;
}

function GetTxID(BlockNum,Body)
{
    var Arr = CreateTxID(Body, BlockNum);
    //return Arr.slice(0, TX_ID_HASH_LENGTH + 6);
    return Arr;
}

function CreateTxID(body,BlockNum)
{
    var HASH = sha3(body, 31);
    WriteUintToArrOnPos(HASH, BlockNum, TX_ID_HASH_LENGTH);
    HASH = HASH.slice(0, TX_ID_HASH_LENGTH + 6);
    return HASH;
}

function GetStrTxIDFromHash(Hash,BlockNum)
{
    var Hash2 = Hash.slice(0, TX_ID_HASH_LENGTH + 6);
    WriteUintToArrOnPos(Hash2, BlockNum, TX_ID_HASH_LENGTH);
    return GetHexFromArr(Hash2);
}

root.ReadUint32FromArr = ReadUint32FromArr;
root.ReadUintFromArr = ReadUintFromArr;
root.ReadUint16FromArr = ReadUint16FromArr;
root.WriteUintToArr = WriteUintToArr;
root.WriteUint32ToArr = WriteUint32ToArr;
root.WriteUint32ToArrOnPos = WriteUint32ToArrOnPos;
root.WriteUint16ToArrOnPos = WriteUint16ToArrOnPos;

root.WriteUintToArrOnPos = WriteUintToArrOnPos;
root.WriteArrToArr = WriteArrToArr;
root.WriteArrToArrOnPos = WriteArrToArrOnPos;
root.WriteArrToArrHOnPos = WriteArrToArrHOnPos;
root.ConvertBufferToStr = ConvertBufferToStr;
root.CopyObjValue = CopyObjValue;
root.CopyArr = CopyArr;

root.ParseNum = ParseNum;
root.CompareArr = CompareArr;
root.CompareArrL = CompareArrL;
root.IsEqArr = IsEqArr;

root.shaarr2 = shaarr2;
root.sha3arr2 = sha3arr2;
root.arr2 = arr2;

root.GetBlockArrFromBuffer = GetBlockArrFromBuffer;
root.GetBufferFromBlockArr = GetBufferFromBlockArr;

root.shaarrblock2 = shaarrblock2;
root.GetSeqHash = GetSeqHash;

root.CalcHash3FromArray = CalcHash3FromArray;
root.CalcLinkHashFromArray = CalcLinkHashFromArray;
root.CalcHashFromArray = CalcHashFromArray;
root.CalcSumHash = CalcSumHash;
root.CalcDataHash = CalcDataHash;
root.CalcBlockHashJinn = CalcBlockHashJinn;

root.GetArrFromValue = GetArrFromValue;

root.GetStrTxIDFromHash = GetStrTxIDFromHash;
root.GetTxID = GetTxID;
root.CreateTxID = CreateTxID;
