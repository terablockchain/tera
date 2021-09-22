/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var MAX_SUPER_VALUE_POW = (1 << 30) * 2;

window.TYPE_TRANSACTION_CREATE = 100;
window.TYPE_TRANSACTION_ACC_CHANGE = 102;
window.TYPE_TRANSACTION_NEW_SHARD = 60;

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
    for(var i = 0; i < arrhash.length; i++)
    {
        var byte = arrhash[i];
        for(var b = 7; b >= 0; b--)
        {
            if((byte >> b) & 1)
            {
                return SumBit;
            }
            else
            {
                SumBit++;
            }
        }
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


window.TX_ID_HASH_LENGTH = 10;
function CreateHashBody(body,Num,Nonce)
{
    
    var length = body.length - 12;
    
    body[length + 0] = Num & 0xFF;
    body[length + 1] = (Num >>> 8) & 0xFF;
    body[length + 2] = (Num >>> 16) & 0xFF;
    body[length + 3] = (Num >>> 24) & 0xFF;
    body[length + 4] = 0;
    body[length + 5] = 0;
    
    length = body.length - 6;
    body[length + 0] = Nonce & 0xFF;
    body[length + 1] = (Nonce >>> 8) & 0xFF;
    body[length + 2] = (Nonce >>> 16) & 0xFF;
    body[length + 3] = (Nonce >>> 24) & 0xFF;
    body[length + 4] = 0;
    body[length + 5] = 0;
    
    var HASH = sha3(body);
    var FullHashTicket = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for(var i = 0; i < TX_ID_HASH_LENGTH; i++)
        FullHashTicket[i] = HASH[i];
    
    WriteUintToArrOnPos(FullHashTicket, Num, TX_ID_HASH_LENGTH);
    return sha3(FullHashTicket);
}

window.DELTA_POWER_POW_TR = 0;
window.DELTA_FOR_TIME_TX = 0;

window.CONSENSUS_PERIOD_TIME = 3000;
window.FIRST_TIME_BLOCK = 1403426400000;
window.NEW_SIGN_TIME = 25500000;

window.SetBlockChainConstant = function (Data)
{
    window.SERVER_VERSION = Data.VersionNum;
    
    // window.NETWORK_NAME = Data.NETWORK;
    CheckNetworkID(Data);

    if(window.NETWORK_NAME === "LOCAL")
        window.LOCAL_RUN = 1;
    else
        if(window.NETWORK_NAME.substr(0, 9) === "TEST-JINN")
            window.TEST_NETWORK = 1;
    
    var DeltaServerClient = new Date() - Data.CurTime;
    if(!Data.DELTA_CURRENT_TIME)
        Data.DELTA_CURRENT_TIME = 0;
    window.DELTA_CURRENT_TIME2 = Data.DELTA_CURRENT_TIME - DeltaServerClient;
    
    window.FIRST_TIME_BLOCK = Data.FIRST_TIME_BLOCK;
    window.UPDATE_CODE_JINN = Data.UPDATE_CODE_JINN;
    window.CONSENSUS_PERIOD_TIME = Data.CONSENSUS_PERIOD_TIME;
    
    window.NEW_SIGN_TIME = Data.NEW_SIGN_TIME;
    window.CONSENSUS_PERIOD_TIME = Data.CONSENSUS_PERIOD_TIME;
    window.JINN_MODE = 1;
    
    InitTeraHashConst();
    
    window.GetCurrentBlockNumByTime = function (Delta_Time)
    {
        var CurrentTime = Date.now() + DELTA_CURRENT_TIME2;
        var CurTimeNum = CurrentTime - FIRST_TIME_BLOCK;
        if(!Delta_Time)
            Delta_Time = 0;
        var StartBlockNum = Math.floor((CurTimeNum + CONSENSUS_PERIOD_TIME + Delta_Time) / CONSENSUS_PERIOD_TIME);
        return StartBlockNum;
    };
    
    window.NWMODE = Data.NWMODE;
}
window.GetCurrentBlockNumByTime = function ()
{
    return 0;
}

function GetBlockNumTr(arr)
{
    var Delta_Time = 0;
    if(CONSENSUS_PERIOD_TIME > 2000)
        Delta_Time = 2000;
    
    var BlockNum = window.DELTA_FOR_TIME_TX + GetCurrentBlockNumByTime(Delta_Time);
    
    return BlockNum;
}

var glNonce = 0;
function CreateHashBodyPOWInnerMinPower(arr)
{
    
    var TrType = arr[0];
    var BlockNum = GetBlockNumTr(arr);
    while(1)
    {
        var arrhash = CreateHashBody(arr, BlockNum, glNonce);
        var power = GetPowPower(arrhash);
        return glNonce;
    }
}

function LoadLib(Path)
{
    
    if(window.PROTOCOL_SERVER_PATH)
    {
        //var StrPath = GetProtocolServerPath(window.PROTOCOL_SERVER_PATH);//
        var StrPath = window.PROTOCOL_SERVER_PATH;
        Path = StrPath + Path;
    }
    
    var item = document.createElement('script');
    item.type = "text/javascript";
    item.src = Path;
    document.getElementsByTagName('head')[0].appendChild(item);
}

function IsMS()
{
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");
    if(msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))
    {
        return 1;
    }
    else
    {
        return 0;
    }
}

function LoadSignLib()
{
    if(window.SignLib)
        return;
    
    LoadLib("./JS/sign-lib-min.js");
}

function ComputeSecretWithCheck(PubKey,StrPrivKey,SmartNum,F)
{
    if(!window.SignLib)
    {
        SetError("Error: SignLib not installed");
        return;
    }
    
    if(!IsHexStr(StrPrivKey) || StrPrivKey.length !== 64)
    {
        SetError("Error set PrivKey");
        return;
    }
    var PrivKey = Buffer.from(GetArrFromHex(StrPrivKey));
    if(typeof PubKey === "string")
    {
        if(!IsHexStr(PubKey) || PubKey.length !== 66)
        {
            SetError("Error PubKey");
            return;
        }
        PubKey = Buffer.from(GetArrFromHex(PubKey));
    }
    var Result = ComputeSecretWithSmartNum(PubKey, PrivKey, SmartNum);
    F(Result);
}

function ComputeSecretWithSmartNum(PubKey,PrivKey,SmartNum)
{
    
    if(PubKey && !(PubKey instanceof Array) && PubKey.data)
        PubKey = PubKey.data;
    
    if(!(PubKey instanceof Buffer))
        PubKey = Buffer.from(PubKey);
    if(!(PrivKey instanceof Buffer))
        PrivKey = Buffer.from(PrivKey);
    
    var Result;
    if(SmartNum && SmartNum > 90)
    {
        var ArrNum = [];
        WriteUintToArr(ArrNum, SmartNum);
        Result = sha3arr2(SignLib.ecdh(PubKey, PrivKey), ArrNum);
    }
    else
    {
        
        Result = sha3(SignLib.ecdh(PubKey, PrivKey));
    }
    
    return Result;
}

function ComputeSecret(Account,PubKey,SmartNum,F)
{
    if(GetPrivKey())
    {
        ComputeSecretWithCheck(PubKey, GetPrivKey(), SmartNum, F);
    }
    else
    {
        GetData("GetWalletInfo", {Account:Account}, function (Data)
        {
            if(!Data || !Data.result)
                return;
            ComputeSecretWithCheck(PubKey, Data.PrivateKey, SmartNum, F);
        });
    }
}

function Encrypt(ArrSecret,StartEncrypt,StrName,StrValue)
{
    var arrRnd = sha3arr2(ArrSecret, sha3(StrName + StartEncrypt));
    var Arr = toUTF8Array(StrValue);
    
    return DoSecret(Arr, arrRnd);
}

function Decrypt(ArrSecret,StartEncrypt,StrName,Arr)
{
    if(!ArrSecret)
        return "".padEnd(Arr.length / 2, ".");
    
    if(typeof Arr === "string")
        Arr = GetArrFromHex(Arr);
    
    var arrRnd = sha3arr2(ArrSecret, sha3(StrName + StartEncrypt));
    var Arr2 = DoSecret(Arr, arrRnd);
    var Str = Utf8ArrayToStr(Arr2);
    
    return Str;
}

function DoSecret(Arr,arrRnd)
{
    var Arr2 = [];
    var CryptID = 0;
    var Pos = 0;
    while(Pos < Arr.length)
    {
        CryptID++;
        WriteUintToArrOnPos(arrRnd, CryptID, 0);
        var CurBuf = sha3(arrRnd);
        
        for(var i = 0; i < 32 && Pos < Arr.length; i++, Pos++)
        {
            Arr2[Pos] = Arr[Pos] ^ CurBuf[i];
        }
    }
    return Arr2;
}

var glEncryptInit = 0;
function EncryptInit()
{
    glEncryptInit++;
    var Time = Date.now() - new Date(2019, 0, 1);
    return Math.floor(Time * 100 + Math.random() * 100) * 100 + glEncryptInit;
}

function EncryptID(ArrSecret,StartEncrypt,id)
{
    var Value = $(id).value;
    Value = Value.padEnd(Value.length + random(5), " ");
    return GetHexFromArr(Encrypt(ArrSecret, StartEncrypt, id, Value));
}

function EncryptFields(ArrSecret,Params,ArrName)
{
    if(!Params.Crypto)
        Params.Crypto = EncryptInit();
    for(var i = 0; i < ArrName.length; i++)
    {
        var Name = ArrName[i];
        var Value = Params[Name];
        Value = Value.padEnd(Value.length + random(5), " ");
        Params[Name] = GetHexFromArr(Encrypt(ArrSecret, Params.Crypto, Name, Value));
    }
}
function DecryptFields(ArrSecret,Params,ArrName)
{
    for(var i = 0; i < ArrName.length; i++)
    {
        var Name = ArrName[i];
        if(Params[Name])
        {
            Params[Name] = Decrypt(ArrSecret, Params.Crypto, Name, GetArrFromHex(Params[Name]));
        }
        else
        {
            Params[Name] = "";
        }
    }
}

window.CreateSign = function (Hash,PrivKey)
{
    if(!(Hash instanceof Buffer))
        Hash = Buffer.from(Hash);
    if(!(PrivKey instanceof Buffer))
        PrivKey = Buffer.from(PrivKey);
    return SignLib.sign(Hash, PrivKey, null, null).signature;
}

window.CheckSign = function (Hash,Sign,PubKey)
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
            return SignLib.verify(Hash, Sign, PubKey);
        }
        catch(e)
        {
        }
    }
    return 0;
}

window.ecrecover = function (hash,v,r,s)
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
    
    var PubKey = SignLib.recover(hash, signature, v, false);
    var Addr = keccak256(PubKey.slice(1)).slice(12);
    return Addr;
}

LoadSignLib();
