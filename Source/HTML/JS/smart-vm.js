/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


"use strict";


//Smart contract code execution environment library

var LOC_ADD_NAME = "$";

const MAX_LENGTH_STRING = 5000;
const $Math = {};
const $JSON = {};
var ListF = {};
var ListF2 = {};
ListF.$Math = $Math;
ListF.$JSON = $JSON;

var TickCounter = 0;
global.SetTickCounter = function (Value)
{
    TickCounter = Value;
};
global.GetTickCounter = function ()
{
    return TickCounter;
};


function DO(Count)
{
    TickCounter -= Count;
    if(TickCounter < 0)
        throw new Error("Stop the execution code. The limit of ticks is over.");
}

var Map404 = Object.assign(Object.create(null), {});
Map404["prototype"] = 100;
Map404["constructor"] = 100;
Map404["__proto__"] = 100;
Map404["__count__"] = 100;
Map404["__noSuchMethod__"] = 100;
Map404["__parent__"] = 100;

function CHK404(Name)
{
    if(Map404[Name])
    {
        throw new Error("Not allow Identifier '" + Name + "'");
    }
    return Name;
}

function CHKL(Str)
{
    if(typeof Str === "string" && Str.length > MAX_LENGTH_STRING)
        throw new Error("Invalid string length:" + Str.length);
    return Str;
}

ListF.DO = DO;
ListF.CHK404 = CHK404;
ListF.CHKL = CHKL;

function GET_ACCOUNT(Obj)
{
    let Data = Obj;
    var GET_PROP = {get Num()
        {
            return Data.Num;
        }, get Currency()
        {
            return Data.Currency;
        }, get PubKey()
        {
            return CopyArr(Data.PubKey);
        }, get PubKeyStr()
        {
            if(RunContext && RunContext.BlockNum >= global.UPDATE_CODE_SHARDING)
            {
                return GetHexFromArr(Data.PubKey);
            }
        }, get Name()
        {
            return Data.Name;
        }, get BlockNumCreate()
        {
            return Data.BlockNumCreate;
        }, get Adviser()
        {
            return Data.Adviser;
        }, get Smart()
        {
            return Data.Smart;
        }, get Value()
        {
            return {SumCOIN:Data.Value.SumCOIN, SumCENT:Data.Value.SumCENT, OperationID:Data.Value.OperationID, Smart:Data.Value.Smart};
        }, };
    
    return GET_PROP;
}
function GET_SMART(Obj)
{
    let Data = Obj;
    var GET_PROP = {get Num()
        {
            return Data.Num;
        }, get Version()
        {
            return Data.Version;
        }, get TokenGenerate()
        {
            return Data.TokenGenerate;
        }, get ISIN()
        {
            return Data.ISIN;
        }, get Zip()
        {
            return Data.Zip;
        }, get BlockNum()
        {
            return Data.BlockNum;
        }, get TrNum()
        {
            return Data.TrNum;
        }, get IconBlockNum()
        {
            return Data.IconBlockNum;
        }, get IconTrNum()
        {
            return Data.IconTrNum;
        }, get ShortName()
        {
            return Data.ShortName;
        }, get Name()
        {
            return Data.Name;
        }, get Description()
        {
            return Data.Description;
        }, get Account()
        {
            return Data.Account;
        }, get AccountLength()
        {
            return Data.AccountLength;
        }, get Owner()
        {
            return Data.Owner;
        }, get Code()
        {
            return Data.Code;
        }, get HTML()
        {
            return Data.HTML;
        }, get Fixed()
        {
            return Data.Fixed;
        }, get CoinName()
        {
            return Data.ShortName;
        }, get CentName()
        {
            return Data.CentName;
        }, };
    return GET_PROP;
}

function InitMathObject()
{
    $Math.abs = function (x)
    {
        DO(6);
        return Math.abs(x);
    };
    $Math.acos = function (x)
    {
        DO(16);
        return Math.acos(x);
    };
    $Math.acosh = function (x)
    {
        DO(9);
        return Math.acosh(x);
    };
    $Math.asin = function (x)
    {
        DO(19);
        return Math.asin(x);
    };
    $Math.asinh = function (x)
    {
        DO(32);
        return Math.asinh(x);
    };
    $Math.atan = function (x)
    {
        DO(13);
        return Math.atan(x);
    };
    $Math.atanh = function (x)
    {
        DO(30);
        return Math.atanh(x);
    };
    $Math.atan2 = function (x)
    {
        DO(15);
        return Math.atan2(x);
    };
    $Math.ceil = function (x)
    {
        DO(6);
        return Math.ceil(x);
    };
    $Math.cbrt = function (x)
    {
        DO(22);
        return Math.cbrt(x);
    };
    $Math.expm1 = function (x)
    {
        DO(18);
        return Math.expm1(x);
    };
    $Math.clz32 = function (x)
    {
        DO(5);
        return Math.clz32(x);
    };
    $Math.cos = function (x)
    {
        DO(12);
        return Math.cos(x);
    };
    $Math.cosh = function (x)
    {
        DO(20);
        return Math.cosh(x);
    };
    $Math.exp = function (x)
    {
        DO(16);
        return Math.exp(x);
    };
    $Math.floor = function (x)
    {
        DO(7);
        return Math.floor(x);
    };
    $Math.fround = function (x)
    {
        DO(6);
        return Math.fround(x);
    };
    $Math.log = function (x)
    {
        DO(10);
        return Math.log(x);
    };
    $Math.log1p = function (x)
    {
        DO(23);
        return Math.log1p(x);
    };
    $Math.log2 = function (x)
    {
        DO(19);
        return Math.log2(x);
    };
    $Math.log10 = function (x)
    {
        DO(16);
        return Math.log10(x);
    };
    $Math.round = function (x)
    {
        DO(7);
        return Math.round(x);
    };
    $Math.sign = function (x)
    {
        DO(5);
        return Math.sign(x);
    };
    $Math.sin = function (x)
    {
        DO(10);
        return Math.sin(x);
    };
    $Math.sinh = function (x)
    {
        DO(24);
        return Math.sinh(x);
    };
    $Math.sqrt = function (x)
    {
        DO(6);
        return Math.sqrt(x);
    };
    $Math.tan = function (x)
    {
        DO(13);
        return Math.tan(x);
    };
    $Math.tanh = function (x)
    {
        DO(24);
        return Math.tanh(x);
    };
    $Math.trunc = function (x)
    {
        DO(6);
        return Math.trunc(x);
    };
    
    $Math.pow = function (x,y)
    {
        
        DO(40);
        return Math.pow(x, y);
    };
    $Math.imul = function (x,y)
    {
        DO(3);
        return Math.imul(x, y);
    };
    
    $Math.hypot = function ()
    {
        
        DO(56);
        return Math.hypot.apply(Math, arguments);
    };
    $Math.max = function ()
    {
        DO(6);
        return Math.max.apply(Math, arguments);
    };
    $Math.min = function ()
    {
        DO(6);
        return Math.min.apply(Math, arguments);
    };
    
    $Math.random = function ()
    {
        
        DO(1);
        return 0;
    };
    
    FreezeObjectChilds($Math);
    Object.freeze($Math);
}

function InitJSONObject()
{
    $JSON.stringify = function (Obj)
    {
        DO(1000);
        var Str = JSON.stringify(Obj);
        if(Str && Str.length > MAX_LENGTH_STRING)
            return "";
        return Str;
    };
    $JSON.parse = function (Str)
    {
        DO(1000);
        return JSON.parse(Str);
    };
    
    FreezeObjectChilds($JSON);
    Object.freeze($JSON);
}

function InitEval()
{
    InitMathObject();
    InitJSONObject();
    FreezeObjectChilds(Array.prototype);
    FreezeObjectChilds(Object.prototype);
    FreezeObjectChilds(String.prototype);
    FreezeObjectChilds(Number.prototype);
    FreezeObjectChilds(Boolean.prototype);
    var Obj = function ()
    {
    };
    Object.freeze(Obj.bind);
    Object.freeze(Obj.apply);
    Object.freeze(Obj.call);
    Object.freeze(Obj.toString);
    Object.freeze(Obj.constructor);
    
    for(var key in ListF)
    {
        Object.freeze(ListF[key]);
        FreezeObjectChilds(ListF[key]);
    }
    for(var key in ListF2)
    {
        Object.freeze(ListF2[key]);
        FreezeObjectChilds(ListF2[key]);
    }

}

function FreezeObjectChilds(Value)
{
    var arr = Object.getOwnPropertyNames(Value);
    for(var name of arr)
    {
        Object.freeze(Value[name]);
    }
}

function InnerChangeObjects()
{
    ClearPrototype(Function.prototype, {"call":1, "apply":1, "bind":1, "name":1});
    ClearPrototype(Array.prototype, {"push":1, "pop":1, "shift":1, "unshift":1, "sort":1, "splice":1, "slice":1, "indexOf":1, "join":1,
        "some":1, "length":1});
    ClearPrototype(Object.prototype, {});
    ClearPrototype(String.prototype, {"length":1, "indexOf":1, "substr":1, "toLowerCase":1, "toUpperCase":1, "charAt":1, "charCodeAt":1,
        "replace":1, "split":1, "trim":1});
    ClearPrototype(Number.prototype, {"toFixed":1, "toPrecision":1});
    ClearPrototype(Boolean.prototype, {});
    
    InitStringObject(String.prototype);
    
    function InitStringObject(Proto)
    {
        let indexOf = Proto.indexOf;
        String.prototype.indexOf = function (x,y)
        {
            return indexOf.call(this, x, y);
        };
        
        let substr = Proto.substr;
        String.prototype.substr = function (x,y)
        {
            return substr.call(this, x, y);
        };
        
        let toLowerCase = Proto.toLowerCase;
        String.prototype.toLowerCase = function ()
        {
            return toLowerCase.call(this);
        };
        let toUpperCase = Proto.toUpperCase;
        String.prototype.toUpperCase = function ()
        {
            return toUpperCase.call(this);
        };
        let charAt = Proto.charAt;
        String.prototype.charAt = function (x)
        {
            return charAt.call(this, x);
        };
        let charCodeAt = Proto.charCodeAt;
        String.prototype.charCodeAt = function (x)
        {
            return charCodeAt.call(this, x);
        };
        
        let replace = Proto.replace;
        String.prototype.replace = function (x,y)
        {
            return replace.call(this, x, y);
        };
        
        let split = Proto.split;
        String.prototype.split = function (x,y)
        {
            return split.call(this, x, y);
        };
        
        let trim = Proto.trim;
        String.prototype.trim = function ()
        {
            return trim.call(this);
        };
    };
    
    function ClearPrototype(Obj,NMap)
    {
        var arr = Object.getOwnPropertyNames(Obj);
        for(var name of arr)
        {
            if(!NMap[name])
                delete Obj[name];
        }
        Obj.constructor = undefined;
        Obj.toString = undefined;
        Obj.toLocaleString = undefined;
        
        arr = Object.getOwnPropertyNames(Obj);
        for(var name of arr)
        {
            Object.freeze(Obj[name]);
        }
    };
}

global.CodeInnerChangeObjects = InnerChangeObjects.toString();

ListF.$SetValue = function (ID,CoinSum)
{
    DO(3000);
    ID = ParseNum(ID);
    
    if(!RunContext.Smart.TokenGenerate)
    {
        throw "The smart-contract is not token generate, access to change values is denied";
    }
    
    var ToData = ACCOUNTS.ReadStateTR(ID);
    if(!ToData)
    {
        throw "Account does not exist.Error id number: " + ID;
    }
    
    if(ToData.Currency !== RunContext.Smart.Num)
    {
        throw "The account currency does not belong to the smart-contract, access to change values is denied";
    }
    
    if(typeof CoinSum === "number")
    {
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    }
    
    CHECKSUM(CoinSum);
    
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    
    ToData.Value.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    ToData.Value.SumCENT = Math.trunc(CoinSum.SumCENT);
    ACCOUNTS.WriteStateTR(ToData, RunContext.BlockNum, RunContext.TrNum);
    
    return true;
}

ListF.$Send = function (ToID,CoinSum,Description,Currency,TokenID)
{
    DO(3000);
    ToID = ParseNum(ToID);
    
    if(typeof CoinSum === "number")
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    
    CHECKSUM(CoinSum);
    
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    
    var ToData = ACCOUNTS.ReadStateTR(ToID);
    if(!ToData)
    {
        throw "Error ToID - the account number does not exist.";
    }
    
    if(GETVERSION(RunContext.BlockNum)<2)
    {
        Currency=0;
        if(RunContext.Account.Currency !== ToData.Currency)
        {
            throw "Different currencies. Accounts: " + RunContext.Account.Num + " and " + ToID;
        }
    }
    
    return ACCOUNTS.SendMoneyTR(RunContext.Block, RunContext.Account.Num, ToID, CoinSum, RunContext.BlockNum, RunContext.TrNum, Description, Description, 1, 1,0,Currency,TokenID);
};

ListF.$Move = function (FromID,ToID,CoinSum,Description,Currency,TokenID)
{
    DO(3000);
    return DoTransfer(FromID,ToID,CoinSum,Description,Currency,TokenID);
};

function DoTransfer(FromID,ToID,CoinSum,Description,Currency,TokenID)
{
    FromID = ParseNum(FromID);
    ToID = ParseNum(ToID);
    
    var FromData = ACCOUNTS.ReadStateTR(FromID);
    if(!FromData)
    {
        throw "Error FromID - the account number: " + FromID + " does not exist.";
    }
    var ToData = ACCOUNTS.ReadStateTR(ToID);
    if(!ToData)
    {
        throw "Error ToID - the account number: " + ToID + " does not exist.";
    }

    if(GETVERSION(RunContext.BlockNum)<2)
    {
        Currency = 0;
        if(FromData.Currency !== ToData.Currency)
        {
            throw "Different currencies. Accounts: " + FromID + " and " + ToID;
        }
    }
    
    if(FromData.Value.Smart !== RunContext.Smart.Num)
    {
        throw "The account: " + FromID + " does not belong to the smart-contract: " + RunContext.Smart.Num + ", access is denied";
    }
    
    if(typeof CoinSum === "number")
    {
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    }
    
    CHECKSUM(CoinSum);
    
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    
    CoinSum.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    CoinSum.SumCENT = Math.trunc(CoinSum.SumCENT);
    
    return ACCOUNTS.SendMoneyTR(RunContext.Block, FromID, ToID, CoinSum, RunContext.BlockNum, RunContext.TrNum, Description, Description,   1, 1, 0, Currency,TokenID);
}

ListF.$Event = function (Description,Mode)
{
    DO(50);


    SMARTS.SendSmartEvent({Description:Description, Smart:RunContext.Smart.Num, Account:RunContext.Account.Num, BlockNum:RunContext.BlockNum, TrNum:RunContext.TrNum});
    
    ToLogTx("Block: " + RunContext.BlockNum + " TxNum:" + RunContext.TrNum + " Event: " + JSON.stringify(Description), 4);


    global.LOG_LEVEL >= 9 && ToLog("Event, TickCounter: " + TickCounter);

    SendUserEvent(Description,Mode, RunContext.Smart.Num, RunContext.BlockNum, RunContext.TrNum);
};

ListF.$ReadAccount = function (ID)
{
    DO(900);
    ID = ParseNum(ID);
    var Account = ACCOUNTS.ReadStateTR(ID);
    if(!Account)
        throw "Error read account Num: " + ID;
    return GET_ACCOUNT(Account);
};


ListF.$ReadSmart = function (ID)
{
    if(RunContext.BlockNum < global.UPDATE_CODE_2)
    {
        throw "Method call not available";
    }
    
    DO(900);
    ID = ParseNum(ID);
    var Smart = SMARTS.ReadSmart(ID);
    if(!Smart)
        throw "Error smart ID: " + ID;
    
    return GET_SMART(Smart);
}

ListF.$ReadState = function (ID)
{
    DO(900);
    ID = ParseNum(ID);
    var Account = ACCOUNTS.ReadStateTR(ID);
    if(!Account)
        throw "Error read state account Num: " + ID;
    
    var Smart;
    if(Account.Value.Smart === RunContext.Smart.Num)
    {
        Smart = RunContext.Smart;
    }
    else
    {
        DO(100);
        var Smart = SMARTS.ReadSmart(Account.Value.Smart);
        if(!Smart)
        {
            throw "Error smart ID: " + Account.Value.Smart;
        }
    }
    
    var Data;
    if(Smart.StateFormat)
        Data = BufLib.GetObjectFromBuffer(Account.Value.Data, Smart.StateFormat, Smart.WorkStruct, 1);
    else
        Data = {};
    
    if(typeof Data === "object")
        Data.Num = ID;
    return Data;
}

ListF.$WriteState = function (Obj,ID)
{
    DO(3000);
    if(ID === undefined)
        ID = Obj.Num;
    ID = ParseNum(ID);
    
    var Account = ACCOUNTS.ReadStateTR(ID);
    if(!Account)
        throw "Error write account Num: " + ID;
    
    var Smart = RunContext.Smart;
    if(Account.Value.Smart !== Smart.Num)
    {
        throw "The account: " + ID + " does not belong to the smart-contract: " + Smart.Num + ", access to change state is denied";
    }
    
    Account.Value.Data = BufLib.GetBufferFromObject(Obj, Smart.StateFormat, 80, Smart.WorkStruct, 1);
    ACCOUNTS.WriteStateTR(Account, RunContext.BlockNum, RunContext.TrNum);
}

ListF.$GetMaxAccount = function ()
{
    DO(20);
    var DBChanges = GET_TR_CHANGES();
    return DBChanges.TRMaxAccount;
}

ListF.$ADD = function (Coin,Value2)
{
    DO(5);
    return ADD(Coin, Value2);
}
ListF.$SUB = function (Coin,Value2)
{
    DO(5);
    return SUB(Coin, Value2);
}

ListF.$ISZERO = function (Coin)
{
    DO(5);
    if(Coin.SumCOIN === 0 && Coin.SumCENT === 0)
        return true;
    else
        return false;
}

ListF.$FLOAT_FROM_COIN = function (Coin)
{
    DO(5);
    return FLOAT_FROM_COIN(Coin);
}
ListF.$COIN_FROM_FLOAT = function (Sum)
{
    DO(20);
    return COIN_FROM_FLOAT(Sum);
}
ListF.$COIN_FROM_STRING = function (Sum)
{
    DO(20);
    return COIN_FROM_STRING(Sum);
}

ListF.$require = function (SmartNum)
{

    DO(2000);
    SmartNum = ParseNum(SmartNum);
    
    var Smart = SMARTS.ReadSmart(SmartNum);
    if(!Smart)
    {
        throw "Smart does not exist. Error id number: " + SmartNum;
    }
    
    var EvalContext = GetSmartEvalContext(Smart);
    
    EvalContext.funclist.SetContext(RunContext.context);

    return EvalContext.publist;
};

ListF.$GetHexFromArr = function (Arr)
{
    DO(20);
    return GetHexFromArr(Arr);
}

ListF.$GetArrFromHex = function (Str)
{
    DO(20);
    return GetArrFromHex(Str);
}

ListF.$sha = function (Str)
{
    DO(1000);
    return shaarr(Str);
}
ListF.$sha256 = function (Str)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method sha256");

    if(RunContext && GETVERSION(RunContext.BlockNum)>=2)
        if(typeof Str!=="string")
            Str=Buffer.from(Str);

    DO(250);
    return sha256(Str);
};
ListF.$sha3 = function (Str)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method sha3");
    
    DO(500);
    return sha3(Str);
};
ListF.$keccak256 = function (Str)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method keccak256");
    
    DO(500);
    return keccak256(Str);
}
ListF.$CheckSign = function (HashArr,SignArr,PubKeyArr)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method CheckSign");
    
    DO(10000);
    return CheckSign(HashArr, SignArr, PubKeyArr);
}
ListF.$ecrecover = function (hash,v,r,s)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method ecrecover");
    
    DO(10000);
    return ecrecover(hash, v, r, s);
}

ListF.$isFinite = function (a)
{
    DO(5);
    return isFinite(a);
}
ListF.$isNaN = function (a)
{
    DO(5);
    return isNaN(a);
}
ListF.$parseFloat = function (a)
{
    DO(10);
    var Num = parseFloat(a);
    if(!Num)
        Num = 0;
    if(isNaN(Num))
        Num = 0;
    return Num;
}

ListF.$parseInt = function (a)
{
    DO(10);
    var Num = parseInt(a);
    if(!Num)
        Num = 0;
    if(isNaN(Num))
        Num = 0;
    return Num;
}
ListF.$parseUint = function (a)
{
    DO(10);
    return ParseNum(a);
}

ListF.$String = function (a)
{
    DO(5);
    return String(a);
}
ListF.$Number = function (a)
{
    DO(5);
    return Number(a);
}
ListF.$Boolean = function (a)
{
    DO(5);
    return Boolean(a);
}

ListF.$SendMessage = function (ShardPath,Confirms,Method,Params,ParamsArr)
{
    
    DO(20000 + RunContext.Iteration * 5000);
    
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method SendMessage");
    
    SHARDS.AddCrossMsg(RunContext.BlockNum, RunContext.TrNum, RunContext.Account.Num, RunContext.Iteration + 1, 1, ShardPath, Confirms,
    Method, Params, ParamsArr);
}

ListF.$ReadValue = function (Key,Format,IDFrom)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method ReadValue");
    
    DO(500);
    var ID;
    var bNewVer=GETVERSION(RunContext.BlockNum)>=2?1:0;
    if(IDFrom && bNewVer)
        ID = +IDFrom;
    else
        ID = RunContext.Smart.Account;

    return ACCOUNTS.ReadValue(ID, Key, Format,!bNewVer);
};

ListF.$WriteValue = function (Key,Value,Format)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method WriteValue");
    DO(2000);
    
    var ID = RunContext.Smart.Account;
    return ACCOUNTS.WriteValue(ID, Key, Value, Format, RunContext.BlockNum);
};

ListF.$RemoveValue = function (Key)
{
    if(!RunContext || RunContext.BlockNum < global.UPDATE_CODE_SHARDING)
        throw new Error("Not yet method RemoveValue");
    
    DO(1000);
    var ID = RunContext.Smart.Account;
    return ACCOUNTS.RemoveValue(ID, Key, RunContext.BlockNum);
};

//------------------------------------------------ new Version 2

//Serialize Lib


ListF2.$GetObjectFromBuffer = function (ValueBuf,Format)
{
    if(!RunContext || GETVERSION(RunContext.BlockNum)<2)
        throw new Error("Not yet method GetObjectFromBuffer");

    DO(100);

    return  SerializeLib.GetObjectFromBuffer(ValueBuf, Format, {});
};

ListF2.$GetBufferFromObject = function (Value,Format)
{
    if(!RunContext || GETVERSION(RunContext.BlockNum)<2)
        throw new Error("Not yet method GetObjectFromBuffer");

    DO(100);

    return SerializeLib.GetBufferFromObject(Value, Format, {})
};

//string

ListF2.$fromCodePoint = function (Value)
{
    DO(10);

    return String.fromCodePoint(Value);
};


//New soft token support(like ERC)


ListF2.$Call = function (Smart,Method,Params,ParamsArr)//, FromID,ToID,Amount,Description,Currency,TokenID)
{
    Smart = Smart >>> 0;

    DO(1000);

    return RunMethod(Smart,Method,Params,ParamsArr,1);
};

ListF2.$MoveCall = function (FromID,ToID,CoinSum,Description,Currency,TokenID,Method,Params,ParamsArr)
{
    if(typeof CoinSum === "number")
        CoinSum = COIN_FROM_FLOAT(CoinSum);

    DO(3000);
    var CoinSumTo=DoTransfer(FromID,ToID,CoinSum,Description,Currency,TokenID);
    if(!CoinSumTo || CoinSumTo.SumCOIN===undefined || CoinSumTo.SumCENT===undefined)
        CoinSumTo=CoinSum;

    var Account = ACCOUNTS.ReadStateTR(ToID);
    var Smart=Account.Value.Smart;
    var PayContext = {FromID:FromID, ToID:ToID, Description:Description, Value:CoinSumTo, Currency:Currency,TokenID:TokenID, SmartMode:1};

    return RunMethod(Smart,Method,Params,ParamsArr,1, PayContext,Account);
};



ListF2.$GetBalance = function (Account,Currency,ID)
{
    Account = Account >>> 0;
    Currency = Currency >>>0;


    DO(1000);

    if(!Currency)
    {
        var Data = ACCOUNTS.ReadStateTR(Account);
        if(!Data)
            throw "Error account Num: " + Account;
        return {SumCOIN:Data.Value.SumCOIN,SumCENT:Data.Value.SumCENT};
    }

    return RunMethod(Currency,"OnGetBalance",Account,ID,0);
};


ListF2.$RegInWallet = function (Account)
{
    Account=Account>>>0;

    var SysCore=SYSCORE.GetInfo(RunContext.BlockNum);

    DO(100);

    var Ret=ACCOUNTS.RegInWallet(RunContext.BlockNum,Account,RunContext.Smart.Num);
    if(Ret)
    {
        DO(900);
        if(Ret===2)
        {
            DoTransfer(RunContext.Smart.Account, 0, SysCore.WalletStorage, "Reg fee");
        }
    }


    return Ret;
};

ListF2.$CreateSmart = function (FromSmart,Params)
{
    FromSmart = FromSmart >>> 0;

    var SysCore = SYSCORE.GetInfo(RunContext.BlockNum);

    DO(5000);

    //move Tera
    ListF.$Move(RunContext.Smart.Account,0,SysCore.NewSmart,"Smart create");

    return SMARTS.CreateSmartByParent(RunContext.Block, RunContext.BlockNum, RunContext.TrNum, FromSmart,Params);


};



function GetParsing(Str)
{
    LexerJS.ParseCode(Str);
    var Code = LexerJS.stream;
    for(var key in LexerJS.FunctionMap)
    {
        Code += ";\nfunclist." + key + "=" + LOC_ADD_NAME + key;
    }
    for(var key in LexerJS.ExternMap)
    {
        var nType = LexerJS.ExternMap[key];
        if(nType === 1)
            Code += ";\npublist." + key + "=" + LOC_ADD_NAME + key;
        else
            if(nType === 2)
                Code += ";\nmessagelist." + key + "=" + LOC_ADD_NAME + key;
    }
    
    Code += "\n\
    var context;\
    funclist.SetContext=function(cont){context=cont;};\
    ";
    return Code;
}

function GetEval(Smart,SmartCode)
{
    if(typeof SmartCode === "string")
        return CreateSmartEvalContext(SmartCode,Smart.Name,Smart.Version);
    else
        return GetSmartEvalContext(Smart);
}

function GetSmartEvalContext(Smart)
{
    var Map = SMARTS.GetSmartMap();
    var EvalContext = Map["EVAL" + Smart.Num];
    
    if(!EvalContext)
    {
        EvalContext = CreateSmartEvalContext(Smart.Code,Smart.Name,Smart.Version);
        Map["EVAL" + Smart.Num] = EvalContext;
    }
    return EvalContext;
}
function CreateSmartEvalContext(Code,Name,Version)
{
    if(!Code)
        Code="";
    //console.log("SMART:",Name,"Code:",Code)

    var CodeLex = GetParsing(Code);
    var EvalContext = {};
    RunSmartEvalContext(CodeLex, EvalContext, global.CodeInnerChangeObjects);
    for(var key in ListF)
    {
        Object.freeze(ListF[key]);

        //проверка - может был переписан встроенный метод
        if(Version<2 || !EvalContext.funclist[key.substr(1)])
            Object.defineProperty(EvalContext, key, {writable:false, value:ListF[key]});
    }

    if(Version>=2)
    for(var key in ListF2)
    {
        Object.freeze(ListF2[key]);
        //проверка - может был переписан встроенный метод
        if(!EvalContext.funclist[key.substr(1)])
            Object.defineProperty(EvalContext, key, {writable:false, value:ListF2[key]});
    }

    for(var key in EvalContext.funclist)
    {
        Object.freeze(EvalContext.funclist[key]);
    }
    for(var key in EvalContext)
    {
        Object.freeze(EvalContext[key]);
    }
    Object.freeze(EvalContext.funclist);
    Object.freeze(EvalContext.publist);
    Object.freeze(EvalContext.messagelist);
    
    return EvalContext;
}
global.CreateSmartEvalContext = CreateSmartEvalContext;

var RunContext = undefined;
function SetRunContext(Set)
{
    RunContext = Set;
}
global.SetRunContext = SetRunContext;
global.RunSmartMethod = RunSmartMethod;

function RunMethod(SmartNum,Method,Params,ParamsArr,nPublic, PayContext,Account)
{
    var Smart = SMARTS.ReadSmart(SmartNum);
    if(!Smart)
        throw new Error("Error not found smart num: "+SmartNum);
    if(Smart.Version<2)
        throw new Error("Error version smart num: "+SmartNum);
    //console.log(Method,"Account:",Smart.Account,"FromNum:",RunContext.context.FromNum);
    if(!PayContext)
        PayContext = {FromID:RunContext.Smart.Account, ToID:Smart.Account, Description:"", Value:{SumCOIN:0, SumCENT:0}, SmartMode:1};
    return RunSmartMethod(RunContext.Block, undefined, Smart, Account, RunContext.BlockNum, RunContext.TrNum, PayContext, Method,Params,ParamsArr,nPublic);
}


function RunSmartMethod(Block,TR,SmartOrSmartID,Account,BlockNum,TrNum,PayContext,MethodName,Params,ParamsArr,nPublic,bMustHave, SmartCode)
{
    bMustHave=bMustHave?1:nPublic;

    var Smart = SmartOrSmartID;
    if(typeof SmartOrSmartID === "number")
    {
        Smart = SMARTS.ReadSmart(SmartOrSmartID);
        if(!Smart)
        {
            if(bMustHave)
                throw "Smart does not exist. Error id number: " + SmartOrSmartID;
            else
                return;
        }
    }
    if(!Account)
    {
        Account = ACCOUNTS.ReadStateTR(Smart.Account);
    }

    //if(PayContext)        console.log("Method:",MethodName,"Account:",Account.Num,"  PayContext:",PayContext,"Smart:",Smart.Num);

    var EvalContext = GetEval(Smart, SmartCode);

    var RunProxy=0;
    if(!EvalContext.funclist[MethodName] || (nPublic === 1 && !EvalContext.publist[MethodName]) || (nPublic === 2 && !EvalContext.messagelist[MethodName]))
    {
        //не нашли, смотрим Proxy
        if(EvalContext.funclist["OnProxy"])
        {
            RunProxy=1;
        }
        else
        {

            if(bMustHave)
                throw "Method '" + MethodName + "' not found in smart contract " + Smart.Num;
            else
                return;
        }
    }
    
    var context = GetSmartContext(Block, BlockNum, PayContext, TR, TrNum, Account, Smart, nPublic);
    
    var LocalRunContext = {Block:Block, Smart:Smart, Account:Account, BlockNum:BlockNum, TrNum:TrNum, Iteration:TR ? TR.Iteration : 0,
        context:context};
    
    if(!LocalRunContext.Iteration)
        LocalRunContext.Iteration = 0;
    var _RunContext = RunContext;
    RunContext = LocalRunContext;
    EvalContext.funclist.SetContext(RunContext.context);
    
    var RetValue;
    try
    {
        if(RunProxy)
            RetValue = EvalContext.funclist.OnProxy(MethodName,Params, ParamsArr, nPublic);
        else
            RetValue = EvalContext.funclist[MethodName](Params, ParamsArr);
    }
    catch(e)
    {
        throw e;
    }
    finally
    {
        RunContext = _RunContext;
        if(Block.BlockNum >= global.UPDATE_CODE_SHARDING && RunContext)
            EvalContext.funclist.SetContext(RunContext.context);
    }
    
    global.LOG_LEVEL >= 10 && ToLog("CALL:" + MethodName + " Least: " + TickCounter);
    
    return RetValue;
}

function GetSmartContext(Block,BlockNum,PayContext,TR,TrNum,Account,Smart,nPublic)
{
    
    var context = {};
    if(BlockNum >= global.UPDATE_CODE_1 && !PayContext)
    {
        PayContext = {FromID:0, ToID:Account.Num, Description:"", Value:{SumCOIN:0, SumCENT:0}};
    }
    
    if(PayContext)
    {
        context.BlockNum = BlockNum;
        context.BlockHash = CopyArr(Block.Hash);
        context.BlockAddrHash = CopyArr(Block.AddrHash);
        
        context.TrNum = TrNum;
        context.Account = GET_ACCOUNT(Account);
        context.Smart = GET_SMART(Smart);
        
        context.FromNum = PayContext.FromID;
        context.ToNum = PayContext.ToID;
        context.Description = PayContext.Description;
        if(PayContext.Value)
            context.Value = {SumCOIN:PayContext.Value.SumCOIN, SumCENT:PayContext.Value.SumCENT};
        
        context.SmartMode = PayContext.SmartMode;

        context.Currency=0;
        context.ID="";
        if(PayContext.Currency)
        {
            context.Currency = +PayContext.Currency;
            if(PayContext.TokenID)
                context.ID=String(PayContext.TokenID);
        }

        // if(context.Account.Currency)
        //     context.Currency=context.Account.Currency;

    }
    
    if(Block.BlockNum === 0)
    {
        context.GetBlockHeader = StaticGetBlockHeader;
        context.GetBlockNumDB = StaticGetBlockNumDB;
        context.GetSmart = StaticGetSmart;
        context.GetMaxAccountNum = StaticGetMaxAccountNum;
    }
    
    if(Block.BlockNum >= global.UPDATE_CODE_SHARDING && nPublic)//(nPublic>=1 && nPublic<=2))
    {
        context.Tx = TR;
        context.SmartMode = TR?0:1;
    }


    return context;
}


var glBlock0;
global.RunStaticSmartMethod = RunStaticSmartMethod;
function RunStaticSmartMethod(AccountNum,MethodName,Params,ParamsArr,nPublic)
{
    if(nPublic==undefined)
        nPublic=1;

    // if(AccountNum===128 && Params==11)
    //     console.log("RunStaticSmartMethod",MethodName,AccountNum,"Params=",Params,nPublic);

    START_BLOCK();
    BEGIN_TRANSACTION();
    
    var Account;
    if(typeof AccountNum==="number")
        Account = ACCOUNTS.ReadStateTR(AccountNum);
    else
        Account = AccountNum;

    if(!Account)
    {
        CLEAR_ALL_TR_BUFFER();
        return {result:0, RetValue:"Error account Num: " + AccountNum};
    }
    
    SetTickCounter(100000);
    
    if(!glBlock0)
        glBlock0 = SERVER.ReadBlockHeaderDB(0);
    
    try
    {
        var BlockNum = GetCurrentBlockNumByTime();
        var RetValue = RunSmartMethod(glBlock0, undefined, Account.Value.Smart, Account, BlockNum, 0, undefined, MethodName, Params,ParamsArr, nPublic);
        return {result:1, RetValue:RetValue};
    }
    catch(e)
    {
        return {result:0, RetValue:"" + e};
    }
    finally
    {
        CLEAR_ALL_TR_BUFFER();
    }
}

function StaticGetBlockHeader(BlockNum)
{
    DO(100);
    return SERVER.ReadBlockHeaderDB(BlockNum);
}
function StaticGetBlockNumDB()
{
    DO(100);
    return SERVER.GetMaxNumBlockDB();
}
function StaticGetSmart(Num)
{
    DO(100);
    var Smart = SMARTS.ReadSmart(Num);
    return GET_SMART(Smart);
}
function StaticGetMaxAccountNum()
{
    DO(100);
    return ACCOUNTS.GetMaxAccount();
}

InitEval();
