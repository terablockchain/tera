/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/




require("./library.js");

const crypto = require('crypto');

function sha256(Str,encode)
{
    //TODO: Str=Buffer.from(Str);


    return new crypto.createHash('sha256').update(Str).digest(encode);
}
global.sha256 = sha256;

global.MAX_SUPER_VALUE_POW = (1 << 30) * 2;

var BuferForStr = Buffer.alloc(32);
global.GetHexFromAddres = function (arr)
{
    if(!arr)
        return "";

    if(arr.data !== undefined)
        arr = arr.data;
    for(var i = 0; i < 32; i++)
        BuferForStr[i] = arr[i];

    return BuferForStr.toString('hex').toUpperCase();
}
global.GetArr32FromHex = function (Str)
{
    var array = new Uint8Array(32);
    for(var i = 0; i < array.length; i++)
    {
        array[i] = parseInt(Str.substr(i * 2, 2), 16);
    }
    return array;
}
global.GetAddresFromHex = GetArr32FromHex;

global.GetHexAddresFromPublicKey = function (arr)
{
    return Buffer.from(arr.slice(1)).toString('hex').toUpperCase();
}

global.GetPublicKeyFromAddres = function (Arr)
{
    var RetArr = new Uint8Array(33);
    RetArr[0] = 2;

    for(var i = 1; i < 33; i++)
        RetArr[i] = Arr[i - 1];

    return RetArr;
}


global.CheckDevelopSign = function (SignArr,Sign)
{
    var hash = SHA3BUF(SignArr);

    for(var i = 0; i < DEVELOP_PUB_KEY_ARR.length; i++)
    {
        var Result = CheckSign(hash, Sign, DEVELOP_PUB_KEY_ARR[i]);
        if(Result)
            return 1;
    }

    return 0;
}

global.CheckSign = function (Hash,Sign,PubKey)
{
    if(PubKey[0] === 2 || PubKey[0] === 3)
    {
        if(!(Hash instanceof Buffer))
            Hash = Buffer.from(Hash);
        if(!(Sign instanceof Buffer))
            Sign = Buffer.from(Sign);
        if(!(PubKey instanceof Buffer))
            PubKey = Buffer.from(PubKey);


        try
        {
            return secp256k1.verify(Hash, Sign, PubKey);
        }
        catch(e)
        {
            ToLogTx("" + e, 3);
        }
    }
    return 0;
}

global.ecrecover = function (hash,v,r,s)
{
    v -= 27;
    var signature = [];
    for(var i = 0; i < 32; i++)
    {
        signature[i] = r[i];
        signature[i + 32] = s[i];
    }
    if(!(hash instanceof Buffer))
        hash = Buffer.from(hash);
    if(!(signature instanceof Buffer))
        signature = Buffer.from(signature);

    var PubKey = secp256k1.recover(hash, signature, v, false);
    var Addr = keccak256(PubKey.slice(1)).slice(12);
    return Addr;
}


global.CheckContextSecret = function (Context,ContextAddrTo)
{
    if(ContextAddrTo.Secret === undefined)
    {
        if(ContextAddrTo.publickey === undefined)
        {
            ContextAddrTo.publickey = GetPublicKeyFromAddres(ContextAddrTo.addrArr);
        }
        ContextAddrTo.Secret = Context.KeyPair.computeSecret(ContextAddrTo.publickey, null);
    }
}



global.GetKeyPair = function (password,secret,startnonce1,startnonce2)
{
    secret = secret || "low";
    startnonce1 = startnonce1 || 0;
    startnonce2 = startnonce2 || 0;

    var KeyPair = crypto.createECDH('secp256k1');

    var private1 = shaarr(password);
    var private2 = private1;

    var nonce1 = 0;
    if(secret === "high")
        for(nonce1 = startnonce1; nonce1 < 2000000000; nonce1++)
        {
            private1[31] = nonce1 & 0xFF;
            private1[30] = (nonce1 >>> 8) & 0xFF;
            private1[29] = (nonce1 >>> 16) & 0xFF;
            private1[28] = (nonce1 >>> 24) & 0xFF;

            private2 = shaarr(private1);
            if(private2[0] === 0 && private2[1] === 0 && private2[2] === 0)
            {
                break;
            }
            nonce1++;
        }

    var nonce2;
    for(nonce2 = startnonce2; nonce2 < 2000000000; nonce2++)
    {
        private2[31] = nonce2 & 0xFF;
        private2[30] = (nonce2 >>> 8) & 0xFF;
        private2[29] = (nonce2 >>> 16) & 0xFF;
        private2[28] = (nonce2 >>> 24) & 0xFF;

        KeyPair.setPrivateKey(Buffer.from(private2));
        var Data = KeyPair.getPublicKey('', 'compressed');
        if(Data[0] === 2 && Data[31] === 0 && Data[32] === 0)
        {
            KeyPair.nonce1 = nonce1;
            KeyPair.nonce2 = nonce2;
            KeyPair.PubKeyArr = KeyPair.getPublicKey('', 'compressed');
            KeyPair.addrArr = KeyPair.PubKeyArr.slice(1);
            KeyPair.addrStr = GetHexFromArr(KeyPair.addrArr);
            KeyPair.addr = KeyPair.addrArr;
            return KeyPair;
        }
        nonce2++;
    }

    throw "ERROR. Key pair not found. Try another password!";
}

global.GetKeyPairTest = function (password,Power)
{
    var KeyPair = crypto.createECDH('secp256k1');
    var private2 = shaarr(password);

    for(var nonce2 = 0; nonce2 < 1000000000; nonce2++)
    {
        private2[31] = nonce2 & 0xFF;
        private2[30] = (nonce2 >> 8) & 0xFF;
        private2[29] = (nonce2 >> 16) & 0xFF;
        private2[28] = (nonce2 >> 24) & 0xFF;

        KeyPair.setPrivateKey(Buffer.from(private2));
        var Data = KeyPair.getPublicKey('', 'compressed');
        if(Data[0] === 2)
        {
            if(Power)
            {
                var nBits = GetPowPower(Data.slice(1));
                if(nBits < Power)
                    continue;
            }

            KeyPair.PubKeyArr = Data;
            KeyPair.addrArr = KeyPair.PubKeyArr.slice(1);
            KeyPair.addrStr = GetHexFromArr(KeyPair.addrArr);
            KeyPair.addr = KeyPair.addrArr;
            return KeyPair;
        }
    }

    throw "ERROR. Key pair not found. Try another password!";
}


function GetHashWithNonce(hash0,nonce)
{
    return shaarr2(hash0, GetArrFromValue(nonce));
}

global.GetHashWithValues = GetHashWithValues;
function GetHashWithValues(hash0,value1,value2,bNotCopy)
{
    var hash;
    if(bNotCopy)
        hash = hash0;
    else
        hash = hash0.slice();

    hash[0] = value1 & 0xFF;
    hash[1] = (value1 >>> 8) & 0xFF;
    hash[2] = (value1 >>> 16) & 0xFF;
    hash[3] = (value1 >>> 24) & 0xFF;

    hash[4] = value2 & 0xFF;
    hash[5] = (value2 >>> 8) & 0xFF;
    hash[6] = (value2 >>> 16) & 0xFF;
    hash[7] = (value2 >>> 24) & 0xFF;

    var arrhash = shaarr(hash);
    return arrhash;
}

function GetPowPower(arrhash)
{
    var SumBit = 0;
    if(arrhash)
        for(var i = 0; i < arrhash.length; i++)
        {
            var CurSum = Math.clz32(arrhash[i]) - 24;
            SumBit += CurSum;
            if(CurSum !== 8)
                break;
        }
    return SumBit;
}

function GetPowValue(arrhash)
{
    var value = (arrhash[0] << 23) * 2 + (arrhash[1] << 16) + (arrhash[2] << 8) + arrhash[3];
    value = value * 256 + arrhash[4];
    value = value * 256 + arrhash[5];

    return value;
}


global.CreateNoncePOWExtern = CreateNoncePOWExtern;
function CreateNoncePOWExtern(arr0,BlockNum,count,startnone)
{
    var arr = [];
    for(var i = 0; i < arr0.length; i++)
        arr[i] = arr0[i];
    if(!startnone)
        startnone = 0;

    var maxnonce = 0;
    var supervalue = MAX_SUPER_VALUE_POW;
    for(var nonce = startnone; nonce <= startnone + count; nonce++)
    {
        var arrhash = GetHashWithValues(arr, nonce, BlockNum, true);
        var value = GetPowValue(arrhash);

        if(value < supervalue)
        {
            maxnonce = nonce;
            supervalue = value;
        }
    }
    return maxnonce;
}
global.CreateNoncePOWExternMinPower = CreateNoncePOWExternMinPower;
function CreateNoncePOWExternMinPower(arr0,BlockNum,MinPow)
{
    var arr = [];
    for(var i = 0; i < arr0.length; i++)
        arr[i] = arr0[i];

    var nonce = 0;
    while(1)
    {
        var arrhash = GetHashWithValues(arr, nonce, BlockNum, true);
        var power = GetPowPower(arrhash);
        if(power >= MinPow)
        {
            return nonce;
        }
        nonce++;
    }
}


function IsZeroArr(arr)
{
    if(arr)
        for(var i = 0; i < arr.length; i++)
        {
            if(arr[i])
                return false;
        }
    return true;
}

function CalcMerkl3FromArray(Arr,BlockNum,Tree0)
{
    var Tree, bSort;
    if(Tree0)
    {
        bSort = 0;
        Tree = Tree0;
    }
    else
    {
        bSort = 1;
        Tree = {Levels:[], Full:true};
    }
    Tree.Levels.push(Arr);

    if(Arr.length < 2)
    {
        if(Arr.length === 0)
            Tree.Root = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        else
        {
            if(Arr[0].length === 32)
                Tree.Root = Arr[0];
            else
                Tree.Root = sha3(Arr[0], 20);
        }

        return Tree;
    }

    if(bSort && BlockNum < global.UPDATE_CODE_4)
    {
        Arr.sort(CompareArr);
    }

    var Arr2 = [];
    var len = Math.floor(Arr.length / 2);
    for(var i = 0; i < len; i++)
    {
        var Hash = sha3arr2(Arr[i * 2], Arr[i * 2 + 1]);
        Arr2.push(Hash);
    }
    if(len * 2 !== Arr.length)
    {
        Arr2.push(Arr[Arr.length - 1]);
    }

    return CalcMerkl3FromArray(Arr2, BlockNum, Tree);
}

function CalcMerkl0FromArray(Arr,Tree0)
{
    var Tree, bSort;
    if(Tree0)
    {
        bSort = 0;
        Tree = Tree0;
    }
    else
    {
        bSort = 1;
        Tree = {Levels:[], Full:true};
    }
    Tree.Levels.push(Arr);

    if(Arr.length < 2)
    {
        if(Arr.length === 0)
            Tree.Root = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        else
        {
            if(Arr[0].length === 32)
                Tree.Root = Arr[0];
            else
                Tree.Root = shaarr(Arr[0]);
        }

        return Tree;
    }

    if(bSort)
    {
        Arr.sort(CompareArr);
    }

    var Arr2 = [];
    var len = Math.floor(Arr.length / 2);
    for(var i = 0; i < len; i++)
    {
        var Hash = shaarr2(Arr[i * 2], Arr[i * 2 + 1]);
        Arr2.push(Hash);
    }
    if(len * 2 !== Arr.length)
    {
        Arr2.push(Arr[Arr.length - 1]);
    }

    return CalcMerkl0FromArray(Arr2, Tree);
}

function CalcMerklFromArray(BlockNum,Arr)
{
    if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
    {
        return CalcMerkl3FromArray(Arr, BlockNum);
    }
    else
    {
        return CalcMerkl0FromArray(Arr);
    }
}

function CalcTreeHashFromArrBody(BlockNum,arrContent)
{
    if(arrContent)
    {
        var arrHASH = [];

        for(var i = 0; i < arrContent.length; i++)
        {
            var HASH;
            var Item = arrContent[i];
            if(Item.HASH)
                HASH = Item.HASH;
            else
            if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
                HASH = sha3(Item, 31);
            else
                HASH = shaarr(Item);
            arrHASH.push(HASH);
        }
        var Tree = CalcMerklFromArray(BlockNum, arrHASH);
        return Tree.Root;
    }
    else
    {
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
}

function TestMerklTree()
{

    var h1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var h2 = sha3("2", 22);
    var h3 = sha3("3");
    var h4 = sha3("4");
    var h5 = sha3("5");

    var Tree = {RecalcCount:0};
    var CalcMap = {};

    Tree.LevelsHash = [[h1, h2]];
    Tree.RecalcCount = 0;
    CalcMap[0] = 1;
    CalcMap[1] = 1;
    UpdateMerklTree(Tree, CalcMap, 0);
    CalcMap = {};
    Tree.LevelsHash[0] = [h1, h2, h3, h4];
    Tree.RecalcCount = 0;
    CalcMap[2] = 1;
    CalcMap[3] = 1;
    UpdateMerklTree(Tree, CalcMap, 0);
    CalcMap = {};
    Tree.LevelsHash[0] = [h1, h2, h3];
    Tree.RecalcCount = 0;
    CalcMap[Tree.LevelsHash[0].length - 1] = 1;
    UpdateMerklTree(Tree, CalcMap, 0);
    ToLog("Root=" + GetHexFromArr(Tree.Root));
    ToLog("RecalcCount=" + Tree.RecalcCount);

    return Tree;
}

if(0)
    setTimeout(function ()
    {

        TestMerkleProof(100);
        ToLog("=========END=========");
        process.exit(0);
    });

function TestMerkleProof(CountTest)
{
    for(var R = 0; R < CountTest; R++)
    {
        var CountItems = Math.floor(Math.random() * CountTest);
        var Tree = {RecalcCount:0};
        var CalcMap = {};
        Tree.LevelsHash = [];
        Tree.LevelsHash[0] = [];
        for(var i = 0; i < CountItems; i++)
        {
            CalcMap[i] = 1;
            Tree.LevelsHash[0][i] = sha3("" + i + "-" + R, 23);
        }
        UpdateMerklTree(Tree, CalcMap, 0);
        ToLog("Hash1=" + GetHexFromArr(Tree.Root) + " CountItems:" + CountItems);

        var FirstNum = Math.floor(Math.random() * CountItems / 2);
        var LastNum = Math.floor(CountItems / 2 + Math.random() * CountItems / 2);
        var Ret = GetMerkleProof(Tree.LevelsHash, FirstNum, LastNum);

        var ArrM = Tree.LevelsHash[0].slice(FirstNum, LastNum + 1);
        var Hash2 = CheckMerkleProof(Ret.ArrL, ArrM, Ret.ArrR);

        ToLog("Hash2=" + GetHexFromArr(Hash2) + "  FirstNum=" + FirstNum + "/" + LastNum);
        if(CompareArr(Tree.Root, Hash2) !== 0)
            throw ("=========ERROR HASHTEST==============");
        else
            ToLog("=========OK==============");
    }
}

function GetMerkleProof(LevelsHash,FirstNum,LastNum)
{
    var ArrL = [];
    var ArrR = [];
    var CurL = FirstNum;
    var CurR = LastNum;
    for(var L = 0; L < LevelsHash.length; L++)
    {
        var LevelArr = LevelsHash[L];
        if(CurL % 2 === 1)
            ArrL[L] = LevelArr[CurL - 1];

        if(CurR % 2 === 0 && CurR + 1 < LevelArr.length)
            ArrR[L] = LevelArr[CurR + 1];

        CurL = Math.floor(CurL / 2);
        CurR = Math.floor(CurR / 2);
    }

    return {ArrL:ArrL, ArrR:ArrR};
}

function CheckMerkleProof(ArrL,ArrM,ArrR)
{
    var L = 0;
    var Arr2 = ArrM;
    while(true)
    {
        var Arr = [].concat(Arr2);
        if(ArrL[L])
            Arr.unshift(ArrL[L]);
        if(ArrR[L])
            Arr.push(ArrR[L]);

        if(Arr.length <= 1 && L >= ArrL.length && L >= ArrR.length)
        {
            if(!Arr.length)
                return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            return Arr[0];
        }

        var length2 = Math.floor(Arr.length / 2);

        Arr2 = [];
        for(i = 0; i < length2; i++)
        {
            var Hash = sha3(arr2(Arr[i * 2], Arr[i * 2 + 1]), 24);
            Arr2.push(Hash);
        }
        if(Arr.length / 2 > length2)
            Arr2.push(Arr[Arr.length - 1]);

        L++;
    }
}

function UpdateMerklTree(Tree,CalcMap,NumLevel)
{

    var HashArr = Tree.LevelsHash[NumLevel];

    if(!HashArr || !HashArr.length)
    {
        Tree.LevelsHash.length = NumLevel + 1;
        Tree.MaxLevel = NumLevel;
        Tree.Root = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    else
    if(HashArr.length === 1)
    {
        Tree.LevelsHash.length = NumLevel + 1;
        Tree.MaxLevel = NumLevel;
        Tree.Root = HashArr[0];
    }
    else
    {
        var CalcMap2 = {};
        var HashArr2 = Tree.LevelsHash[NumLevel + 1];
        if(!HashArr2)
        {
            HashArr2 = [];
            Tree.LevelsHash[NumLevel + 1] = HashArr2;
        }

        var len2 = Math.floor(HashArr.length / 2);
        HashArr2.length = Math.floor(0.5 + HashArr.length / 2);

        var Count = 0;
        var LastIndex = HashArr.length - 1;
        for(var key in CalcMap)
        {
            var i2 = Math.floor(key / 2);
            if(i2 < len2)
            {
                Count++;
                CalcMap2[i2] = 1;
                HashArr2[i2] = sha3(arr2(HashArr[i2 * 2], HashArr[i2 * 2 + 1]), 25);
            }
            else
            {
                if(key > LastIndex)
                {
                    CalcMap2[i2] = 1;
                }
                else
                if(i2 === len2)
                {
                    Count++;
                    CalcMap2[i2] = 1;
                    HashArr2[i2] = HashArr[key];
                }
            }
        }

        if(Count)
        {
            Tree.RecalcCount += Count;
            UpdateMerklTree(Tree, CalcMap2, NumLevel + 1);
        }
    }
}

var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649, 0, 2147516545, 2147483648, 32777,
    2147483648, 138, 0, 136, 0, 2147516425, 0, 2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771, 2147483648,
    32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648, 2147516545, 2147483648, 32896, 2147483648, 2147483649,
    0, 2147516424, 2147483648];

function Mesh(s,Count)
{
    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15,
        b16, b17, b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33, b34, b35, b36, b37, b38, b39, b40,
        b41, b42, b43, b44, b45, b46, b47, b48, b49;
    for(n = 0; n < Count; n += 2)
    {
        c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
        c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
        c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
        c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
        c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
        c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
        c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
        c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
        c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
        c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

        h = c8 ^ ((c2 << 1) | (c3 >>> 31));
        l = c9 ^ ((c3 << 1) | (c2 >>> 31));
        s[0] ^= h;
        s[1] ^= l;
        s[10] ^= h;
        s[11] ^= l;
        s[20] ^= h;
        s[21] ^= l;
        s[30] ^= h;
        s[31] ^= l;
        s[40] ^= h;
        s[41] ^= l;
        h = c0 ^ ((c4 << 1) | (c5 >>> 31));
        l = c1 ^ ((c5 << 1) | (c4 >>> 31));
        s[2] ^= h;
        s[3] ^= l;
        s[12] ^= h;
        s[13] ^= l;
        s[22] ^= h;
        s[23] ^= l;
        s[32] ^= h;
        s[33] ^= l;
        s[42] ^= h;
        s[43] ^= l;
        h = c2 ^ ((c6 << 1) | (c7 >>> 31));
        l = c3 ^ ((c7 << 1) | (c6 >>> 31));
        s[4] ^= h;
        s[5] ^= l;
        s[14] ^= h;
        s[15] ^= l;
        s[24] ^= h;
        s[25] ^= l;
        s[34] ^= h;
        s[35] ^= l;
        s[44] ^= h;
        s[45] ^= l;
        h = c4 ^ ((c8 << 1) | (c9 >>> 31));
        l = c5 ^ ((c9 << 1) | (c8 >>> 31));
        s[6] ^= h;
        s[7] ^= l;
        s[16] ^= h;
        s[17] ^= l;
        s[26] ^= h;
        s[27] ^= l;
        s[36] ^= h;
        s[37] ^= l;
        s[46] ^= h;
        s[47] ^= l;
        h = c6 ^ ((c0 << 1) | (c1 >>> 31));
        l = c7 ^ ((c1 << 1) | (c0 >>> 31));
        s[8] ^= h;
        s[9] ^= l;
        s[18] ^= h;
        s[19] ^= l;
        s[28] ^= h;
        s[29] ^= l;
        s[38] ^= h;
        s[39] ^= l;
        s[48] ^= h;
        s[49] ^= l;

        b0 = s[0];
        b1 = s[1];
        b32 = (s[11] << 4) | (s[10] >>> 28);
        b33 = (s[10] << 4) | (s[11] >>> 28);
        b14 = (s[20] << 3) | (s[21] >>> 29);
        b15 = (s[21] << 3) | (s[20] >>> 29);
        b46 = (s[31] << 9) | (s[30] >>> 23);
        b47 = (s[30] << 9) | (s[31] >>> 23);
        b28 = (s[40] << 18) | (s[41] >>> 14);
        b29 = (s[41] << 18) | (s[40] >>> 14);
        b20 = (s[2] << 1) | (s[3] >>> 31);
        b21 = (s[3] << 1) | (s[2] >>> 31);
        b2 = (s[13] << 12) | (s[12] >>> 20);
        b3 = (s[12] << 12) | (s[13] >>> 20);
        b34 = (s[22] << 10) | (s[23] >>> 22);
        b35 = (s[23] << 10) | (s[22] >>> 22);
        b16 = (s[33] << 13) | (s[32] >>> 19);
        b17 = (s[32] << 13) | (s[33] >>> 19);
        b48 = (s[42] << 2) | (s[43] >>> 30);
        b49 = (s[43] << 2) | (s[42] >>> 30);
        b40 = (s[5] << 30) | (s[4] >>> 2);
        b41 = (s[4] << 30) | (s[5] >>> 2);
        b22 = (s[14] << 6) | (s[15] >>> 26);
        b23 = (s[15] << 6) | (s[14] >>> 26);
        b4 = (s[25] << 11) | (s[24] >>> 21);
        b5 = (s[24] << 11) | (s[25] >>> 21);
        b36 = (s[34] << 15) | (s[35] >>> 17);
        b37 = (s[35] << 15) | (s[34] >>> 17);
        b18 = (s[45] << 29) | (s[44] >>> 3);
        b19 = (s[44] << 29) | (s[45] >>> 3);
        b10 = (s[6] << 28) | (s[7] >>> 4);
        b11 = (s[7] << 28) | (s[6] >>> 4);
        b42 = (s[17] << 23) | (s[16] >>> 9);
        b43 = (s[16] << 23) | (s[17] >>> 9);
        b24 = (s[26] << 25) | (s[27] >>> 7);
        b25 = (s[27] << 25) | (s[26] >>> 7);
        b6 = (s[36] << 21) | (s[37] >>> 11);
        b7 = (s[37] << 21) | (s[36] >>> 11);
        b38 = (s[47] << 24) | (s[46] >>> 8);
        b39 = (s[46] << 24) | (s[47] >>> 8);
        b30 = (s[8] << 27) | (s[9] >>> 5);
        b31 = (s[9] << 27) | (s[8] >>> 5);
        b12 = (s[18] << 20) | (s[19] >>> 12);
        b13 = (s[19] << 20) | (s[18] >>> 12);
        b44 = (s[29] << 7) | (s[28] >>> 25);
        b45 = (s[28] << 7) | (s[29] >>> 25);
        b26 = (s[38] << 8) | (s[39] >>> 24);
        b27 = (s[39] << 8) | (s[38] >>> 24);
        b8 = (s[48] << 14) | (s[49] >>> 18);
        b9 = (s[49] << 14) | (s[48] >>> 18);

        s[0] = b0 ^ (~b2 & b4);
        s[1] = b1 ^ (~b3 & b5);
        s[10] = b10 ^ (~b12 & b14);
        s[11] = b11 ^ (~b13 & b15);
        s[20] = b20 ^ (~b22 & b24);
        s[21] = b21 ^ (~b23 & b25);
        s[30] = b30 ^ (~b32 & b34);
        s[31] = b31 ^ (~b33 & b35);
        s[40] = b40 ^ (~b42 & b44);
        s[41] = b41 ^ (~b43 & b45);
        s[2] = b2 ^ (~b4 & b6);
        s[3] = b3 ^ (~b5 & b7);
        s[12] = b12 ^ (~b14 & b16);
        s[13] = b13 ^ (~b15 & b17);
        s[22] = b22 ^ (~b24 & b26);
        s[23] = b23 ^ (~b25 & b27);
        s[32] = b32 ^ (~b34 & b36);
        s[33] = b33 ^ (~b35 & b37);
        s[42] = b42 ^ (~b44 & b46);
        s[43] = b43 ^ (~b45 & b47);
        s[4] = b4 ^ (~b6 & b8);
        s[5] = b5 ^ (~b7 & b9);
        s[14] = b14 ^ (~b16 & b18);
        s[15] = b15 ^ (~b17 & b19);
        s[24] = b24 ^ (~b26 & b28);
        s[25] = b25 ^ (~b27 & b29);
        s[34] = b34 ^ (~b36 & b38);
        s[35] = b35 ^ (~b37 & b39);
        s[44] = b44 ^ (~b46 & b48);
        s[45] = b45 ^ (~b47 & b49);
        s[6] = b6 ^ (~b8 & b0);
        s[7] = b7 ^ (~b9 & b1);
        s[16] = b16 ^ (~b18 & b10);
        s[17] = b17 ^ (~b19 & b11);
        s[26] = b26 ^ (~b28 & b20);
        s[27] = b27 ^ (~b29 & b21);
        s[36] = b36 ^ (~b38 & b30);
        s[37] = b37 ^ (~b39 & b31);
        s[46] = b46 ^ (~b48 & b40);
        s[47] = b47 ^ (~b49 & b41);
        s[8] = b8 ^ (~b0 & b2);
        s[9] = b9 ^ (~b1 & b3);
        s[18] = b18 ^ (~b10 & b12);
        s[19] = b19 ^ (~b11 & b13);
        s[28] = b28 ^ (~b20 & b22);
        s[29] = b29 ^ (~b21 & b23);
        s[38] = b38 ^ (~b30 & b32);
        s[39] = b39 ^ (~b31 & b33);
        s[48] = b48 ^ (~b40 & b42);
        s[49] = b49 ^ (~b41 & b43);

        s[0] ^= RC[n];
        s[1] ^= RC[n + 1];
    }
}

function WriteNumToArr0(body,Num)
{
    body[0] ^= Num & 0xFF;
    body[1] ^= (Num >>> 8) & 0xFF;
    body[2] ^= (Num >>> 16) & 0xFF;
    body[3] ^= (Num >>> 24) & 0xFF;
}

function CalcClientHash(Str,nonce)
{
    var arr = [0, 0, 0, 0];
    for(var i = 0; i < Str.length; i++)
        arr[4 + i] = Str.charCodeAt(i);
    WriteNumToArr0(arr, nonce);
    Mesh(arr, 60);
    return GetHexFromArr(arr) + "-" + nonce;
}

global.CalcClientHash = CalcClientHash;

var EncryptSaltNum;

function GetEncrypt(ArrIn,ArrSecret)
{

    if(!EncryptSaltNum)
        EncryptSaltNum = (Date.now() - new Date(2020, 0, 1)) * 10000 + random(10000);
    EncryptSaltNum++;

    var SecretBuf = ArrSecret.slice(0);
    WriteUintToArr(SecretBuf, EncryptSaltNum);

    var ArrOut = [];
    DoSecret(ArrOut, ArrIn, SecretBuf);
    WriteUintToArr(ArrOut, EncryptSaltNum);

    return ArrOut;
}

function GetDecrypt(ArrIn,ArrSecret)
{
    var SaltNum = ReadUintFromArr(ArrIn, ArrIn.length - 6);
    var ArrIn2 = ArrIn.slice(0, ArrIn.length - 6);

    var SecretBuf = ArrSecret.slice(0);
    WriteUintToArr(SecretBuf, SaltNum);

    var ArrOut = [];
    DoSecret(ArrOut, ArrIn2, SecretBuf);
    return ArrOut;
}

function DoSecret(ArrOut,ArrIn,SecretBuf)
{
    var CryptID = 0;
    var PosCryptID = SecretBuf.length;
    var Pos = 0;
    while(Pos < ArrIn.length)
    {
        WriteUintToArrOnPos(SecretBuf, CryptID, PosCryptID);
        var CurBuf = sha3(SecretBuf);
        for(var i = 0; i < 32 && Pos < ArrIn.length; i++, Pos++)
        {
            ArrOut[Pos] = ArrIn[Pos] ^ CurBuf[i];
        }

        CryptID++;
    }
}

function TestEncryptDecrypt()
{
    var ArrSecret = sha3("SecretPassowd!");
    var ArrMessage1 = toUTF8Array("Secret message!!!");
    var ArrEncrypt = GetEncrypt(ArrMessage1, ArrSecret);
    console.log("ArrMessage1 length=" + ArrMessage1.length);
    console.log("ArrMessage1=" + ArrMessage1);
    console.log("ArrEncrypt length=" + ArrEncrypt.length);
    console.log("ArrEncrypt=" + ArrEncrypt);

    var ArrMessage2 = GetDecrypt(ArrEncrypt, ArrSecret);
    console.log("ArrMessage2 length=" + ArrMessage2.length);
    console.log("ArrMessage2=" + ArrMessage2);

    var Str2 = Utf8ArrayToStr(ArrMessage2);
    console.log("Message=" + Str2);

    process.exit();
}

function TestEncryptDecrypt0()
{

    var ArrSecret = Buffer.from([1, 1, 1, 1, 1, 1]);
    var Arr = GetArrFromStr("  Secret message!", 64);
    var Arr2 = Buffer.from(new Uint8Array(Arr.length));
    var Arr3 = Buffer.from(new Uint8Array(Arr.length));

    console.log("Message:");
    console.log(Arr);
    console.log("-------------------");
    Encrypt(Arr, Arr2, ArrSecret);
    console.log("Encrypt:");
    console.log(Arr2);

    console.log("-------------------");
    Decrypt(Arr2, Arr3, ArrSecret);
    console.log("Decrypt:");
    console.log(Utf8ArrayToStr(Arr3.slice(9)));

    process.exit();
}

function toUTF8Array(str)
{
    var utf8 = [];
    for(var i = 0; str && i < str.length; i++)
    {
        var charcode = str.charCodeAt(i);
        if(charcode < 0x80)
            utf8.push(charcode);
        else
        if(charcode < 0x800)
        {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
        }
        else
        if(charcode < 0xd800 || charcode >= 0xe000)
        {
            utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
        else
        {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
}

function Utf8ArrayToStrNew(array)
{
    var out = Utf8ArrayToStrInner(array);

    for(var i = 0; i < out.length; i++)
    {
        if(out.charCodeAt(i) === 0)
        {
            out = out.substr(0, i);
            break;
        }
    }
    return out;
}

var Utf8ArrayToStrInner = (function ()
    {
        var charCache = new Array(128);
        var charFromCodePt = String.fromCodePoint || String.fromCharCode;
        var result = [];

        return function (array)
        {
            var codePt, byte1;
            var buffLen = array.length;

            result.length = 0;

            for(var i = 0; i < buffLen; )
            {
                byte1 = array[i++];

                if(byte1 <= 0x7F)
                {
                    codePt = byte1;
                }
                else
                if(byte1 <= 0xDF)
                {
                    codePt = ((byte1 & 0x1F) << 6) | (array[i++] & 0x3F);
                }
                else
                if(byte1 <= 0xEF)
                {
                    codePt = ((byte1 & 0x0F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
                }
                else
                if(String.fromCodePoint)
                {
                    codePt = ((byte1 & 0x07) << 18) | ((array[i++] & 0x3F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
                }
                else
                {
                    codePt = 63;
                    i += 3;
                }

                result.push(charCache[codePt] || (charCache[codePt] = charFromCodePt(codePt)));
            }

            return result.join('');
        };
    }
)();

//Old version
function Utf8ArrayToStr(array)
{
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len)
    {
        c = array[i++];
        switch(c >> 4)
        {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                out += String.fromCharCode(c);
                break;
            case 12:
            case 13:
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) | ((char2 & 0x3F) << 6) | ((char3 & 0x3F) << 0));
                break;
        }
    }

    for(var i = 0; i < out.length; i++)
    {
        if(out.charCodeAt(i) === 0)
        {
            out = out.substr(0, i);
            break;
        }
    }
    return out;
}

function GetArr32FromStr(Str)
{
    return GetArrFromStr(Str, 32);
}

function GetArrFromStr(Str,Len)
{
    var arr = toUTF8Array(Str);
    for(var i = arr.length; i < Len; i++)
    {
        arr[i] = 0;
    }
    return arr.slice(0, Len);
}

function GetRandomBytes(Count)
{
    return crypto.randomBytes(Count);
}

function TeraDevKeysInit()
{
    global.DEVELOP_PUB_KEY_ARR = [
        "025defd5b884cc02f6948cd0d62b03d7b7445bf942206ab935158b6be8f0f7a2ce",//48
        "024a97d69cd81c965f162b4b8b7b506263bc8aec8dbcea9eec59f73b5b470a0be1",//49
        "021e7153bacc0c8778b3956f698492147cf02f128bf9f1752d9278b49124b2ce38",//30
        "027887c45097b9a1739c5ebbfbe1675cf864ba1e1a20b17157532efdca5bd34359",//31
    ];
    for(var i = 0; i < DEVELOP_PUB_KEY_ARR.length; i++)
        DEVELOP_PUB_KEY_ARR[i] = Buffer.from(GetArrFromHex(DEVELOP_PUB_KEY_ARR[i]));
    global.DEVELOP_PUB_KEY0 = Buffer.from(GetArrFromHex("022e80aa78bc07c72781fac12488096f0bfa7b4f48fbab0f2a92e208d1ee3654df"));

    global.ARR_PUB_KEY = [
        "027ae0dce92d8be1f893525b226695ddf0fe6ad756349a76777ff51f3b59067d70",//8
        "02769165a6f9950d023a415ee668b80bb96b5c9ae2035d97bdfb44f356175a44ff",
        "021566c6feb5495594fc4bbea27795e1db5a663b3fe81ea9846268d5c394e24c23",
        "0215accbc993e67216c9b7f3912b29b91671864e861e61ab73589913c946839efa",
        "0270e0c5acb8eefe7faddac45503da4885e02fb554975d12907f6c33ac6c6bdba5",
        "0202f2aad628f46d433faf70ba6bf12ab9ed96a46923b592a72508dc43af36cb80",
        "0254f373fc44ac4a3e80ec8cb8cc3693a856caa82e0493067bdead78ce8ec354b8",
        "027617f9511b0b0cdbda8f3e17907732731296321846f3fd6fd19460f7227d9482",//15
    ];

    if(global.TEST_NETWORK || global.LOCAL_RUN)
    {
        if(global.LOCAL_RUN)
        {
            //AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
            global.DEVELOP_PUB_KEY0 = Buffer.from(GetArrFromHex("026A04AB98D9E4774AD806E302DDDEB63BEA16B5CB5F223EE77478E861BB583EB3"));
        }

        global.ARR_PUB_KEY = [];
        for(var i = 0; i < 100; i++)
            global.ARR_PUB_KEY[i] = GetHexFromArr(DEVELOP_PUB_KEY0);

        global.DEVELOP_PUB_KEY_ARR = [DEVELOP_PUB_KEY0];
    }
}

global.GetRandomBytes = GetRandomBytes;
global.CalcMerklFromArray = CalcMerklFromArray;
global.CalcTreeHashFromArrBody = CalcTreeHashFromArrBody;
global.UpdateMerklTree = UpdateMerklTree;

global.GetMerkleProof = GetMerkleProof;
global.CheckMerkleProof = CheckMerkleProof;

global.IsZeroArr = IsZeroArr;
global.GetHashWithNonce = GetHashWithNonce;
global.GetPowPower = GetPowPower;
global.GetPowValue = GetPowValue;
global.Mesh = Mesh;

global.GetEncrypt = GetEncrypt;
global.GetDecrypt = GetDecrypt;
global.toUTF8Array = toUTF8Array;
global.Utf8ArrayToStr = Utf8ArrayToStr;
global.GetArrFromStr = GetArrFromStr;

global.IsDeveloperAccount = function (Key)
{
    for(var i = 0; i < global.DEVELOP_PUB_KEY_ARR.length; i++)
        if(CompareArr(Key, global.DEVELOP_PUB_KEY_ARR[i]) === 0)
        {
            return 1;
        }
    return 0;
}

if(!global.ARR_PUB_KEY)
    TeraDevKeysInit();
