window.MapSendTransaction = {};
var MapSendID = {};
var TxFormatMap;
var ZERO_ARR_32=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
function SendTransactionNew(Body,TR,F,Context,Confirm)
{
    var MaxLength = 12000;
    if(IsFullNode())
    {
        if(Body[0] === 111)
        {
            MaxLength = 16000;
            if(window.CONFIG_DATA && window.CONFIG_DATA.BLOCKCHAIN_VERSION>=2)
                MaxLength = 65100;
        }
        else
            MaxLength = 65100;
    }

    //console.log("Body.length=",Body.length)

    if(MaxLength && Body.length > MaxLength)
    {
        return RetError(F,Context, TR, Body, "Error length transaction = " + Body.length + ". Can max size=" + MaxLength);
    }
    let Type=Body[0];
    var StrHex = GetHexFromArr(Body);
    var Params={Hex:StrHex,Confirm:Confirm};
    var DlgConfirm=0;
    if(!Confirm && (Type===100 || Type===111 || Type===112 ||Type===135 || Type===136) && window.idSending && !IsVisibleBlock("idSending"))
    {
        DlgConfirm=1;

        if(window.CONFIG_DATA && window.CONFIG_DATA.CONSTANTS && !CONFIG_DATA.CONSTANTS.USE_BLOCK_SEND_TX)
            DlgConfirm=undefined;

        if(DlgConfirm)
        {
            openModalForce("idSending");
            setTimeout(closeModalForce,60*1000);
        }
    }

    if(DlgConfirm)
        Params.Confirm=1;

    GetData("SendHexTx", Params, function (Data)
    {
        if(DlgConfirm)
            closeModalForce();

        if(Data)
        {
            var key = GetHexFromArr(sha3(Body));
            if(!Data.result || Data.result < 0)
            {
                return RetError(F,Context, TR, Body, "Error: " + Data.text);
            }
            if(!TR)
                return;
            //console.log("=Data=",Data);
            TR.BlockNum = Data.BlockNum?Data.BlockNum:Data._BlockNum;
            TR.TrNum = Data.TrNum;

            TR.TxID = Data._TxID;
            TR.result=Data.result;
            MapSendTransaction[key] = TR;

            if(Type===100 && window.FindMyAccounts)
                FindMyAccounts();

            //console.log("Data:",Data);
            return RetResult(F,Context, TR, Body, "Send '" + key.substr(0, 12) + "' result:" + Data.text);
        }
        else
        {
            return RetError(F,Context, TR, Body, "SendTransactionNew: Error Data");
        }
    });
}

function GetOperationIDFromItem(Item,CheckErr)
{
    if(!Item || !Item.Num)
    {
        if(CheckErr && window.SetError)
            SetError("Error read account From");
        return 0;
    }

    var FromNum = Item.Num;

    var MapItem = MapSendID[FromNum];
    if(!MapItem)
    {
        MapItem = {Date:0,OperationID:0};
        MapSendID[FromNum] = MapItem;
    }

    var CurTime = Date.now();
    var OperationID = MapItem.OperationID;
    if((CurTime - MapItem.Date) > 10 * 1000)
    {
        var BlockNum = GetCurrentBlockNumByTime();
        OperationID = Item.Value.OperationID + BlockNum % 100;
    }
    OperationID = Math.max(Item.Value.OperationID, OperationID);

    OperationID+=2;//!!!
    MapItem.OperationID = OperationID;
    MapItem.Date = CurTime;

    return OperationID;
}

function SendCallMethod1(Account,MethodName,Params,ParamsArr,FromNum,FromSmartNum,F,Context,Confirm)
{

    var TR = {Type:135};
    var Body = [TR.Type];

    WriteUint(Body, Account);
    WriteStr(Body, MethodName);
    WriteStr(Body, JSON.stringify(Params));
    WriteUint(Body, FromNum);
    if(FromNum)
    {

        GetData("GetAccount", Account, function (Data)
        {
            if(!Data || Data.result !== 1 || !Data.Item)
            {
                return RetError(F,Context, TR, Body, "Error account number: " + Account);
            }
            if(FromSmartNum!==-1 && Data.Item.Value.Smart !== FromSmartNum)
            {
                return RetError(F,Context, TR, Body, "Error - The account:" + Account + " does not belong to a smart contract:" + FromSmartNum + " (have: " + Data.Item.Value.Smart + ")");
            }



            GetData("GetAccount", FromNum, function (Data)
            {
                if(!Data || Data.result !== 1 || !Data.Item)
                {
                    return RetError(F,Context, TR, Body, "Error account number: " + FromNum);
                }
                if(Data.Item.Num != FromNum)
                {
                    return RetError(F,Context, TR, Body, "Error read from account number: " + FromNum + " read data=" + Data.Item.Num);
                }

                var OperationID = GetOperationIDFromItem(Data.Item, 1);

                WriteUint(Body, OperationID);
                Body.push(4);
                WriteTr(Body, ParamsArr);
                for(var i = 0; i < 7; i++)
                    Body.push(0);

                SendTrArrayWithSign(Body, FromNum, TR, F,Context,Confirm);



            });
        });
    }
    else
    {
        WriteUint(Body, random(1000000000));
        Body.push(4);
        WriteTr(Body, ParamsArr);
        for(var i = 0; i < 7; i++)
            Body.push(0);
        Body.length += 64;
        SendTransactionNew(Body, TR, F,Context,Confirm);
    }
}

function SendTrArrayWithSign(Body,Account,TR,F,Context,Confirm)
{
    var MaxLength=65100;
    if(Body.length > MaxLength)
    {
        return RetError(F,Context, TR, Body, "Error length transaction = " + Body.length + ". Can max size=" + MaxLength);
    }

    if(window.SignLib && !IsFullNode())
    {
        if(GetMainServer() || CanClientSign())
        {
            var Sign = GetSignFromArr(Body);
            var Arr = GetArrFromHex(Sign);
            WriteArr(Body, Arr, 64);
            return SendTransactionNew(Body, TR, F,Context,Confirm);
        }
    }

    var StrHex = GetHexFromArr(Body);
    GetData("GetSignFromHEX", {Hex:StrHex, Account:Account}, function (Data)
    {
        if(Data && Data.result)
        {
            var Arr = GetArrFromHex(Data.Sign);
            WriteArr(Body, Arr, 64);

            SendTransactionNew(Body, TR, F,Context,Confirm);
        }
    });
}

//----------------------------------------------------------------------------------------------------------------------


function GetTrCreateAcc(Currency,PubKey,Description,Adviser,Smart)
{
    var TR = {Type:TYPE_TRANSACTION_CREATE, Currency:Currency, PubKey:PubKey, Name:Description, Adviser:Adviser, Smart:Smart, };
    return TR;
}
function GetBodyCreateAcc(TR)
{
    var Body = [];
    WriteByte(Body, TR.Type);
    WriteUint(Body, TR.Currency);
    WriteArr(Body, GetArrFromHex(TR.PubKey), 33);
    WriteStr(Body, TR.Name, 40);
    WriteUint(Body, TR.Adviser);
    WriteUint32(Body, TR.Smart);
    Body.length += 3;
    return Body;
}

function GetArrFromTR(TR)
{
    if(window.MapAccounts)
        MaxBlockNum = GetCurrentBlockNumByTime();

    var Body = [];
    WriteByte(Body, TR.Type);
    WriteByte(Body, TR.Version);
    WriteUint(Body, TR.OperationID);
    WriteUint(Body, TR.FromID);
    WriteUint32(Body, TR.To.length);
    for(var i = 0; i < TR.To.length; i++)
    {
        var Item = TR.To[i];
        if(TR.Version >= 3)
            WriteTr(Body, Item.PubKey);
        WriteUint(Body, Item.ID);
        WriteUint(Body, Item.SumCOIN);
        WriteUint32(Body, Item.SumCENT);

        if(window.MapAccounts && MapAccounts[Item.ID])
            MapAccounts[Item.ID].MustUpdate = MaxBlockNum + 4;
    }

    WriteStr(Body, TR.Description);
    WriteUint(Body, 0);
    if(TR.Version >= 3)
    {
        if(TR.Body)
        {
            WriteTr(Body, TR.Body);
        }
        else
        {
            WriteByte(Body, 0);
            WriteByte(Body, 0);
        }
    }
    return Body;
}

function GetSignTransaction(TR,StrPrivKey,F)
{
    if(window.SignLib && !IsFullNode())
    {
        if(TR.Version === 4)
        {
            var Body = GetArrFromTR(TR);
            TR.Sign = GetArrFromHex(GetSignFromArr(Body, StrPrivKey));
            F(TR);
        }
        else
        {
            TR.Sign = "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
            F(TR);
        }
    }
    else
    {
        if(window.SERVER_VERSION >= 2481 && TR.Version === 4)
        {
            var Body = GetArrFromTR(TR);
            var Hash = GetHexFromArr(SHA3BUF(Body));
            GetData("GetSignFromHash", {Hash:Hash, Account:TR.FromID}, function (Data)
            {
                if(Data && Data.result === 1)
                {
                    TR.Sign = GetArrFromHex(Data.Sign);
                    F(TR);
                }
            });
            return;
        }

        GetData("GetSignTransaction", TR, function (Data)
        {
            if(Data && Data.result === 1)
            {
                TR.Sign = GetArrFromHex(Data.Sign);
                F(TR);
            }
        });
    }
}
function GetSignFromArr(Arr,StrPrivKey)
{
    if(!StrPrivKey)
        StrPrivKey = GetPrivKey();
    if(!IsHexStr(StrPrivKey) || StrPrivKey.length !== 64)
        return "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

    var PrivKey = GetArrFromHex(StrPrivKey);
    var sigObj = SignLib.sign(SHA3BUF(Arr), Buffer.from(PrivKey), null, null);
    return GetHexFromArr(sigObj.signature);
}


//----------------------------------------------------------------------------------------------------------------------

function RetError(F,Context, TR,Body,Str)
{


    if(window.SetError)
        SetError(Str);
    if(F)
        F(1, TR, Body, Str, Context);

    return 0;
}
function RetResult(F,Context,TR,Body,Str)
{
    if(window.SetStatus)
        SetStatus(Str);
    if(F)
        F(0, TR, Body, Str,Context);
    return 1;
}

function IsHexStr(Str)
{
    if(!Str)
        return false;

    var arr = GetArrFromHex(Str);
    var Str2 = GetHexFromArr(arr);
    if(Str2 === Str.toUpperCase())
        return true;
    else
        return false;
}
//----------------------------------------------------------------------------------------------------------------------
function toUTF8Array(str)
{
    var utf8 = [];
    for(var i = 0; i < str.length; i++)
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

function Utf8ArrayToStr(array)
{
    var out = utf8ArrayToStr(array);

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
var utf8ArrayToStr = (function ()
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

function WriteByte(arr,Num)
{
    arr[arr.length] = Num & 0xFF;
}
function WriteUint(arr,Num)
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
function WriteUint16(arr,Num)
{
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
}

function WriteUint32(arr,Num)
{
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
    arr[len + 2] = (Num >>> 16) & 0xFF;
    arr[len + 3] = (Num >>> 24) & 0xFF;
}
function WriteStr(arr,Str,ConstLength)
{
    if(!Str)
        Str = "";
    var arrStr = toUTF8Array(Str);

    var length;
    var len = arr.length;

    if(ConstLength)
    {
        length = ConstLength;
    }
    else
    {
        length = arrStr.length;
        if(length > 65535)
            length = 65535;

        arr[len] = length & 0xFF;
        arr[len + 1] = (length >>> 8) & 0xFF;
        len += 2;
    }

    for(var i = 0; i < length; i++)
    {
        arr[len + i] = arrStr[i];
    }
}

function WriteArr(arr,arr2,ConstLength)
{
    var len = arr.length;
    for(var i = 0; i < ConstLength; i++)
    {
        arr[len + i] = arr2[i];
    }
}

function WriteTr(arr,arr2)
{
    var len2 = arr2 ? arr2.length : 0;
    var len = arr.length;
    arr[len] = len2 & 0xFF;
    arr[len + 1] = (len2 >>> 8) & 0xFF;
    len += 2;

    for(var i = 0; i < len2; i++)
    {
        arr[len + i] = arr2[i];
    }
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

function ReadArr(arr,length)
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
function ReadStr(arr)
{
    var length = arr[arr.len] + arr[arr.len + 1] * 256;
    arr.len += 2;
    var arr2 = arr.slice(arr.len, arr.len + length);
    var Str = Utf8ArrayToStr(arr2);
    arr.len += length;
    return Str;
}


//----------------------------------------------------------------------------------------------------------------------
async function AGetData(Method,Params)
{
    return new Promise(function(resolve, reject)
    {
        GetData(Method, Params,function (Value,Text)
        {
            resolve(Value);
        });
    });
}

async function AGetFormat(Name)
{
    if(!TxFormatMap)
    {
        TxFormatMap=await AGetData("GetFormatTx", {});
    }
    return TxFormatMap[Name];
}

async function SendCallMethod(Account,MethodName,Params,ParamsArr,FromNum,FromSmartNum,F,Context,Confirm,TxTicks)
{
    var TR={};
    TR.Version=4;
    var BVersion=await AGetFormat("BLOCKCHAIN_VERSION");
    var Format=await AGetFormat("FORMAT_SMART_RUN"+(BVersion>=2?"2":"1"));
    TR.Type=await AGetFormat("TYPE_SMART_RUN"+(BVersion>=2?"2":"1"));


    TR.Account=Account;
    TR.OperationID=0;
    TR.MethodName=MethodName;
    TR.Params=JSON.stringify(Params);
    TR.FromNum=FromNum;
    TR.ParamsArr=ParamsArr;
    TR.Reserve=[];
    TR.TxTicks=TxTicks?TxTicks:35000;
    TR.TxMaxBlock=GetCurrentBlockNumByTime()+120;

    if(FromNum)
    {

        var Data=await AGetData("GetAccount", Account);
        if(!Data || Data.result !== 1 || !Data.Item)
            return RetError(F,Context, TR, Body, "Error account number: " + Account);
        if(FromSmartNum!==-1 && Data.Item.Value.Smart !== FromSmartNum)
            return RetError(F,Context, TR, Body, "Error - The account:" + Account + " does not belong to a smart contract:" + FromSmartNum + " (have: " + Data.Item.Value.Smart + ")");



        Data=await AGetData("GetAccount", FromNum);
        if(!Data || Data.result !== 1 || !Data.Item)
            return RetError(F, Context, TR, Body, "Error account number: " + FromNum);
        if(Data.Item.Num != FromNum)
            return RetError(F,Context, TR, Body, "Error read from account number: " + FromNum + " read data=" + Data.Item.Num);

        TR.OperationID = GetOperationIDFromItem(Data.Item, 1);

        var Body=SerializeLib.GetBufferFromObject(TR, Format, {});
        Body.length-=64;

        SendTrArrayWithSign(Body, FromNum, TR, F,Context,Confirm);
    }
    else
    {
        TR.OperationID=random(1000000000);
        TR.Sign = ZERO_ARR_32;

        var Body=SerializeLib.GetBufferFromObject(TR, Format, {});
        // if(BVersion>=2)//TODO
        //     Body.length-=64;

        SendTransactionNew(Body, TR, F,Context,Confirm);
    }
}

window.SendCallMethod=SendCallMethod;
