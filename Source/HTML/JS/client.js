/*
 * @project: TERA
 * @version: 2
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/



window.CLIENT_VERSION = 69;
window.SERVER_VERSION = 0;
window.SHARD_NAME = "TERA";

window.SUM_PRECISION = 9;

window.RUN_CLIENT = 1;
window.RUN_SERVER = 0;

var glSession;
var ServerHTTP;
var glMainServer;
var MapCategory = {};

var root = typeof global==="object"?global:window;

if(typeof global === 'object')
{
    root.RUN_CLIENT = 1;
    root.RUN_SERVER = 0;
}

var MaxBlockNum = 0;
var MAX_CLIENT_LOG_SIZE = 64000;

function $(id)
{
    return document.getElementById(id);
}
function SetStatus(Str)
{
    console.log(Str);
}
function SetError(Str)
{
    console.log("%c" + Str, "color:red;font-weight:bold;");
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
                if(window.OnOpenWallet)
                    window.OnOpenWallet();
            }
            break;
        case WALLET_KEY_EXIT:
            if(event.newValue)
            {
                SetStatus("Wallet closed");
                sessionStorage[WALLET_KEY_NAME] = "";
                sessionStorage[WALLET_PUB_KEY_NAME] = "";
                if(window.OnCloseWallet)
                    window.OnCloseWallet();
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
        window.nw.root.RunRPC({path:Method, obj:ObjPost}, Func);
    };

    root.RunRPC = function (message,Func)
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
    //global = window;
    
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
            
            if(GetMainServer())
            {
                Method =GetURLPath(Method);
            }
            else
            {
                if(IsLocalClient())
                {
                    //console.log("Local client for "+Method);
                    return;
                }
            }
        }
        
        var serv = new XMLHttpRequest();
        
        if(ObjPost === undefined)
        {
            serv.open("GET", Method, 0);
            CheckTokenHash(serv);
            
            serv.send();
            if(serv.status != 200)
            {
                ToLog("ERROR:\n" + serv.status + ': ' + serv.statusText);
            }
            return serv.responseText;
        }
        var StrPost = JSON.stringify(ObjPost);
        serv.open("POST", Method, true);
        CheckTokenHash(serv);
        
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
                        if(serv.responseText.substr(0, 1) !== "{")
                        {
                            return;
                        }
                        var Data;
                        try
                        {
                            Data = JSON.parse(serv.responseText);
                        }
                        catch(e)
                        {
                            console.log(Method);
                            console.log("Error parsing: " + e);
                            if(serv.responseText)
                                console.log(serv.responseText.substr(0, 200));
                            console.log(STACK);
                        }
                        Func(Data, serv.responseText);
                    }
                }
                else
                    if(serv.status == 203 && IsFullNode())
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
    
    if(typeof window.SUM_PRECISION !== "number")
        window.SUM_PRECISION = 9;
    
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
            var StrCent = Rigth("000000000" + Value.SumCENT, 9);
            Str = "" + SumCOIN + "." + Left(StrCent, window.SUM_PRECISION);
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


//----------------------------------------------------------------------------------------------------------------------
window.GetArrFromHex=function(Str)
{
    var array = [];
    for(var i = 0; Str && i < Str.length / 2; i++)
    {
        array[i] = parseInt(Str.substr(i * 2, 2), 16);
    }
    return array;
}

var HexStr = "0123456789ABCDEF";
window.GetHexFromArr=function(arr)
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
//----------------------------------------------------------------------------------------------------------------------

function GetStrFromAddr(arr)
{
    return GetHexFromArr(arr);
}

function Rigth(Str,Count)
{
    if(Str.length < Count)
        return Str;
    else
        return Str.substr(Str.length - Count);
}
function Left(Str,Count)
{
    return Str.substr(0, Count);
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
function UnVisibleChilds(parent)
{
    for(var i = 0; i < parent.children.length; i++)
    {
        var item = parent.children[i];
        if(item.id && item.id !== undefined)
        {
            SetVisibleBlock(item.id, 0);
        }
    }
}

async function ViewGrid(APIName,Params,nameid,bClear,TotalSum,F)
{
    var Data=await AGetData(APIName, Params);
    if(!Data || !Data.result)
        return;

    await ASetGridData(Data.arr, nameid, TotalSum, bClear,0);
    if(F)
        F(APIName, Params, Data);
}

function CheckNewSearch(Def)
{
    var Str = $(Def.FilterName).value;
    if(Str)
    {
        $(Def.NumName).value = "0";
    }
}

function SetDownImgButton(This,bVisible)
{
    if(This && This.className)
    {
        This.className = This.className.replace("btpress", "");
        if(bVisible)
            This.className += " btpress";
    }
}
function ViewCurrent(Def,flag,This)
{
    return ViewCurrentInner(Def, flag, This);
}

function ViewCurrentInner(Def,flag,This)
{
    if(Def.BlockName)
    {
        var element = $(Def.BlockName);
        if(flag)
        {
            var bVisible = IsVisibleBlock(Def.BlockName);
            UnVisibleChilds(element.parentNode);
            SetVisibleBlock(Def.BlockName, !bVisible);
        }
        else
        {
            SetVisibleBlock(Def.BlockName, true);
        }
        
        var ResVisible = IsVisibleBlock(Def.BlockName);
        SetDownImgButton(This, ResVisible);
        
        if(!ResVisible)
            return;
    }
    
    if(!Def.APIName)
        return;
    
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
    var Params=Def.Params;

    if(!Params)
        Params={};
    Params.StartNum=ParseNum(item.value);
    Params.CountNum=GetCountViewRows(Def);
    Params.Param3=Def.Param3;
    Params.Filter=Filter;
    Params.Filter2=Filter2;
    Params.ChainMode=Def.ChainMode;
    Params.GetState=0;//window.DEBUG_WALLET;

    
    ViewGrid(Def.APIName, Params, Def.TabName, 1, Def.TotalSum, Def.F);
    SaveValues();
    
    if(This)
        SetImg(This, Def.BlockName);
    return 1;
}

function ViewPrev(Def)
{
    var item = $(Def.NumName);
    if(!item)
        return;
    var Num = ParseNum(item.value);
    Num -= GetCountViewRows(Def);
    if(Num < 0)
        Num = 0;
    item.value = Num;
    
    ViewCurrent(Def);
}
function ViewNext(Def,MaxNum)
{
    var item = $(Def.NumName);
    if(!item)
        return;
    MaxNum =  + MaxNum;
    var Num = ParseNum(item.value);
    Num +=  + GetCountViewRows(Def);
    
    if(Def.FilterName)
    {
        if($(Def.FilterName).value)
        {
            Num = $(Def.TabName).MaxNum + 1;
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
    var id = $(Def.NumName);
    if(!id)
        return;
    id.value = 0;
    ViewCurrent(Def);
}
function ViewEnd(Def,MaxNum,bInitOnly)
{
    var id = $(Def.NumName);
    if(!id)
        return;
    
    id.value = MaxNum - MaxNum % GetCountViewRows(Def);
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

function SetGridDataNew(arr,id_name,bClear)
{

    var htmlTable = $(id_name);
    if(!htmlTable)
    {
        console.log("Error id_name: " + id_name);
        return;
    }

    if(bClear)
    {
        CUR_ROW=undefined;
        ClearTable(htmlTable);
    }

    if(!htmlTable.ItemsMap)
    {
        htmlTable.ItemsMap = {};
        htmlTable.RowCount = 0;
    }

    var map = htmlTable.ItemsMap;

    if(!glWorkNum)
        glWorkNum=0;
    glWorkNum++;
    var ValueTotal = {SumCOIN:0, SumCENT:0};

    var row0 = htmlTable.rows[0];
    var row0cells = row0.cells;
    var colcount = row0cells.length;

    if(!htmlTable.ColumnArr)
        htmlTable.ColumnArr = CompileColumnArr(row0.cells);
    var ColumnArr = htmlTable.ColumnArr;

    var PrevItem;
    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        var ID = Item.Num;
        htmlTable.MaxNum = Item.Num;

        var row = map[ID];
        if(!row)
        {
            htmlTable.RowCount++;

            var NewRowIndex;

            var CurRowIndex=1;
            if(CUR_ROW)
                CurRowIndex=CUR_ROW.rowIndex;

            if(!PrevItem && htmlTable.Arr.length>0)
            {
                CurRowIndex=1;
                PrevItem=htmlTable.Arr[0];
            }

            if(CUR_ROW && PrevItem)
            {
                if(PrevItem.ID<Item.ID)
                    NewRowIndex=CurRowIndex;
                else
                    NewRowIndex=CurRowIndex+1;
            }
            else
            {
                NewRowIndex=-1;
            }
            row = htmlTable.insertRow(NewRowIndex);

            map[ID] = row;
            for(var n = 0; n < colcount; n++)
            {
                var ColItem = ColumnArr[n];
                if(!ColItem)
                    continue;
                var cell = row.insertCell();
                cell.className = ColItem.C;
            }
        }

        row.Work = glWorkNum;
        CUR_ROW = row;
        PrevItem=Item;
        //console.log("row",row.rowIndex);

        var n2 =  - 1;
        for(var n = 0; n < colcount; n++)
        {
            var ColItem = ColumnArr[n];
            if(!ColItem)
                continue;
            n2++;
            var cell = row.cells[n2];

            if(ColItem.H)
            {
                var text = "" + ColItem.F(Item);
                text = toStaticHTML(text.trim());
                if(cell.innerHTML !== text)
                    cell.innerHTML = text;
            }
            else
            if(ColItem.F)
            {
                var text = "" + ColItem.F(Item);
                text.trim();
                if(cell.innerText !== text)
                    cell.innerText = text;
            }
        }
    }

    htmlTable.Arr = arr;

    for(var key in map)
    {
        var row = map[key];
        if(row.Work != glWorkNum)
        {
            htmlTable.deleteRow(row.rowIndex);
            delete map[key];
        }
    }
}


function SetGridData(arr,id_name,TotalSum,bclear,revert)
{

    var htmlTable = $(id_name);
    if(!htmlTable)
    {
        console.log("Error id_name: " + id_name);
        return;
    }

    if(bclear)
    {
        ClearTable(htmlTable);
    }

    if(!htmlTable.ItemsMap)
    {
        htmlTable.ItemsMap = {};
        htmlTable.RowCount = 0;
    }

    var WasLength=0;
    if(htmlTable.Arr)
        WasLength=htmlTable.Arr.length;

    var map = htmlTable.ItemsMap;
    htmlTable.Arr = arr;

    if(!glWorkNum)
        glWorkNum=0;
    glWorkNum++;
    var ValueTotal = {SumCOIN:0, SumCENT:0};

    var row0 = htmlTable.rows[0];
    var row0cells = row0.cells;
    var colcount = row0cells.length;

    if(!htmlTable.ColumnArr)
        htmlTable.ColumnArr = CompileColumnArr(row0.cells);
    var ColumnArr = htmlTable.ColumnArr;

    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        var ID = Item.Num;
        htmlTable.MaxNum = Item.Num;

        var row = map[ID];
        if(!row)
        {
            htmlTable.RowCount++;
            if(revert==1 || revert==2 && WasLength>0)
                row = htmlTable.insertRow(1);
            else
                row = htmlTable.insertRow( - 1);
            map[ID] = row;
            for(var n = 0; n < colcount; n++)
            {
                var ColItem = ColumnArr[n];
                if(!ColItem)
                    continue;
                var cell = row.insertCell();
                cell.className = ColItem.C;
            }
        }
        row.Work = glWorkNum;
        CUR_ROW = row;

        var n2 =  - 1;
        for(var n = 0; n < colcount; n++)
        {
            var ColItem = ColumnArr[n];
            if(!ColItem)
                continue;
            n2++;
            var cell = row.cells[n2];

            if(ColItem.H)
            {
                var text = "" + ColItem.F(Item);
                text = toStaticHTML(text.trim());
                if(cell.innerHTML !== text)
                    cell.innerHTML = text;
            }
            else
            if(ColItem.F)
            {
                var text = "" + ColItem.F(Item);
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
        if(row.Work != glWorkNum)
        {
            htmlTable.deleteRow(row.rowIndex);
            delete map[key];
        }
    }
    if(TotalSum)
    {
        var id = $(TotalSum);
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


function CompileColumnArr(row0cells)
{
    var Arr = [];
    for(var n = 0; n < row0cells.length; n++)
    {
        var cell0 = row0cells[n];
        if(cell0.innerText == "")
        {
            Arr.push(null);
        }
        else
        {
            var F = CreateEval(cell0.id, "Item");
            var H = 0;
            if(cell0.id.substr(0, 1) === "(")
                H = 1;
            Arr.push({F:F, H:H, C:cell0.className});
        }
    }
    return Arr;
}

function ClearTable(htmlTable)
{
    for(var i = htmlTable.rows.length - 1; i > 0; i--)
        htmlTable.deleteRow(i);
    htmlTable.ItemsMap = {};
    htmlTable.RowCount = 0;
    htmlTable.Arr=[];
}

function RetRepeatTx(BlockNum,TrNum)
{
    return String(TrNum);
}

function RetOpenBlock(BlockNum,bTrDataLen,Str)
{
    if(!Str)
        Str = BlockNum;
    
    if(BlockNum && bTrDataLen)
    {
        if(bTrDataLen ===  - 1)
        {
            return '<a target="_blank" onclick="ViewTransaction(' + BlockNum + ')">' + Str + '</a>';
        }
        else
        {
            return '<button onclick="ViewTransaction(' + BlockNum + ')" class="openblock">' + Str + '</button>';
        }
    }
    else
    {
        return '<div>' + Str + '</div>';
    }
}
function PrevValueToString(Item)
{
    if(Item.Mode === 200 && Item.HashData)
    {
        var Str = "Acc:<BR>" + GetHexFromArr(Item.HashData.AccHash) + "<BR>";
        
        if(Item.HashData.ErrorSumHash)
            Str += "<span class='red'>";
        Str += "Block:<BR>" + GetHexFromArr(Item.HashData.SumHash);
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
function RetVerify(Value)
{
    if(Value > 0)
    {
        return "<B style='color:green'>✔</B>";
    }
    else
        if(Value < 0)
            return "<B style='color:red'>✘</B>";
        else
            return "";
}

function RetNumDapp(Item)
{
    return Item.Num;
}

function RetIconPath(Item,bCurrency,bNoBlank)
{
    if(bCurrency)
    {
        var Currency=Item.Currency!==undefined?Item.Currency:Item.Num;
        var ItemCurrency = GetItemCurrencyByNum(Currency);
        if(ItemCurrency)
        {
            if(ItemCurrency.PathIcon)
                return ItemCurrency.PathIcon;
            
            if(ItemCurrency.IconBlockNum)
            {
                Item.IconBlockNum = ItemCurrency.IconBlockNum;
                Item.IconTrNum = ItemCurrency.IconTrNum;
            }
        }
    }
    
    if(Item.IconBlockNum)
        return GetURLPath('/file/' + Item.IconBlockNum + '/' + Item.IconTrNum);
    else if(!bNoBlank)
        return GetURLPath("/PIC/blank.svg");
    return "";
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
        return '<button type="button" class="bt_open_dapp" onclick="OpenDapps(' + Item.Num + ',' + AccountNum + ',1)">' + StrText + '</button>';
    }
    else
    {
        return RetIconDapp(Item) + Name;
    }
}

function RetDirect(Item)
{
    if(Item)
    {
        var color = "";
        if(Item.Direct === "-")
        {
            color = "red";
        }
        else
            if(Item.Direct === "+")
            {
                color = "green";
            }
        return "<B onclick='CopyRow(" + Item.Num + ")' class='direct " + color + "'>" + Item.Direct + "</B>";
    }
    return "";
}

function PasteRow()
{
    var Str = localStorage["COPY"];
    if(Str && Str.substr(0, 1) === "{")
    {
        var Item = JSON.parse(Str);
        $("idAccount").value = Item.From;
        $("idTo").value = Item.To;
        $("idSumSend").value = FLOAT_FROM_COIN(Item.Value);
        $("idDescription").value = Item.Description;
    }
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
    
    return "<a class='olink' target='_blank' onclick='OpenHistoryPage(" + Num + ")'>" + Num + "</a>";
}


function RetEditAccount(Item)
{
    if(CONFIG_DATA && CONFIG_DATA.CONSTANTS.USE_EDIT_ACCOUNT)
        return  "<a class='olink' target='_blank' onclick='DoEditAccount(" + Item.Num + ")'>" + (Item.Name?Item.Name:"---------") + "</a>";
    else
        return Item.Name;
}


function DoEditAccount(Num)
{
    var Item = MapAccounts[Num];
    if(!Item)
        return;
    openModal('idBlockEditAccount', 'isSaveBtEditAccount');
    
    $("idAccountNumEdit").value = Num;
    $("idAccountNameEdit").value = Item.Name;
    $("idPublicKeyEdit").value = GetHexFromArr(Item.PubKey);
    
    $("idAccountNameEdit").focus();
}

function OpenHistoryPage(Num)
{
    OpenWindow("./history.html#" + Num);
}

function RetBaseAccount(Item)
{
    var Str = RetHistoryAccount(Item, "Account");
    // if(Item.AccountLength > 1)
    //     Str += "-" + (Item.Account + Item.AccountLength - 1);
    return Str;
}

function ViewTransaction(BlockNum)
{
    if(UseInnerPage() || window.NWMODE)
        OpenBlockViewerPage(BlockNum);
    else
        window.Open('./blockviewer.html#' + BlockNum, 'viewer', 800, 800);
}
function OpenBlockViewerPage(Param)
{
    window.Open('./blockviewer.html#' + Param, 'viewer', 800, 800);
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
        window.CONSENSUS_PERIOD_TIME = 3000;
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
    var Item = $(name);
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
    var Item = $(name);
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
    if(!List)
        return;
    
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
        var Item = $(name);
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


function InitMapCategory()
{
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
}




function FillSelect(IdName,arr,bNatural)
{
    var Select = $(IdName);
    if(!Select || !Select.options)
        return;
    
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
            if(bNatural === "NAME")
                name = arr[key].name;
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
    // var arr;
    // var Str = Storage.getItem("InvoiceList");
    // if(Str)
    // {
    //     arr = JSON.parse(Str);
    // }
    // else
    // {
    //     arr = [];
    // }
    //
    // arr.unshift(Item);
    var arr=[Item];
    Storage.setItem("InvoiceList", JSON.stringify(arr));
}

function OpenDapps(Num,StrOpenParams,HTMLLength)
{
    if(!Num || !HTMLLength)
        return;
    
    var StrPath = '/dapp/' + Num;
    if(IsLocalClient())
    {
        StrPath = "./dapp-frame.html?dapp=" + Num;
    }
    
    if(StrOpenParams)
        StrPath += '#' + StrOpenParams;
    OpenWindow(StrPath);
}
function OpenWindow(StrPath,bCheck,bLocation)
{
    if(bCheck)
    {
        var c = StrPath.substr(0, 1);
        if(c !== "?" && c !== "/" && StrPath.substr(0, 4) !== "http")
        {
            SetError("Error link!");
            ToLog("Error path:\n" + StrPath);
            return;
        }
    }


    if(bLocation || isOS())
    {
        // if(parent.OpenLinkInSandbox)
        //     parent.OpenLinkInSandbox(StrPath);
        // else
            window.location = StrPath;
    }
    else
    {
        window.Open(StrPath);
    }
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

function IsPresentWalletPassword()
{
    var Key = Storage.getItem(WALLET_KEY_NAME);
    if(Key && Key.substr(0, 1) === "!")
        return 1;
    else
        return 0;
}
function IsLockedWallet()
{
    var Key = GetPrivKey();
    if(Key && Key.substr(0, 1) === "!")
        return 1;
    else
        return 0;
}

function IsPrivateKey(KeyStr)
{
    
    if(KeyStr && KeyStr.length === 64 && KeyStr !== "0000000000000000000000000000000000000000000000000000000000000000")
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
    if(Key && typeof Key === "string" && Key.length >= 64 && Key !== "0000000000000000000000000000000000000000000000000000000000000000")
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
function IsCorrectPrivKey(StrKey)
{
    if(StrKey.length!==64)
        return 0;

    if(GetHexFromArr(GetArrFromHex(StrKey))!==StrKey.toUpperCase())
        return 0;
    if(StrKey.substr(0,12)==="000000000000")
        return 0;

    return 1;

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

function IsLocalClient()
{
    return (window.location.protocol.substr(0, 4) !== "http");
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
    if(GetMainServer())
        return "./web-wallet.html#TabAccounts";
    else
        if(IsFullNode())
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
var NotModalClose=0;

function openModalForce(id,idOK)
{
    //console.log("Open force!");
    NotModalClose=1;
    return openModal(id,idOK);
}
function closeModalForce()
{
    //console.log("Close force!");
    NotModalClose=0;
    return closeModal();
}

function openModal(id,idOK)
{
    glWasModal = 1;
    var modal = document.querySelector("#" + id);
    var overlay = document.querySelector("#idOverlay");
    if(!modal)
        return SetError("Error id: "+id);
    if(!overlay)
        return SetError("Error idOverlay");
    modal.style.display = "block";//"flex";
    overlay.style.display = "block";
    
    if(idOK)
    {
        glConfirmF = function ()
        {
            glConfirmF = undefined;
            $(idOK).click();
        };
    }
}

function closeModal()
{
    if(NotModalClose)
        return;

    glWasModal = 0;
    //var modals = document.querySelectorAll(".Modal,.ModalDlg,.modal,#overlay,#idConfirm,#idOverlay");
    var modals = document.querySelectorAll(".Modal,.ModalDlg,#idOverlay");
    modals.forEach(function (item)
    {
        item.style.display = "none";
    });

    setTimeout(function ()
    {
        glConfirmF = undefined;
        if($("idShowContent"))
            idShowContent.innerHTML = "";
    }, 100);
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
    {
        if(typeof StrText === "function")
        {
            bDirect = F;
            F = StrText;
            StrText = "";
        }
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
    var WasConfirmF=glConfirmF;
    closeModal();
    if(WasConfirmF)
    {
        var F = WasConfirmF;
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

function ConfirmationFromBlock(BlockNum)
{
    var Length = MaxBlockNum - BlockNum;
    if(Length > 0)
    {
        if(Length <= 100)
            return Length;
        else
        {
            return ">" + Math.floor(Length / 100) * 100;
        }
    }
    else
        return "";
}

function RunServerCode(Code,bTX,bWEB)
{
    GetData("SendDirectCode", {Code:Code, TX:bTX, WEB:bWEB}, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text);
        }
    });
}

function GetStateItem(Item)
{
    var Str = "";
    if(Item.SmartState)
        Str = JSON.stringify(Item.SmartState);
    
    return Str;
}

function SaveWebDataToFile(text,filename)
{
    var blob = new Blob([text], {type:"text/plain"});
    var anchor = document.createElement("a");
    anchor.download = filename;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.target = "_blank";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

function LoadWebDataFromFile(idname,F,Meta)
{
    var file = $(idname).files[0];
    var reader = new FileReader();
    reader.onload = function ()
    {
        if(reader.result.byteLength < 2)
            SetStatus("Error file length (" + reader.result.byteLength + ")");
        else
        {
            var view = new Uint8Array(reader.result);
            var Str = Utf8ArrayToStr(view);
            F(Str, Meta);
            
            $(idname).value = "";
        }
    };
    reader.readAsArrayBuffer(file);
}

function OnFindTx(idname)
{
    var TxID = $(idname).value;
    if(!TxID)
        return;
    
    OpenBlockViewerPage(TxID);
    $(idname).value = "";
}

function MyXMLHttpRequest()
{
    //TODO
    this.status = 0;
    this.readyState = 0;
    this.Headers = {};
    this.open = function (Type,Method)
    {
        if(Type !== "POST")
            throw "Error type = " + Type;
        
        this.Method = Method;
    };
    
    this.setRequestHeader = function (Name,Value)
    {
        this.Headers[Name] = Value;
    };
    
    this.send = function (StrPost)
    {
        let SELF = this;
        fetch(SELF.Method, {method:'post', cache:'no-cache', mode:'cors', credentials2:'include', headers:this.Headers, body:StrPost}).then(function (response)
        {
            response.text().then(function (text)
            {
                SELF.status = response.status;
                SELF.statusText = response.statusText;
                SELF.readyState = 4;
                SELF.responseText = text;
                SELF.onreadystatechange();
            });
        }).catch(function (err)
        {
            SELF.onreadystatechange();
        });
    };
}

function IsFullNode()
{
    return localStorage["BIGWALLET"];
}

var LastErrorBlockNum = 0;
function SerErrorBlockNum(Str,BlockNum)
{
    SetError(Str);
    LastErrorBlockNum = BlockNum;
}
function SetStatusBlockNum(Str,BlockNum)
{
    if(LastErrorBlockNum !== BlockNum)
        SetStatus(Str);
}

function InitMobileInterface()
{
    SetVisibleBlock("idMobile", !!window.MobileInterface);
}
function DoMobile(Param)
{
    window.MobileInterface.DoMobile(Param);
}

function IsLocalAllowed()
{
    if(window.MobileInterface && window.MobileInterface.getAndroidVersion() >= 30)
        return 0;
    
    return 1;
}



async function ASetGridData(arr,id_name,TotalSum,bClear,TotalCurency)
{
    var htmlTable = $(id_name);
    if(!htmlTable)
    {
        console.log("Error id_name: " + id_name);
        return;
    }

    if(bClear)
    {
        CUR_ROW=undefined;
        ClearTable(htmlTable);
    }

    if(!htmlTable.ItemsMap)
    {
        htmlTable.ItemsMap = {};
        htmlTable.RowCount = 0;
    }

    var map = htmlTable.ItemsMap;

    if(!glWorkNum)
        glWorkNum=0;
    glWorkNum++;
    var ValueTotal = {SumCOIN:0, SumCENT:0};

    var row0 = htmlTable.rows[0];
    var row0cells = row0.cells;
    var colcount = row0cells.length;

    if(!htmlTable.ColumnArr)
        htmlTable.ColumnArr = CompileColumnArr(row0.cells);
    var ColumnArr = htmlTable.ColumnArr;

    //create new rows

    var PrevItem;
    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        var ID = Item.Num;
        htmlTable.MaxNum = Item.Num;


        var row = map[ID];
        if(!row)
        {
            //console.log(ID);
            htmlTable.RowCount++;


            // var CurRowIndex = 1;
            // if(CUR_ROW)
            //     CurRowIndex = CUR_ROW.rowIndex;
            //
            // if(!PrevItem && htmlTable.Arr && htmlTable.Arr.length > 0)
            // {
            //     CurRowIndex = 1;
            //     PrevItem = htmlTable.Arr[0];
            // }
            //
            // var NewRowIndex;
            // if(CUR_ROW && PrevItem)
            // {
            //     if(PrevItem.ID < Item.ID)
            //         NewRowIndex = CurRowIndex;
            //     else
            //         NewRowIndex = CurRowIndex + 1;
            // }
            // else
            // {
            //     NewRowIndex = -1;
            // }
            // NewRowIndex = -1;
            // row = htmlTable.insertRow(NewRowIndex);

            row = htmlTable.insertRow(-1);

            map[ID] = row;
            for(var n = 0; n < colcount; n++)
            {
                var ColItem = ColumnArr[n];
                if(!ColItem)
                    continue;
                var cell = row.insertCell();
                cell.className = ColItem.C;
            }
        }


        CUR_ROW = row;
        PrevItem = Item;
        //console.log("row",row.rowIndex);

    }

    //print data on rows

    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        var ID = Item.Num;

        var row = map[ID];
        row.Work = glWorkNum;

        var n2 =  - 1;
        for(var n = 0; n < colcount; n++)
        {
            var ColItem = ColumnArr[n];
            if(!ColItem)
                continue;
            n2++;
            var cell = row.cells[n2];

            if(ColItem.H)
            {
                var text = "" + await ColItem.F(Item);
                text = toStaticHTML(text.trim());
                if(cell.innerHTML !== text)
                    cell.innerHTML = text;
            }
            else
            if(ColItem.F)
            {
                var text = "" + await ColItem.F(Item);
                text.trim();
                if(cell.innerText !== text)
                    cell.innerText = text;
            }
        }

         if(TotalSum && Item.Currency==TotalCurency)
            ADD(ValueTotal, Item.Value);

    }



    htmlTable.Arr = arr;

    for(var key in map)
    {
        var row = map[key];
        if(row.Work != glWorkNum)
        {
            htmlTable.deleteRow(row.rowIndex);
            delete map[key];
        }
    }


    if(TotalSum)
    {
        var id = $(TotalSum);
        if(id)
        {
            if(!ISZERO(ValueTotal))
                id.innerText = "Total on page: " + SUM_TO_STRING(ValueTotal, TotalCurency, 0, 1);
            else
                id.innerText = "";
        }
    }

}

//Main server
function InitMainServer()
{
    var Str = Storage.getItem("MainServer");
    if(Str && !IsFullNode() && Str.substr(0, 1) === "{" && IsLocalClient())
    {
        SetMainServer(JSON.parse(Str));
    }
}
function GetMainServer()
{
    return glMainServer;
}
function SetMainServer(Value)
{
    window.glMainServer=Value;
    if(Value)
    {
        window.PROTOCOL_SERVER_PATH = GetProtocolServerPath();
    }
}

function GetProtocolServerPath(Item)
{
    if(window.PROTOCOL_SERVER_PATH)
        return window.PROTOCOL_SERVER_PATH;

    if(!Item)
        Item=GetMainServer();
    if(!Item)
        return "";//.


    if(Item.port === 443)
        return "https://" + Item.ip;
    else
    if(Item.port === 80)
        return "http://" + Item.ip;
    else
        return "http://" + Item.ip + ":" + Item.port;
}

function GetURLPath(Path)
{
    if(window.PROTOCOL_SERVER_PATH && Path.substr(0,1)==="/")
          Path = GetProtocolServerPath() + Path;

    //console.log("GetURLPath:",Path,"---",window.PROTOCOL_SERVER_PATH,glMainServer,"===hfer:",location.href)
    //console.log("GetURLPath:",Path);

    return Path;
}


InitMapCategory();
