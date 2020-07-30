/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


window.CLIENT_VERSION = 20;
var MAX_CLIENT_LOG_SIZE = 64000;

function $(id)
{
    return document.getElementById(id);
}


window.Storage = {};
window.Storage.setItem = function (Key,Value)
{
    if(window.localStorage)
        localStorage.setItem(Key, Value);
}
window.Storage.getItem = function (Key)
{
    if(window.localStorage)
        return localStorage.getItem(Key);
}

var WALLET_KEY_NAME = "WALLET_KEY";
var WALLET_PUB_KEY_NAME = "WALLET_PUB_KEY";
var WALLET_PUB_KEY_MAIN = "WALLET_PUB_KEY_MAIN";

var WALLET_KEY_LOGIN = "WALLET_LOGIN";
var WALLET_KEY_EXIT = "WALLET_EXIT";


window.onstorage = function (event)
{
    if(!window.sessionStorage)
        return;
    
    var Value = event.newValue;
    switch(event.key)
    {
        case WALLET_KEY_LOGIN:
            if(event.newValue)
            {
                SetStatus("Wallet opened");
                var PrivKeyArr = GetArrFromHex(event.newValue);
                sessionStorage[WALLET_KEY_NAME] = event.newValue;
                sessionStorage[WALLET_PUB_KEY_NAME] = GetHexFromArr(SignLib.publicKeyCreate(PrivKeyArr, 1));
            }
            break;
        case WALLET_KEY_EXIT:
            if(event.newValue)
            {
                SetStatus("Wallet closed");
                sessionStorage[WALLET_KEY_NAME] = "";
                sessionStorage[WALLET_PUB_KEY_NAME] = "";
            }
            break;
    }
}

if(!Math.log2)
    Math.log2 = Math.log2 || function (x)
    {
        return Math.log(x) * Math.LOG2E;
    };
if(!window.crypto)
    window.crypto = window.msCrypto;
if(!window.toStaticHTML)
    toStaticHTML = function (Str)
    {
        return Str;
    };
if(!String.prototype.padStart)
{
    window.BrowserIE = 1;
    String.prototype.padStart = function padStart(targetLength,padString)
    {
        targetLength = targetLength >> 0;
        padString = String((typeof padString !== 'undefined' ? padString : ' '));
        if(this.length > targetLength)
        {
            return String(this);
        }
        else
        {
            targetLength = targetLength - this.length;
            if(targetLength > padString.length)
            {
                padString += padString.repeat(targetLength / padString.length);
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}

window.IsLocalClient = function ()
{
    return (window.location.protocol.substr(0, 4) !== "http");
}

var glSession;
var ServerHTTP;
var MainServer;

if(window.nw)
{
    window.Open = function (path,iconname,width,height)
    {
        width = width || 840;
        height = height || 1000;
        var params = {width:width, height:height};
        if(iconname)
            params.icon = "../HTML/PIC/" + iconname + ".png";
        
        window.nw.Window.open(path, params, function (win)
        {
        });
    };
    
    window.GetData = function (Method,ObjPost,Func)
    {
        window.nw.global.RunRPC({path:Method, obj:ObjPost}, Func);
    };
    
    global.RunRPC = function (message,Func)
    {
        if(!ServerHTTP)
            ServerHTTP = require('../core/html-server');
        
        var reply = ServerHTTP.SendData(message);
        if(Func)
        {
            Func(reply);
        }
    };
}
else
{
    global = window;
    
    window.Open = function (path,iconname,width,height)
    {
        if(!window.NWMODE)
        {
            var win = window.open(path);
        }
        else
        {
            width = width || 840;
            height = height || 1000;
            var left = (screen.width - width) / 2;
            var params = "left=" + left + ",top=24,menubar=no,location=no,resizable=yes,scrollbars=no,status=no";
            params += ",width=" + width;
            params += ",height=" + height;
            var win = window.open(path, undefined, params);
        }
    };
    
    window.GetData = function (Method,ObjPost,Func)
    {
        
        if(Method.substr(0, 4) !== "http")
        {
            
            if(Method.substr(0, 1) !== "/")
                Method = "/" + Method;
            
            if(MainServer)
            {
                Method = GetProtocolServerPath(MainServer) + Method;
            }
            else
            {
                if(IsLocalClient())
                    return;
            }
        }
        
        var StrPost;
        var serv = new XMLHttpRequest();
        if(ObjPost !== undefined)
        {
            StrPost = JSON.stringify(ObjPost);
            serv.open("POST", Method, true);
            CheckTokenHash(serv);
        }
        else
        {
            if(!Func)
            {
                serv.open("GET", Method, 0);
                CheckTokenHash(serv);
                
                serv.send();
                if(serv.status != 200)
                {
                    ToLog("ERROR:\n" + serv.status + ': ' + serv.statusText);
                    return "";
                }
                else
                {
                    return serv.responseText;
                }
            }
            
            var STACK = "" + new Error().stack;
            console.log(STACK);
            throw "ERROR GET-TYPE";
        }
        
        var STACK = "" + new Error().stack;
        serv.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        serv.onreadystatechange = function ()
        {
            if(serv.readyState == 4)
            {
                if(serv.status == 200)
                {
                    if(Func)
                    {
                        var Data;
                        try
                        {
                            Data = JSON.parse(serv.responseText);
                        }
                        catch(e)
                        {
                            console.log("Error parsing: " + e);
                            if(serv.responseText)
                                console.log(serv.responseText.substr(0, 200));
                            console.log(STACK);
                        }
                        Func(Data, serv.responseText);
                    }
                }
                else
                    if(serv.status == 203)
                    {
                        window.location = "/password.html";
                    }
                    else
                    {
                        if(Func)
                            Func(undefined, undefined);
                    }
            }
        };
        
        serv.send(StrPost);
    };
}

function CheckTokenHash(serv)
{
    var TokenHash = sessionStorage["TOKEN-HASH"];
    if(TokenHash)
        serv.setRequestHeader("tokenhash", TokenHash);
}

function IsIPAddres(Str)
{
    var arr = Str.split(".");
    if(arr.length !== 4)
        return 0;
    for(var i = 0; i < arr.length; i++)
        if(arr[i] !== "" + ParseNum(arr[i]))
            return 0;
    return 1;
}
function GetProtocolServerPath(Item)
{
    if(Item.port === 443)
        return "https://" + Item.ip;
    else
        if(Item.port === 80)
            return "http://" + Item.ip;
        else
            return "http://" + Item.ip + ":" + Item.port;
}

function ToFixed(Sum,Currency,bNoZero)
{
    var Fixed = GetCurrencyFixed(Currency);
    var Str = Sum.toFixed(Fixed);
    if(bNoZero || Sum >= 1)
    {
        var Index = Str.indexOf(".");
        if(Index > 0)
        {
            for(var i = Str.length - 1; i >= Index; i--)
            {
                var c = Str.substr(i, 1);
                if(c !== "0")
                {
                    if(c === ".")
                        Str = Str.substr(0, i);
                    break;
                }
                Str = Str.substr(0, i);
            }
        }
    }
    return Str;
}

function SUM_TO_STRING(Value,Currency,bFloat,bLocal)
{
    if(Value.SumCOIN >= 1e12)
        return "UNIT:" + Value.SumCOIN;
    
    var Str;
    if(Value.SumCOIN || Value.SumCENT)
    {
        if(bFloat)
        {
            Str = ToFixed(FLOAT_FROM_COIN(Value), Currency);
        }
        else
        {
            var SumCOIN = Value.SumCOIN;
            if(bLocal)
                SumCOIN = SumCOIN.toLocaleString();
            Str = "" + SumCOIN + "." + Rigth("000000000" + Value.SumCENT, 9);
        }
    }
    else
        Str = "";
    
    if(Currency !== undefined)
    {
        if(Str === "")
            Str = "0";
        
        Str += " " + CurrencyName(Currency);
    }
    return Str;
}


function GetArrFromHex(Str)
{
    var array = [];
    for(var i = 0; Str && i < Str.length / 2; i++)
    {
        array[i] = parseInt(Str.substr(i * 2, 2), 16);
    }
    return array;
}

var HexStr = "0123456789ABCDEF";
function GetHexFromArr(arr)
{
    if(arr && !(arr instanceof Array) && arr.data)
        arr = arr.data;
    
    var Str = "";
    if(arr)
    {
        for(var i = 0; i < arr.length; i++)
        {
            if(!arr[i])
                Str += "00";
            else
            {
                var Val = arr[i] & 255;
                var Index1 = (Val >> 4) % 16;
                var Index2 = (Val) % 16;
                Str += HexStr.substr(Index1, 1);
                Str += HexStr.substr(Index2, 1);
            }
        }
    }
    return Str;
}

function GetStrFromAddr(arr)
{
    return GetHexFromArr(arr);
}

function GetHexFromArrBlock(Arr,LenBlock)
{
    var Str = "";
    var Arr2 = [];
    for(var i = 0; i < Arr.length; i++)
    {
        Arr2[i % LenBlock] = Arr[i];
        if(Arr2.length >= LenBlock)
        {
            Str += GetHexFromArr(Arr2) + "\n";
            Arr2 = [];
        }
    }
    if(Arr2.length)
    {
        Str += GetHexFromArr(Arr2);
    }
    
    return Str;
}

function Rigth(Str,Count)
{
    if(Str.length < Count)
        return Str;
    else
        return Str.substr(Str.length - Count);
}

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
    var len2 = arr2.length;
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
function ParseNum(Str)
{
    var Res = parseInt(Str);
    if(isNaN(Res))
        Res = 0;
    if(!Res)
        Res = 0;
    if(Res < 0)
        Res = 0;
    return Res;
}
function parseUint(Str)
{
    var Res = parseInt(Str);
    if(isNaN(Res))
        Res = 0;
    if(!Res)
        Res = 0;
    if(Res < 0)
        Res = 0;
    return Res;
}

function CopyObjKeys(dest,src)
{
    for(var key in src)
    {
        dest[key] = src[key];
    }
    return dest;
}

function SaveToArr(Arr,Obj)
{
    for(var key in Obj)
    {
        Arr[0]++;
        var Value = Obj[key];
        switch(typeof Value)
        {
            case "number":
                WriteByte(Arr, 241);
                WriteUint(Arr, Value);
                break;
            case "string":
                WriteByte(Arr, 242);
                WriteStr(Arr, Value);
                break;
            case "object":
                if(Value && (Value.length > 0 || Value.length === 0) && Value.length <= 240)
                {
                    WriteByte(Arr, Value.length);
                    WriteArr(Arr, Value, Value.length);
                    break;
                }
            default:
                WriteByte(Arr, 250);
        }
    }
}
function LoadFromArr(Arr,Obj)
{
    if(!Arr.length)
        return false;
    
    var Count = Arr[0];
    Arr.len = 1;
    for(var key in Obj)
    {
        if(!Count)
            break;
        Count--;
        
        var Type = Arr[Arr.len];
        Arr.len++;
        switch(Type)
        {
            case 241:
                Obj[key] = ReadUintFromArr(Arr);
                
                break;
            case 242:
                Obj[key] = ReadStr(Arr);
                break;
            default:
                if(Type <= 240)
                {
                    var length = Type;
                    Obj[key] = ReadArr(Arr, length);
                    break;
                }
                else
                {
                    Obj[key] = undefined;
                }
        }
    }
    if(Arr[0])
        return true;
    else
        return false;
}

var entityMap = {"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':'&quot;', "'":'&#39;', "/":'&#x2F;', "\n":'<BR>', " ":'&nbsp;', };
function escapeHtml(string)
{
    string = String(string);
    
    string = string.replace(/\\n/g, "\n");
    string = string.replace(/\\"/g, "\"");
    
    return string.replace(/[\s\n&<>"'\/]/g, function (s)
    {
        return entityMap[s];
    });
}

function InsertAfter(elem,refElem)
{
    var parent = refElem.parentNode;
    var next = refElem.nextSibling;
    if(next)
    {
        return parent.insertBefore(elem, next);
    }
    else
    {
        return parent.appendChild(elem);
    }
}
function MoveUp(elem)
{
    var parent = elem.parentNode;
    for(var i = 0; i < parent.children.length; i++)
    {
        var item = parent.children[i];
        if(item.id && item.id !== undefined)
        {
            return parent.insertBefore(elem, item);
        }
    }
}

function ViewGrid(APIName,Params,nameid,bClear,TotalSum)
{
    GetData(APIName, Params, function (Data)
    {
        if(!Data || !Data.result)
            return;
        SetGridData(Data.arr, nameid, TotalSum, bClear);
    });
}

function CheckNewSearch(Def)
{
    var Str = $(Def.FilterName).value;
    if(Str)
    {
        $(Def.NumName).value = "0";
    }
}

function ViewCurrent(Def,flag,This)
{
    if(Def.BlockName)
    {
        var element = $(Def.BlockName);
        if(flag)
        {
            var bVisible = IsVisibleBlock(Def.BlockName);
            if(!bVisible)
                MoveUp(element);
            SetVisibleBlock(Def.BlockName, !bVisible);
        }
        else
        {
            SetVisibleBlock(Def.BlockName, true);
        }
        var ResVisible = IsVisibleBlock(Def.BlockName);
        if(This && This.className)
        {
            This.className = This.className.replace("btpress", "");
            if(ResVisible)
                This.className += " btpress";
        }
        
        if(!ResVisible)
            return;
    }
    
    var item = $(Def.NumName);
    var Filter = "", Filter2 = "";
    if(Def.FilterName)
    {
        Filter = $(Def.FilterName).value;
    }
    if(Def.FilterName2)
    {
        Filter2 = $(Def.FilterName2).value;
    }
    if(!Def.Param3)
        Def.Param3 = "";
    
    ViewGrid(Def.APIName, {StartNum:ParseNum(item.value), CountNum:GetCountViewRows(Def), Param3:Def.Param3, Filter:Filter, Filter2:Filter2,
    }, Def.TabName, 1, Def.TotalSum);
    SaveValues();
    
    if(This)
        SetImg(This, Def.BlockName);
}

function ViewPrev(Def)
{
    var item = document.getElementById(Def.NumName);
    var Num = ParseNum(item.value);
    Num -= GetCountViewRows(Def);
    if(Num < 0)
        Num = 0;
    item.value = Num;
    
    ViewCurrent(Def);
}
function ViewNext(Def,MaxNum)
{
    var item = document.getElementById(Def.NumName);
    var Num = ParseNum(item.value);
    Num += GetCountViewRows(Def);
    
    if(Def.FilterName)
    {
        if(document.getElementById(Def.FilterName).value)
        {
            Num = document.getElementById(Def.TabName).MaxNum + 1;
        }
    }
    
    if(Num < MaxNum)
    {
        item.value = Num;
    }
    else
    {
        item.value = MaxNum - MaxNum % GetCountViewRows(Def);
    }
    ViewCurrent(Def);
}
function ViewBegin(Def)
{
    document.getElementById(Def.NumName).value = 0;
    ViewCurrent(Def);
}
function ViewEnd(Def,MaxNum,bInitOnly)
{
    document.getElementById(Def.NumName).value = MaxNum - MaxNum % GetCountViewRows(Def);
    if(bInitOnly)
        return;
    ViewCurrent(Def);
}
function GetCountViewRows(Def)
{
    if(Def.CountViewRows)
        return Def.CountViewRows;
    else
        return CountViewRows;
}

function DoStableScroll()
{
    var item = $("idStableScroll");
    if(!item)
        return;
    
    var scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight,
    document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight);
    
    var itemlHeight = Math.max(item.scrollHeight, item.offsetHeight, item.clientHeight);
    scrollHeight = scrollHeight - itemlHeight;
    item.style.top = "" + scrollHeight + "px";
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

var glWorkNum = 0;
var CUR_ROW;
function SetGridData(arr,id_name,TotalSum,bclear,revert)
{
    
    var htmlTable = document.getElementById(id_name);
    if(!htmlTable)
    {
        console.log("Error id_name: " + id_name);
        return;
    }
    
    if(bclear)
        ClearTable(htmlTable);
    
    if(!htmlTable.ItemsMap)
    {
        htmlTable.ItemsMap = {};
        htmlTable.RowCount = 0;
    }
    
    var map = htmlTable.ItemsMap;
    
    glWorkNum++;
    var ValueTotal = {SumCOIN:0, SumCENT:0};
    
    var row0 = htmlTable.rows[0];
    var row0cells = row0.cells;
    var colcount = row0cells.length;
    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        var ID = Item.Num;
        htmlTable.MaxNum = Item.Num;
        
        var row = map[ID];
        if(!row)
        {
            htmlTable.RowCount++;
            if(revert)
                row = htmlTable.insertRow(1);
            else
                row = htmlTable.insertRow( - 1);
            map[ID] = row;
            for(var n = 0; n < colcount; n++)
            {
                var cell0 = row0cells[n];
                if(cell0.innerText == "")
                    continue;
                
                cell0.F = CreateEval(cell0.id, "Item");
                if(cell0.id.substr(0, 1) === "(")
                    cell0.H = 1;
                
                var cell = row.insertCell(n);
                cell.className = cell0.className;
            }
        }
        row.Work = glWorkNum;
        CUR_ROW = row;
        for(var n = 0; n < colcount; n++)
        {
            var cell = row.cells[n];
            if(!cell)
                continue;
            
            var cell0 = row0cells[n];
            
            if(cell0.H)
            {
                var text = "" + cell0.F(Item);
                text = toStaticHTML(text.trim());
                if(cell.innerHTML !== text)
                    cell.innerHTML = text;
            }
            else
            {
                var text = "" + cell0.F(Item);
                text.trim();
                if(cell.innerText !== text)
                    cell.innerText = text;
            }
        }
        
        if(TotalSum && Item.Currency === 0)
            ADD(ValueTotal, Item.Value);
    }
    for(var key in map)
    {
        var row = map[key];
        if(row.Work !== glWorkNum)
        {
            htmlTable.deleteRow(row.rowIndex);
            delete map[key];
        }
    }
    if(TotalSum)
    {
        var id = document.getElementById(TotalSum);
        if(id)
        {
            if(!ISZERO(ValueTotal))
                id.innerText = "Total on page: " + SUM_TO_STRING(ValueTotal, 0, 0, 1);
            else
                id.innerText = "";
        }
    }
    
    DoStableScroll();
}

function ClearTable(htmlTable)
{
    for(var i = htmlTable.rows.length - 1; i > 0; i--)
        htmlTable.deleteRow(i);
    htmlTable.ItemsMap = {};
    htmlTable.RowCount = 0;
}

function RetOpenBlock(BlockNum,bTrDataLen)
{
    if(BlockNum && bTrDataLen)
    {
        if(bTrDataLen ===  - 1)
        {
            return '<a target="_blank" onclick="ViewTransaction(' + BlockNum + ')">' + BlockNum + '</a>';
        }
        else
        {
            return '<button onclick="ViewTransaction(' + BlockNum + ')" class="openblock">' + BlockNum + '</button>';
        }
    }
    else
        return '<B>' + BlockNum + '</B>';
}
function PrevValueToString(Item)
{
    if(Item.Mode === 200 && Item.HashData)
    {
        var Str = "Acc:<BR>" + GetHexFromArr(Item.HashData.AccHash) + "<BR>";
        
        if(Item.HashData.ErrorSumHash)
            Str += "<span class='red'>";
        Str += "Sum:<BR>" + GetHexFromArr(Item.HashData.SumHash);
        if(Item.HashData.ErrorSumHash)
            Str += "</span>";
        
        return Str;
    }
    else
    {
        return SUM_TO_STRING(Item.PrevValue);
    }
}
function RetBool(Value)
{
    if(Value)
        return "✔";
    else
        return "";
}

function RetNumDapp(Item)
{
    return Item.Num;
}

function RetIconPath(Item,bCurrency)
{
    if(bCurrency && MapCurrencyIcon[Item.Num])
    {
        return MapCurrencyIcon[Item.Num];
    }
    
    var StrPath = "";
    if(MainServer)
    {
        StrPath = GetProtocolServerPath(MainServer);
    }
    
    if(Item.IconBlockNum)
    {
        return StrPath + '/file/' + Item.IconBlockNum + '/' + Item.IconTrNum;
    }
    else
        return StrPath + "/PIC/blank.svg";
}

function RetIconDapp(Item)
{
    if(Item.IconBlockNum)
    {
        return '<img src="' + RetIconPath(Item, 0) + '" style="vertical-align:middle; max-width: 32px;"> ';
    }
    else
        return "";
}
function RetOpenDapps(Item,bNum,AccountNum)
{
    var Name = escapeHtml(Item.Name);
    if(bNum)
        Name = "" + Item.Num + "." + Name;
    
    if(Item.HTMLLength > 0)
    {
        var StrText = RetIconDapp(Item) + Name;
        return '<button type="button" class="bt_open_dapp" style="margin: -2px 0 0 0" onclick="OpenDapps(' + Item.Num + ',' + AccountNum + ',1)">' + StrText + '</button>';
    }
    else
        return RetIconDapp(Item) + Name;
}

function RetDirect(Value)
{
    if(Value === "-")
    {
        return "<B style='color:#EE1A1A'>-</B>";
    }
    else
        if(Value === "+")
        {
            return "<B style='color:#2AD300;'>+</B>";
        }
        else
            return "";
}

function RetCategory(Item)
{
    var Str = "";
    var Num = 0;
    if(Item.Category1 && MapCategory[Item.Category1])
    {
        Num++;
        Str += "" + Num + "." + MapCategory[Item.Category1] + "<BR>";
    }
    if(Item.Category2 && MapCategory[Item.Category2])
    {
        Num++;
        Str += "" + Num + "." + MapCategory[Item.Category2] + "<BR>";
    }
    if(Item.Category3 && MapCategory[Item.Category3])
    {
        Num++;
        Str += "" + Num + "." + MapCategory[Item.Category3] + "<BR>";
    }
    Str = Str.substr(0, Str.length - 4);
    return Str;
}

function RetChangeSmart(Item)
{
    var Name = "";
    var State = "";
    var bOpen = 0;
    if(Item.SmartObj)
    {
        
        if(Item.SmartObj.HTMLLength)
        {
            Name = RetOpenDapps(Item.SmartObj, 1, Item.Num);
            bOpen = 1;
        }
        else
            Name = "" + Item.SmartObj.Num + "." + escapeHtml(Item.SmartObj.Name) + "<BR>";
        
        if(window.DEBUG_WALLET)
            State = "<BR>State:" + JSON.stringify(Item.SmartState);
    }
    
    var Height = 20;
    if(bOpen)
        Height = 40;
    return '<DIV style="width: 204px;">' + Name + '<button onclick="ChangeSmart(' + Item.Num + ',' + Item.Value.Smart + ')" class="setsmart" style="height: ' + Height + 'px;min-height: ' + Height + 'px;">Set</button>' + State + '</DIV>';
}

function RetHistoryAccount(Item,Name)
{
    var Num;
    if(Name)
        Num = Item[Name];
    else
        Num = Item.Num;
    if(Num < 1)
        return "" + Num;
    
    var Str;
    if(UseInnerPage() || window.NWMODE)
        Str = "<a class='olink' target='_blank' onclick='OpenHistoryPage(" + Num + ")'>" + Num + "</a>";
    else
        Str = "<a class='olink' target='_blank' href='./history.html#" + Num + "'>" + Num + "</a>";
    
    return Str;
}
function OpenHistoryPage(Num)
{
    OpenWindow("./history.html#" + Num, 'history', 800, 800);
}

function RetBaseAccount(Item)
{
    var Str = RetHistoryAccount(Item, "Account");
    if(Item.AccountLength > 1)
        Str += "-" + (Item.Account + Item.AccountLength - 1);
    return Str;
}

function ViewTransaction(BlockNum)
{
    if(UseInnerPage() || window.NWMODE)
        OpenBlockViewerPage(BlockNum);
    else
        window.Open('./blockviewer.html#' + BlockNum, 'viewer', 800, 800);
}
function OpenBlockViewerPage(BlockNum)
{
    window.Open('./blockviewer.html#' + BlockNum, 'viewer', 800, 800);
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
    if(!window.CONSENSUS_PERIOD_TIME)
        window.CONSENSUS_PERIOD_TIME = 1000;
    if(window.UPDATE_CODE_JINN === undefined)
        window.UPDATE_CODE_JINN = 0;
    
    var Str;
    if(window.FIRST_TIME_BLOCK)
    {
        var now;
        if(BlockNum >= window.UPDATE_CODE_JINN)
            now = new Date(window.FIRST_TIME_BLOCK + BlockNum * window.CONSENSUS_PERIOD_TIME);
        else
            now = new Date(window.FIRST_TIME_BLOCK + BlockNum * 1000 + window.UPDATE_CODE_JINN * 2000);
        
        Str = formatDate(now);
    }
    else
    {
        Str = "";
    }
    return Str;
}

function SetCheckPoint(BlockNum)
{
    if(!BlockNum)
    {
        SetError("Not set BlockNum");
        return;
    }
    GetData("SetCheckPoint", BlockNum, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text, !Data.result);
        }
    });
}

function AddDiagramToArr(Arr,Item)
{
    var DiagramMaxNum = 0;
    for(var i = 0; i < Arr.length; i++)
        if(Arr[i].num && Arr[i].num > DiagramMaxNum)
            DiagramMaxNum = Arr[i].num;
    
    for(var i = 0; i < Arr.length; i++)
    {
        if(Arr[i].name === Item.name)
        {
            Arr.splice(i, 1);
            break;
        }
    }
    
    Item.num = DiagramMaxNum + 1;
    Arr.push(Item);
}

function SetVisibleBlock(name,bSet)
{
    var Item = document.getElementById(name);
    if(!Item)
        return;
    
    if(bSet && typeof bSet === "string")
        Item.style.display = bSet;
    else
        if(bSet)
        {
            Item.style.display = 'block';
            DoStableScroll();
        }
        else
        {
            Item.style.display = 'none';
        }
    return Item;
}

function IsVisibleBlock(name)
{
    var Item = document.getElementById(name);
    if(Item && (Item.style.display === 'block' || Item.style.display === "table-row"))
        return true;
    else
        return false;
}

function SetVisibleClass(Arr,Visible)
{
    if(typeof Arr === "string")
        Arr = [Arr];
    
    for(var i = 0; i < Arr.length; i++)
    {
        var item = document.querySelector(Arr[i]);
        if(!item)
        {
            ToLog("Error class name: " + Arr[i]);
            continue;
        }
        
        if(!Visible)
            item.classList.add("hidden");
        else
            item.classList.remove("hidden");
    }
}
function IsVisibleClass(name)
{
    var List = document.querySelector(name);
    if(List.className.indexOf(" hidden") >= 0)
        return 0;
    else
        return 1;
}

function LoadValuesByArr(Arr,DopStr)
{
    if(!DopStr)
        DopStr = "";
    if(Storage.getItem("VerSave") !== "3")
        return 0;
    
    for(var i = 0; i < Arr.length; i++)
    {
        var name = Arr[i];
        var Item = document.getElementById(name);
        if(!Item)
            continue;
        var name2 = DopStr + name;
        
        var value = Storage.getItem(name2);
        if(value === null)
            continue;
        if(Item.type === "checkbox")
        {
            Item.checked = parseInt(value);
        }
        else
        {
            Item.value = value;
        }
    }
    return 1;
}
function SaveValuesByArr(Arr,DopStr)
{
    if(!DopStr)
        DopStr = "";
    
    Storage.setItem("VerSave", "3");
    for(var i = 0; i < Arr.length; i++)
    {
        var name = Arr[i];
        var name2 = DopStr + name;
        var Item = $(name);
        if(!Item)
            continue;
        if(Item.type === "checkbox")
            window.Storage.setItem(name2, 0 + Item.checked);
        else
            window.Storage.setItem(name2, Item.value);
    }
}


var MapCurrency = {};
MapCurrency[0] = "TERA";
MapCurrency[16] = "BTC";

var bWasCodeSys = 0;
var MapCurrencyCodeSys = {};
var MapCurrencyIcon = {};

MapCurrencyIcon[0] = "./PIC/T.svg";
MapCurrencyIcon[16] = "./PIC/B.svg";

function InitMapCurrency()
{
    if(window.NETWORK_NAME === "TEST-JINN")
    {
        MapCurrency = {};
        MapCurrency[0] = "TERA";
        MapCurrency[9] = "BTC";
        MapCurrency[10] = "USD";
        MapCurrencyIcon[9] = "./PIC/B.svg";
    }
    if(!bWasCodeSys)
        for(var key in MapCurrency)
            MapCurrencyCodeSys[MapCurrency[key]] = ParseNum(key);
    bWasCodeSys = 1;
}

var MapCategory = {};
MapCategory[0] = "-";
MapCategory[1] = "Art & Music";
MapCategory[2] = "Big Data & AI";
MapCategory[3] = "Business";
MapCategory[4] = "Commerce & Advertising";
MapCategory[5] = "Communications";
MapCategory[6] = "Content Management";
MapCategory[7] = "Crowdfunding";
MapCategory[8] = "Data Storage";
MapCategory[9] = "Drugs & Healthcare";
MapCategory[10] = "Education";
MapCategory[11] = "Energy & Utilities";
MapCategory[12] = "Events & Entertainment";
MapCategory[13] = "eСommerce";
MapCategory[14] = "Finance";
MapCategory[15] = "Gambling & Betting";
MapCategory[16] = "Gaming & VR";
MapCategory[17] = "Healthcare";
MapCategory[18] = "Identity & Reputation";
MapCategory[19] = "Industry";
MapCategory[20] = "Infrastructure";
MapCategory[21] = "Investment";
MapCategory[22] = "Live Streaming";
MapCategory[23] = "Machine Learning & AI";
MapCategory[24] = "Marketing";
MapCategory[25] = "Media";
MapCategory[26] = "Mining";
MapCategory[27] = "Payments";
MapCategory[28] = "Platform";
MapCategory[29] = "Provenance & Notary";
MapCategory[30] = "Real Estate";
MapCategory[31] = "Recruitment";
MapCategory[32] = "Service";
MapCategory[33] = "Social Network";
MapCategory[34] = "Social project";
MapCategory[35] = "Supply & Logistics";
MapCategory[36] = "Trading & Investing";
MapCategory[37] = "Transport";
MapCategory[38] = "Travel & Tourisim";

MapCategory[39] = "Bounty";
MapCategory[40] = "Code-library";
MapCategory[41] = "Development";
MapCategory[42] = "Exchanges";

MapCategory[43] = "Security";
MapCategory[44] = "Governance";
MapCategory[45] = "Property";
MapCategory[46] = "Insurance";

function GetTokenName(Num,Name)
{
    if(!Name)
        Name = "Token";
    if(Num === undefined)
        return "---";
    else
        return "" + Num + "." + escapeHtml(Name).toLowerCase();
}

function CurrencyNameItem(Item)
{
    var Name = MapCurrency[Item.Currency];
    if(!Name)
    {
        if(Item.CurrencyObj)
        {
            Name = GetTokenName(Item.Currency, Item.CurrencyObj.ShortName);
        }
        else
            Name = GetTokenName(Item.Currency, "");
        
        MapCurrency[Item.Currency] = Name;
    }
    if(Item.CurrencyObj && Item.CurrencyObj.TokenDescription)
        Name += " : " + escapeHtml(Item.CurrencyObj.TokenDescription);
    
    return Name;
}

function CurrencyName(Num)
{
    var Name = MapCurrency[Num];
    if(!Name)
    {
        GetData("GetDappList", {StartNum:Num, CountNum:1}, function (Data)
        {
            if(Data && Data.result)
            {
                var Smart = Data.arr[0];
                
                Name = GetTokenName(Smart.Num, Smart.ShortName);
                MapCurrency[Smart.Num] = Name;
            }
        });
        
        Name = GetTokenName(Num, "");
    }
    return Name;
}

function FillCurrencyAsync(IdName,StartNum)
{
    InitMapCurrency();
    
    if(!StartNum)
        StartNum = 8;
    FillCurrencyNext(IdName, StartNum);
}

function FillCurrencyNext(IdName,StartNum)
{
    var MaxCountViewRows = 10;
    GetData("DappSmartList", {StartNum:StartNum, CountNum:MaxCountViewRows, TokenGenerate:1}, function (Data)
    {
        if(Data && Data.result && Data.arr)
        {
            var MaxNum = 0;
            for(var i = 0; i < Data.arr.length; i++)
            {
                var Smart = Data.arr[i];
                if(!MapCurrency[Smart.Num])
                {
                    Name = GetTokenName(Smart.Num, Smart.ShortName);
                    MapCurrency[Smart.Num] = Name;
                }
                if(Smart.Num > MaxNum)
                    MaxNum = Smart.Num;
            }
            if(IdName)
            {
                FillDataList(IdName, MapCurrency);
            }
            if(Data.arr.length === MaxCountViewRows && MaxNum)
            {
                FillCurrencyNext(IdName, MaxNum + 1);
            }
        }
    });
}
function FillDataList(IdName,Map)
{
    var dataList = $(IdName);
    if(!dataList)
        return;
    
    dataList.innerHTML = "";
    
    for(var key in Map)
    {
        var name = Map[key];
        var Options = document.createElement('option');
        Options.value = name;
        if(MapCurrencyCodeSys[name] !== undefined)
            Options.label = "system";
        dataList.appendChild(Options);
    }
}
function ValidateCurrency(Element)
{
    var Num = GetCurrencyByName(Element.value);
    var Name = MapCurrency[Num];
    if(Name)
        Element.value = Name;
    else
        Element.value = "";
}
function GetCurrencyByName(Value)
{
    var Value = String(Value).toUpperCase();
    var Num = MapCurrencyCodeSys[Value];
    if(Num !== undefined)
        return Num;
    return parseInt(Value);
}

function FillSelect(IdName,arr,bNatural)
{
    var Select = $(IdName);
    var Value = Select.value;
    var Options = Select.options;
    
    var strJSON = JSON.stringify(arr);
    if(Select.strJSON === strJSON)
        return;
    Select.strJSON = strJSON;
    
    var Value = Select.value;
    
    if(bNatural)
    {
        Options.length = 0;
        for(var key in arr)
        {
            var name;
            if(bNatural === "KEY")
                name = key;
            else
                name = arr[key];
            Options[Options.length] = new Option(name, key);
            if(key == Value)
                Select.value = key;
        }
    }
    else
    {
        Options.length = 0;
        for(var i = 0; i < arr.length; i++)
        {
            var item = arr[i];
            Options[Options.length] = new Option(item.text, item.value);
            if(item.value == Value)
                Select.value = item.value;
        }
        if(!arr.length)
            for(var key in arr)
            {
                var item = arr[key];
                Options[Options.length] = new Option(item.text, item.value);
                if(item.value == Value)
                    Select.value = item.value;
            }
    }
}

function GetArrFromSelect(IdName)
{
    var Select = $(IdName);
    var Options = Select.options;
    var arr = [];
    for(var i = 0; i < Options.length; i++)
    {
        var item = Options[i];
        arr.push({text:item.text, value:item.value});
    }
    return arr;
}

function FillCategory(IdName)
{
    var arr = [];
    for(var key in MapCategory)
    {
        arr.push({sort:MapCategory[key].toUpperCase(), text:MapCategory[key], value:key});
    }
    FillCategoryAndSort(IdName, arr);
}
function FillCategoryAndSort(IdName,arr)
{
    arr.sort(function (a,b)
    {
        if(a.sort < b.sort)
            return  - 1;
        if(a.sort > b.sort)
            return 1;
        return 0;
    });
    FillSelect(IdName, arr);
}

function AddToInvoiceList(Item)
{
    var arr;
    var Str = Storage.getItem("InvoiceList");
    if(Str)
    {
        arr = JSON.parse(Str);
    }
    else
    {
        arr = [];
    }
    
    arr.unshift(Item);
    Storage.setItem("InvoiceList", JSON.stringify(arr));
}

function OpenDapps(Num,AccountNum,HTMLLength)
{
    if(!Num || !HTMLLength)
        return;
    
    var StrPath = '/dapp/' + Num;
    if(IsLocalClient())
    {
        StrPath = "./dapp-frame.html?dapp=" + Num;
    }
    
    if(AccountNum)
        StrPath += '#' + AccountNum;
    OpenWindow(StrPath);
}
function OpenWindow(StrPath,bCheck)
{
    if(bCheck)
    {
        "With thanks to GeekHack Team";
        var c = StrPath.substr(0, 1);
        if(c == "?" && c == "/" && StrPath.substr(0, 4) !== "http")
        {
            SetError("Error link!");
            ToLog("Error path:\n" + StrPath);
            return;
        }
    }
    
    if(isOS())
        window.location = StrPath;
    else
        window.Open(StrPath);
}

function ParseFileName(Str)
{
    var Ret = {BlockNum:0, TrNum:0};
    var index1 = Str.indexOf("file/");
    if(index1)
    {
        var index2 = Str.indexOf("/", index1 + 6);
        Ret.BlockNum = ParseNum(Str.substr(index1 + 5, index2 - index1 - 5));
        Ret.TrNum = ParseNum(Str.substr(index2 + 1));
    }
    
    return Ret;
}


window.MapSendTransaction = {};
function SendTransaction(Body,TR,SumPow,F)
{
    if(Body.length > 12000)
    {
        if(window.SetError)
            SetError("Error length transaction =" + Body.length + " (max size=12000)");
        if(F)
            F(1, TR, Body);
        
        return;
    }
    
    if(window.SetStatus)
        SetStatus("Prepare to sending...");
    
    CreateNonceAndSend(1, 0, 0);
    function CreateNonceAndSend(bCreateNonce,startnonce,NumNext)
    {
        if(!NumNext)
            NumNext = 0;
        var nonce = startnonce;
        if(bCreateNonce)
            nonce = CreateHashBodyPOWInnerMinPower(Body, SumPow, startnonce);
        
        var StrHex = GetHexFromArr(Body);
        
        if(NumNext > 10)
        {
            if(window.SetError)
                SetError("Not sending. Cannt calc pow.");
            return;
        }
        
        GetData("SendTransactionHex", {Hex:StrHex}, function (Data)
        {
            if(Data)
            {
                var key = GetHexFromArr(sha3(Body));
                if(window.SetStatus)
                    SetStatus("Send '" + key.substr(0, 16) + "' result:" + Data.text);
                
                if(Data.text === "Not add")
                {
                    CreateNonceAndSend(1, nonce + 1, NumNext + 1);
                }
                else
                    if(Data.text === "Bad time")
                    {
                        if(window.DELTA_FOR_TIME_TX < 6)
                        {
                            window.DELTA_FOR_TIME_TX++;
                            console.log("New set Delta time: " + window.DELTA_FOR_TIME_TX);
                            CreateNonceAndSend(1, 0, NumNext + 1);
                        }
                    }
                    else
                    {
                        var key = GetHexFromArr(sha3(Body));
                        MapSendTransaction[key] = TR;
                        if(F)
                            F(0, TR, Body);
                    }
            }
            else
            {
                if(window.SetError)
                    SetError("Error Data");
            }
        });
    };
}

var MapSendID = {};
function GetOperationIDFromItem(Item)
{
    if(!Item || !Item.Num)
    {
        if(window.SetError)
            SetError("Error read account From");
        return 0;
    }
    
    var FromNum = Item.Num;
    var OperationID = 0;
    
    var MapItem = MapSendID[FromNum];
    if(!MapItem)
    {
        MapItem = {Date:0};
        MapSendID[FromNum] = MapItem;
    }
    
    var CurTime = Date.now();
    OperationID = MapItem.OperationID;
    if((CurTime - MapItem.Date) > 10 * 1000)
    {
        var BlockNum = GetCurrentBlockNumByTime();
        OperationID = Item.Value.OperationID + BlockNum % 100;
    }
    OperationID = Math.max(Item.Value.OperationID, OperationID);
    
    OperationID++;
    MapItem.OperationID = OperationID;
    MapItem.Date = CurTime;
    
    return OperationID;
}

function SendCallMethod(Account,MethodName,Params,FromNum,FromSmartNum)
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
                if(window.SetError)
                    SetError("Error account number: " + Account);
                return;
            }
            if(Data.Item.Value.Smart !== FromSmartNum)
            {
                if(window.SetError)
                    SetError("Error - The account:" + Account + " does not belong to a smart contract:" + FromSmartNum + " (have: " + Data.Item.Value.Smart + ")");
                return;
            }
            
            GetData("GetAccount", FromNum, function (Data)
            {
                if(!Data || Data.result !== 1 || !Data.Item)
                {
                    if(window.SetError)
                        SetError("Error account number: " + FromNum);
                    return;
                }
                if(Data.Item.Num != FromNum)
                {
                    if(window.SetError)
                        SetError("Error read from account number: " + FromNum + " read data=" + Data.Item.Num);
                    return;
                }
                
                var OperationID = GetOperationIDFromItem(Data.Item);
                
                WriteUint(Body, OperationID);
                Body.push(4);
                Body.length += 9;
                
                SendTrArrayWithSign(Body, FromNum, TR);
            });
        });
    }
    else
    {
        WriteUint(Body, 0);
        Body.push(4);
        Body.length += 9;
        Body.length += 64;
        Body.length += 12;
        SendTransaction(Body, TR);
    }
}

function SendTrArrayWithSign(Body,Account,TR)
{
    if(MainServer || CanClientSign())
    {
        var Sign = GetSignFromArr(Body);
        var Arr = GetArrFromHex(Sign);
        WriteArr(Body, Arr, 64);
        Body.length += 12;
        SendTransaction(Body, TR);
    }
    else
    {
        var StrHex = GetHexFromArr(Body);
        GetData("GetSignFromHEX", {Hex:StrHex, Account:Account}, function (Data)
        {
            if(Data && Data.result)
            {
                var Arr = GetArrFromHex(Data.Sign);
                WriteArr(Body, Arr, 64);
                Body.length += 12;
                SendTransaction(Body, TR);
            }
        });
    }
}

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
    Body.length += 12;
    return Body;
}

function GetArrFromTR(TR)
{
    MaxBlockNum = GetCurrentBlockNumByTime();
    
    var Body = [];
    WriteByte(Body, TR.Type);
    WriteByte(Body, TR.Version);
    WriteUint(Body, TR.OperationSortID);
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
        
        if(MapAccounts && MapAccounts[Item.ID])
            MapAccounts[Item.ID].MustUpdate = MaxBlockNum + 10;
    }
    
    WriteStr(Body, TR.Description);
    WriteUint(Body, TR.OperationID);
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
    if(window.SignLib && !Storage.getItem("BIGWALLET"))
    {
        if(TR.Version === 4)
        {
            var Body = GetArrFromTR(TR);
            TR.Sign = GetArrFromHex(GetSignFromArr(Body, StrPrivKey));
            F(TR);
        }
        else
            if(TR.Version === 3)
            {
                var Arr = [];
                
                var GetCount = 0;
                for(var i = 0; i < TR.To.length; i++)
                {
                    var Item = TR.To[i];
                    
                    GetData("GetAccountList", {StartNum:Item.ID}, function (Data)
                    {
                        if(Data && Data.result === 1 && Data.arr.length)
                        {
                            GetCount++;
                            var DataItem = Data.arr[0];
                            var DataPubArr = DataItem.PubKey.data;
                            for(var j = 0; j < 33; j++)
                                Arr[Arr.length] = DataPubArr[j];
                            
                            if(GetCount === TR.To.length)
                            {
                                var Body = GetArrFromTR(TR);
                                for(var j = 0; j < Body.length; j++)
                                    Arr[Arr.length] = Body[j];
                                TR.Sign = GetArrFromHex(GetSignFromArr(Arr, StrPrivKey));
                                F(TR);
                            }
                        }
                    });
                }
            }
            else
            {
                TR.Sign = "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
                F(TR);
            }
    }
    else
    {
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

function RetJSON(Item)
{
    return JSON.stringify(Item);
}

Number.prototype.toStringF = function ()
{
    var data = String(this).split(/[eE]/);
    if(data.length == 1)
        return data[0];
    
    var z = '', sign = this < 0 ? '-' : '', str = data[0].replace('.', ''), mag = Number(data[1]) + 1;
    
    if(mag < 0)
    {
        z = sign + '0.';
        while(mag++)
            z += '0';
        return z + str.replace(/^\-/, '');
    }
    mag -= str.length;
    while(mag--)
        z += '0';
    return str + z;
}

function CanClientSign()
{
    var StrPrivKey = GetPrivKey();
    if(!IsHexStr(StrPrivKey) || StrPrivKey.length !== 64)
    {
        return 0;
    }
    
    return 1;
}

function random(max)
{
    return Math.floor(Math.random() * max);
}

function ToLog(Str)
{
    console.log(Str);
}

function InitMainServer()
{
    var Str = Storage.getItem("MainServer");
    if(Str && !Storage.getItem("BIGWALLET") && Str.substr(0, 1) === "{")
    {
        MainServer = JSON.parse(Str);
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

var WALLET_PASSWORD;
var KeyPasswordMap = {};

function InitWalletKeyName()
{
    if(!Storage.getItem("WALLET_KEY"))
    {
        Storage.setItem("WALLET_KEY", Storage.getItem("idPrivKey"));
    }
    if(!Storage.getItem("WALLET_PUB_KEY"))
    {
        Storage.setItem("WALLET_PUB_KEY", Storage.getItem("idPubKey"));
    }
}

function OpenWalletKey()
{
    var Key = Storage.getItem(WALLET_KEY_NAME);
    if(Key && Key.substr(0, 1) === "!" && WALLET_PASSWORD)
    {
        Key = Key.substr(1);
        
        var StrKey = WALLET_PASSWORD + "-" + Key;
        var RetKey = KeyPasswordMap[StrKey];
        if(!RetKey)
        {
            var Hash = HashProtect(WALLET_PASSWORD);
            RetKey = GetHexFromArr(XORHash(GetArrFromHex(Key), Hash, 32));
            KeyPasswordMap[StrKey] = RetKey;
        }
    }
    else
    {
        RetKey = Key;
    }
    
    var PubKeyStr;
    if(RetKey && IsHexStr(RetKey) && RetKey.length === 64)
    {
        var PrivKey = GetArrFromHex(RetKey);
        PubKeyStr = GetHexFromArr(SignLib.publicKeyCreate(PrivKey, 1));
    }
    else
    {
        PubKeyStr = "";
    }
    
    if(window.sessionStorage)
    {
        sessionStorage[WALLET_KEY_NAME] = RetKey;
        sessionStorage[WALLET_PUB_KEY_NAME] = PubKeyStr;
    }
    
    if(!WALLET_PASSWORD)
        Storage.setItem(WALLET_PUB_KEY_NAME, PubKeyStr);
    
    return RetKey;
}
function IsLockedWallet()
{
    var Key = Storage.getItem(WALLET_KEY_NAME);
    if(Key && Key.substr(0, 1) === "!")
        return 1;
    else
        return 0;
}
function GetPrivKey()
{
    var Key;
    if(window.sessionStorage)
        Key = sessionStorage[WALLET_KEY_NAME];
    if(!Key)
        Key = Storage.getItem(WALLET_KEY_NAME);
    if(Key && typeof Key === "string" && Key.length >= 64)
        return Key;
    else
        return "";
}
function GetPubKey()
{
    var Key;
    if(window.sessionStorage)
        Key = sessionStorage[WALLET_PUB_KEY_NAME];
    if(!Key)
        Key = Storage.getItem(WALLET_PUB_KEY_NAME);
    if(!Key)
        Key = Storage.getItem(WALLET_PUB_KEY_MAIN);
    
    if(Key && typeof Key === "string" && Key.length >= 66)
        return Key;
    else
        return "";
}

function SetPrivKey(StrPrivKey)
{
    var Key;
    if(WALLET_PASSWORD)
    {
        var Hash = HashProtect(WALLET_PASSWORD);
        var KeyXOR = GetHexFromArr(XORHash(GetArrFromHex(StrPrivKey), Hash, 32));
        Key = "!" + KeyXOR;
    }
    else
    {
        Key = StrPrivKey;
    }
    var PrivKey = GetArrFromHex(StrPrivKey);
    var StrPubKey = GetHexFromArr(SignLib.publicKeyCreate(PrivKey, 1));
    
    Storage.setItem(WALLET_KEY_NAME, Key);
    Storage.setItem(WALLET_PUB_KEY_NAME, StrPubKey);
    Storage.setItem(WALLET_PUB_KEY_MAIN, StrPubKey);
    
    if(window.sessionStorage)
    {
        sessionStorage[WALLET_KEY_NAME] = StrPrivKey;
        sessionStorage[WALLET_PUB_KEY_NAME] = StrPubKey;
    }
}

function SetWalletPassword(Str)
{
    WALLET_PASSWORD = Str;
    if(Storage.getItem("idPrivKey"))
        Storage.setItem("idPrivKey", "");
}

function HashProtect(Str)
{
    var arr = sha3(Str);
    
    for(var i = 0; i < 30000; i++)
    {
        arr = sha3(arr);
    }
    return arr;
}

function XORHash(arr1,arr2,length)
{
    var arr3 = [];
    for(var i = 0; i < length; i++)
    {
        arr3[i] = arr1[i] ^ arr2[i];
    }
    return arr3;
}

function Right(Str,count)
{
    if(Str.length > count)
        return Str.substr(Str.length - count, count);
    else
        return Str.substr(0, Str.length);
}

function UseInnerPage()
{
    if(isMobile() && !IsLocalClient())
        return 1;
    else
        return 0;
}
function isOS()
{
    if(/iPhone|iPad|iPod/i.test(navigator.userAgent))
    {
        return true;
    }
    return false;
}
function isMobile()
{
    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    {
        return true;
    }
    return false;
}

function DoNewSession()
{
    var arr = new Uint8Array(6);
    window.crypto.getRandomValues(arr);
    glSession = GetHexFromArr(arr);
}

function GetStrFromDiagrArr(Arr)
{
    var Arr2 = [];
    for(var i = 0; i < Arr.length; i++)
    {
        var Item = Arr[i];
        if(Item.Extern || Item.Delete)
            continue;
        var obj = {};
        CopyObjKeys(obj, Item);
        if(obj.arr)
            delete obj.arr;
        Arr2.push(obj);
    }
    return JSON.stringify(Arr2);
}

function GetWalletLink()
{
    if(MainServer)
        return "./web-wallet.html#TabAccounts";
    else
        if(Storage.getItem("BIGWALLET"))
            return "/wallet.html#TabAccounts";
        else
            return "/web-wallet.html#TabAccounts";
}

function GetFilePath(Path)
{
    if(Path.substr(0, 5) === "http:" || Path.substr(0, 6) === "https:")
        return Path;
    
    if(window.PROTOCOL_SERVER_PATH && Path.indexOf("file/") >= 0)
    {
        if(Path.substr(0, 1) !== "/")
            Path = "/" + Path;
        Path = window.PROTOCOL_SERVER_PATH + Path;
    }
    
    return Path;
}


var glConfirmF;
var glWasModal = 0;
var TEMP_DISABLED_MAP = {};

function openModal(id)
{
    glWasModal = 1;
    var modal = document.querySelector("#" + id);
    var overlay = document.querySelector("#idOverlay");
    modal.style.display = "block";
    overlay.style.display = "block";
}
function closeModal()
{
    glWasModal = 0;
    var modals = document.querySelectorAll(".ModalDlg");
    var overlay = document.querySelector("#idOverlay");
    modals.forEach(function (item)
    {
        item.style.display = "none";
    });
    overlay.style.display = "none";
}

function DoConfirm(StrTitle,StrText,F,bDirect)
{
    if(typeof StrTitle === "function")
    {
        F = StrTitle;
        StrTitle = "";
        StrText = "Are you sure?";
    }
    else
        if(typeof StrText === "function")
        {
            bDirect = F;
            F = StrText;
            StrText = "";
        }
    
    if(!bDirect && window.openModal && $("idConfirm"))
    {
        $("idConfirmTitle").innerHTML = StrTitle;
        $("idConfirmText").innerHTML = StrText;
        glConfirmF = F;
        openModal("idConfirm");
    }
    else
    {
        F();
    }
}
function OnConfirmOK()
{
    closeModal();
    if(glConfirmF)
    {
        var F = glConfirmF;
        glConfirmF = undefined;
        F();
    }
}

function SetTempDisabled(Id,TimeSec)
{
    if(!TimeSec)
        TimeSec = 8;
    $(Id).disabled = 1;
    TEMP_DISABLED_MAP[Id] = 1;
    setTimeout(function ()
    {
        $(Id).disabled = 0;
        delete TEMP_DISABLED_MAP[Id];
    }, TimeSec * 1000);
}

var LastLogID = 0;
var glSessionID = "";
function CheckSessionID(session)
{
    if(session !== glSessionID)
    {
        glSessionID = session;
        LastLogID = 0;
    }
}
function CanAdItemToLog(Item)
{
    if(Item.id <= LastLogID)
        return 0;
    LastLogID = Item.id;
    return 1;
}

var PrevServerStr = "";
function SetStatusFromServer(Str)
{
    if(!Str)
        return;
    
    if(PrevServerStr.length > MAX_CLIENT_LOG_SIZE)
    {
        var Index = PrevServerStr.indexOf("\n", MAX_CLIENT_LOG_SIZE - 1000);
        if(Index > 0)
            PrevServerStr = PrevServerStr.substr(Index);
    }
    PrevServerStr = PrevServerStr + Str;
    
    SetLogToElement();
}
var WasSetLogToElement = 0;
function SetLogToElement()
{
    var id = $("idServerLog");
    if(document.activeElement === id)
    {
        if(!WasSetLogToElement)
        {
            WasSetLogToElement = 1;
            setTimeout(SetLogToElement, 500);
        }
        return;
    }
    
    WasSetLogToElement = 0;
    id.scrollTop = id.scrollHeight;
    id.value = PrevServerStr;
}

function RunServerCode(Code)
{
    GetData("SendDirectCode", {Code:Code}, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text);
        }
    });
}
