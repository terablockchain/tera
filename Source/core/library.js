/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var fs = require('fs');
const os = require('os');

global.TX_RESULT_NOCONNECT =  - 9;
global.TX_RESULT_SIGN =  - 8;
global.TX_RESULT_OPERATION_ID =  - 7;
global.TX_RESULT_BAD_TYPE =  - 4;
global.TX_RESULT_WAS_SEND = 3;

global.TR_MAP_RESULT = {};
TR_MAP_RESULT[TX_RESULT_NOCONNECT] = "The node has no connections";
TR_MAP_RESULT[TX_RESULT_SIGN] = "Error sign";
TR_MAP_RESULT[TX_RESULT_OPERATION_ID] = "Error Operation ID";

TR_MAP_RESULT[ - 6] = "Inner node error";
TR_MAP_RESULT[ - 5] = "Bad block num";

TR_MAP_RESULT[TX_RESULT_BAD_TYPE] = "Bad type transaction";

TR_MAP_RESULT[ - 3] = "Bad time";
TR_MAP_RESULT[ - 2] = "Bad PoW";
TR_MAP_RESULT[ - 1] = "Bad length";
TR_MAP_RESULT[0] = "Not add";
TR_MAP_RESULT[1] = "OK";
TR_MAP_RESULT[2] = "Update OK";
TR_MAP_RESULT[TX_RESULT_WAS_SEND] = "Was send";
TR_MAP_RESULT[4] = "Added to timer";

if(global.UPDATE_CODE_VERSION_NUM===undefined)//не было загрузки констант
    require("./constant.js");

if(global.USE_PARAM_JS)
{
    var PathParams = GetCodePath("../extern-run.js");
    if(fs.existsSync(PathParams))
        try
        {
            require(PathParams);
        }
        catch(e)
        {
            console.log(e);
        }
}
require("./log.js");



Number.prototype.toStringZ = function (count)
{
    var strnum = this.toString();
    if(strnum.length > count)
        count = strnum.length;
    else
        strnum = "0000000000" + strnum;
    return strnum.substring(strnum.length - count, strnum.length);
};

String.prototype.right = function (count)
{
    if(this.length > count)
        return this.substr(this.length - count, count);
    else
        return this.substr(0, this.length);
};

require("../jinn/tera/db/BinTreeExt");

global.ZIP = require("zip");

var strOS = os.platform() + "_" + os.arch();
if(global.NWMODE)
{
    strOS = strOS + "_nw";
}


if(fs.existsSync("./lib/secp256k1/" + strOS + "/secp256k1.node"))
{
    try
    {
        global.secp256k1 = require('../lib/secp256k1/' + strOS + '/secp256k1.node');
    }
    catch(e)
    {
    }
}

if(!global.secp256k1)
{
    global.secp256k1 = require('secp256k1');
}

require('../HTML/JS/terahashlib.js');
require("./crypto-library");


require('../HTML/JS/terabuf.js');
global.BufLib = require("../core/buffer");
require('../HTML/JS/sha3.js');
require('../HTML/JS/coinlib.js');

require('./treebuffer.js');

global.GetCurrentBlockNumByTime = function GetCurrentBlockNumByTime(Delta_Time)
{
    if(!Delta_Time)
        Delta_Time = 0;
    var CurTimeNum = GetCurrentTime() - FIRST_TIME_BLOCK;
    var StartBlockNum = Math.trunc((CurTimeNum + CONSENSUS_PERIOD_TIME + Delta_Time) / CONSENSUS_PERIOD_TIME);
    return StartBlockNum;
}

global.DelDir = function (Path)
{
    if(Path.substr(Path.length - 1, 1) === "/")
        Path = Path.substr(0, Path.length - 1);
    
    if(fs.existsSync(Path))
    {
        var arr = fs.readdirSync(Path);
        
        for(var i = 0; i < arr.length; i++)
        {
            var name = Path + "/" + arr[i];
            if(fs.statSync(name).isDirectory())
            {
                DelDir(name);
            }
            else
            {
                if(name.right(9) == "const.lst")
                    continue;
                if(name.right(7) == "log.log")
                    continue;
                fs.unlinkSync(name);
            }
        }
    }
}

global.SliceArr = function (arr,start,end)
{
    var ret = [];
    for(var i = start; i < end; i++)
    {
        ret[i - start] = arr[i];
    }
    return ret;
}

var nRand = Math.floor(123 + Math.random() * 1000);
function random(max)
{
    return Math.floor(Math.random() * max);
}
global.random = random;


global.AddrLevelArrFromBegin = function (arr1,arr2)
{
    var Level = 0;
    for(var i = 0; i < arr1.length; i++)
    {
        var a1 = arr1[i];
        var a2 = arr2[i];
        for(var b = 0; b < 8; b++)
        {
            if((a1 & 128) !== (a2 & 128))
                return Level;
            
            a1 = a1 << 1;
            a2 = a2 << 1;
            Level++;
        }
    }
    
    return Level;
}

global.AddrLevelArr = function (arr1,arr2)
{
    var Level = 0;
    for(var i = arr1.length - 1; i >= 0; i--)
    {
        var a1 = arr1[i];
        var a2 = arr2[i];
        for(var b = 0; b < 8; b++)
        {
            if((a1 & 1) !== (a2 & 1))
                return Level;
            
            a1 = a1 >> 1;
            a2 = a2 >> 1;
            Level++;
        }
    }
    
    return Level;
}

global.SaveToFile = function (name,buf)
{
    var fs = require('fs');
    var file_handle = fs.openSync(name, "w");
    fs.writeSync(file_handle, buf, 0, buf.length);
    fs.closeSync(file_handle);
}


global.LoadParams = function (filename,DefaultValue)
{
    try
    {
        if(fs.existsSync(filename))
        {
            
            var Str = fs.readFileSync(filename);
            if(Str.length > 0)
                return JSON.parse(Str);
        }
    }
    catch(err)
    {
        TO_ERROR_LOG("MAINLIB", 100, "Error in file:" + filename + "\n" + err);
    }
    return DefaultValue;
}

global.SaveParams = function (filename,data)
{
    SaveToFile(filename, Buffer.from(JSON.stringify(data, "", 4)));
}

global.StartTime = function ()
{
    global.TimeStart = GetCurrentTime();
}

global.FinishTime = function (Str)
{
    Str = Str || "";
    var TimeFinish = GetCurrentTime();
    var delta = TimeFinish - TimeStart;
    
    console.log(Str + " time: " + delta + " ms");
}


global.CompareItemBufFD = function (a,b)
{
    if(a.FD !== b.FD)
        return a.FD - b.FD;
    else
        return a.Position - b.Position;
}

global.CompareArr33 = function (a,b)
{
    for(var i = 0; i < 33; i++)
    {
        if(a[i] !== b[i])
            return a[i] - b[i];
    }
    return 0;
}

global.CompareItemHashSimple = function (a,b)
{
    if(a.hash < b.hash)
        return  - 1;
    else
        if(a.hash > b.hash)
            return 1;
        else
            return 0;
}

global.CompareItemHash = function (a,b)
{
    var hasha = a.hash;
    var hashb = b.hash;
    for(var i = 0; i < hasha.length; i++)
    {
        if(hasha[i] !== hashb[i])
            return hasha[i] - hashb[i];
    }
    return 0;
}
global.CompareItemHash32 = function (a,b)
{
    var hasha = a.hash;
    var hashb = b.hash;
    for(var i = 0; i < 32; i++)
    {
        if(hasha[i] !== hashb[i])
            return hasha[i] - hashb[i];
    }
    return 0;
}
global.CompareItemHASH32 = function (a,b)
{
    var hasha = a.HASH;
    var hashb = b.HASH;
    for(var i = 0; i < 32; i++)
    {
        if(hasha[i] !== hashb[i])
            return hasha[i] - hashb[i];
    }
    return 0;
}
global.CompareItemHash33 = function (a,b)
{
    var hasha = a.hash;
    var hashb = b.hash;
    for(var i = 0; i < 33; i++)
    {
        if(hasha[i] !== hashb[i])
            return hasha[i] - hashb[i];
    }
    return 0;
}

global.CompareItemHashPow = function (a,b)
{
    return CompareArr(a.HashPow, b.HashPow);
}
global.CompareItemTimePow = function (a,b)
{
    if(b.TimePow !== a.TimePow)
        return b.TimePow - a.TimePow;
    else
        return CompareArr(a.HashPow, b.HashPow);
}

global.GetArrFromMap = function (Map)
{
    if(!Map)
        return [];
    
    var Arr = [];
    for(var key in Map)
    {
        Arr.push(Map[key]);
    }
    return Arr;
}

function CopyObjKeys(dest,src)
{
    for(var key in src)
    {
        dest[key] = src[key];
    }
    return dest;
}

global.CopyObjKeys = CopyObjKeys;

function PrepareToJSON(Data,MaxLevel,MaxChilds,JobMap)
{
    
    if(typeof Data !== "object")
        return Data;
    if(MaxLevel === undefined)
        MaxLevel = 5;
    if(MaxLevel <= 0)
        return "=level=";
    if(!MaxChilds)
        MaxChilds = 10;
    
    if(MaxChilds > 1)
    {
        if(!JobMap)
            JobMap = new Set();
        if(JobMap.has(Data))
            return "WAS ITEM: " + JSON.stringify(PrepareToJSON(Data, 1, MaxChilds));
        JobMap.add(Data);
    }
    
    var Ret = {};
    var Count = 0;
    for(var key in Data)
    {
        Count++;
        if(Count > MaxChilds)
        {
            Ret["=more items="] = "...";
            break;
        }
        
        var item = Data[key];
        if(item instanceof Buffer)
        {
            Ret[key] = GetHexFromArr(item).substr(0, 64);
        }
        else
            if(item && typeof item === "object")
            {
                if(item.length > 2 && typeof item[0] === "number" && typeof item[1] === "number")
                    Ret[key] = GetHexFromArr(item).substr(0, 64);
                else
                    Ret[key] = PrepareToJSON(item, MaxLevel - 1, MaxChilds, JobMap);
            }
            else
            {
                Ret[key] = item;
            }
    }
    
    return Ret;
}

global.PrepareToJSON = PrepareToJSON;

global.LOAD_CONST = function ()
{
    var Count = 0;
    var constants = LoadParams(GetDataPath("const.lst"), {});
    if(constants)
    {
        for(var i = 0; i < CONST_NAME_ARR.length; i++)
        {
            var key = CONST_NAME_ARR[i];
            if(constants[key] !== undefined)
            {
                Count++;
                global[key] = constants[key];
            }
        }
        
        if(global.ON_USE_CONST)
            global.ON_USE_CONST();
    }
    return Count;
}

var WasStartSaveConst = false;
function SaveConst()
{
    
    var constants = {};
    for(var i = 0; i < CONST_NAME_ARR.length; i++)
    {
        var key = CONST_NAME_ARR[i];
        if(global[key] !== undefined)
            constants[key] = global[key];
    }
    SaveParams(GetDataPath("const.lst"), constants);
    WasStartSaveConst = false;
}

global.SAVE_CONST = function (bForce)
{
    if(bForce)
    {
        SaveConst();
    }
    else
    {
        if(!WasStartSaveConst)
            setTimeout(SaveConst, 10 * 1000);
        WasStartSaveConst = true;
    }
    
    if(global.ON_USE_CONST)
        global.ON_USE_CONST();
}

function WathConstFile()
{
    if(!fs.existsSync(GetDataPath("const.lst")))
    {
        SAVE_CONST(1);
    }
    fs.watch(GetDataPath("const.lst"), {}, function (eventType,filename)
    {
        if(filename)
        {
            LOAD_CONST();
        }
    });
}



global.GetDeltaCurrentTime = function ()
{
    if(isNaN(global.DELTA_CURRENT_TIME) || typeof global.DELTA_CURRENT_TIME !== "number")
        global.DELTA_CURRENT_TIME = 0;
    return global.DELTA_CURRENT_TIME;
}

global.GetStrTimeUTC = function (now)
{
    if(!global.GetCurrentTime)
        return ":::";
    if(!now)
        now = GetCurrentTime();
    
    var Str = "" + now.getUTCDate();
    Str = Str + "." + (1 + now.getUTCMonth());
    Str = Str + "." + now.getUTCFullYear();
    Str = Str + " " + now.getUTCHours();
    Str = Str + ":" + now.getUTCMinutes();
    Str = Str + ":" + now.getUTCSeconds();
    return Str;
}

global.GetStrOnlyTimeUTC = function (now)
{
    if(!global.GetCurrentTime)
        return ":::";
    if(!now)
        now = GetCurrentTime();
    
    var Str;
    Str = "" + now.getUTCHours().toStringZ(2);
    Str = Str + ":" + now.getUTCMinutes().toStringZ(2);
    Str = Str + ":" + now.getUTCSeconds().toStringZ(2);
    return Str;
}

function GetSecFromStrTime(Str)
{
    var arr = Str.split(":");
    var Mult = 3600;
    var Sum = 0;
    for(var i = 0; i < arr.length; i++)
    {
        Sum += Mult * parseInt(arr[i]);
        Mult = Mult / 60;
    }
    return Sum;
}
global.GetSecFromStrTime = GetSecFromStrTime;

global.GetCurrentTime = function (Delta_Time)
{
    if(Delta_Time === undefined)
        Delta_Time = GetDeltaCurrentTime();
    var Time = new Date(Date.now() + Delta_Time);
    
    return Time;
}

function formatDate(now)
{
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var date = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    return year + "-" + String(month).padStart(2, "0") + "-" + String(date).padStart(2, "0") + "  " + String(hour).padStart(2,
    "0") + ":" + String(minute).padStart(2, "0") + ":" + String(second).padStart(2, "0");
}

function DateFromBlock(BlockNum)
{
    var Str;
    if(global.FIRST_TIME_BLOCK)
    {
        var now;
        if(BlockNum >= global.UPDATE_CODE_JINN)
            now = new Date(global.FIRST_TIME_BLOCK + BlockNum * global.CONSENSUS_PERIOD_TIME);
        else
            now = new Date(global.FIRST_TIME_BLOCK + BlockNum * 1000 + global.UPDATE_CODE_JINN * 2000);
        
        Str = formatDate(now);
    }
    else
    {
        Str = "";
    }
    return Str;
}

global.DateFromBlock = DateFromBlock;
global.formatDate = formatDate;

var code_base = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\ufffd\u2122\u0459\u203a\u045a\u045c\u045b\u045f\xa0\u040e\u045e\u0408\xa4\u0490\xa6\xa7\u0401\xa9\u0404\xab\xac\xad\xae\u0407\xb0\xb1\u0406\u0456\u0491\xb5\xb6\xb7\u0451\u2116\u0454\xbb\u0458\u0405\u0455\u0457\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f';
global.NormalizeName = function (Name)
{
    var Str = "";
    for(var i = 0; i < Name.length; i++)
    {
        var code = Name.charCodeAt(i);
        if(code >= 32)
            Str += code_base.charAt(code - 32);
    }
    return Str;
}

var glEvalMap = {};
function CreateEval(formula,StrParams)
{
    var Ret = glEvalMap[formula];
    if(!Ret)
    {
        eval("function M(" + StrParams + "){return " + formula + "}; Ret=M;");
        glEvalMap[formula] = Ret;
    }
    return Ret;
}
global.CreateEval = CreateEval;

var CPU_Count = os.cpus().length;
function GetCountMiningCPU0()
{
    
    if( + global.COUNT_MINING_CPU)
        return global.COUNT_MINING_CPU;
    else
    {
        return CPU_Count - 1;
    }
}
global.GetCountMiningCPU = GetCountMiningCPU0;

if(global.TEST_MINING)
{
    global.GetCountMiningCPU = function ()
    {
        var CountCPU =  + global.COUNT_MINING_CPU;
        if(!CountCPU)
            CountCPU = 1;
        return CountCPU;
    };
}

var ResConst = LOAD_CONST();

function GetTxSize(Tx)
{
    var Size = 200;
    if(Tx.Description)
        Size += Tx.Description.length * 2;
    if(Tx.Body)
        Size += Tx.Body.length;
    if(Tx.Params)
        Size += Tx.Params.length;
    return Size;
}
global.GetTxSize = GetTxSize;

function SetBit(Sum,BitNum)
{
    Sum = (Sum >>> 0) | (1 << BitNum);
    return Sum;
}
function ResetBit(Sum,BitNum)
{
    Sum = ((Sum >>> 0) | (1 << BitNum)) ^ (1 << BitNum);
    
    return Sum;
}

function GetBit(Sum,BitNum)
{
    if(!Sum)
        return 0;
    return (Sum >>> 0) & (1 << BitNum);
}

global.SetBit = SetBit;
global.GetBit = GetBit;
global.ResetBit = ResetBit;



WathConstFile();
