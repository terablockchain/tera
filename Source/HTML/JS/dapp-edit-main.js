/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var SaveIdArr = ["idUser", "idSmartStart", "idText", "idType", "idSelStyle", "idAutoPlay", "idDebugLog", "idScreenStyle", "idSendFrom",
"idSendTo", "idSendSum", "idSendDesc", "idNoSendHTML", "idTrimCode", "idLoadDapp", "idChildIP", "idChildPort", "idChildScore"];

var WasOKLoaded = 0;
var bWasPlay = 0;
var editCode;
var editHTML;
var CONFIG_DATA = {};
CONFIG_DATA.CONSTANTS = {};
global.UPDATE_CODE_1 = 0;
global.UPDATE_CODE_SHARDING = 0;

var ArrTabs = [{Current:"TabProjects", Class:"tab1", CurClass:"current1", Map:{TabProjects:{F1:0}, TabFile:{F1:1}, TabText:{F1:1},
        TabConfig:{F1:0}, }}, {ParentIndex:0, ParentName:"TabProjects", Current:"TabMain", Class:"tab2", CurClass:"current2", Map:{TabMain:{},
        TabSmart:{F:function ()
            {
                ActivateEditor(editCode);
            }}, TabHTML:{F:function ()
            {
                ActivateEditor(editHTML);
            }}, TabPlay:{F:function ()
            {
                CheckReplay();
            }}, TabUpload:{F1:1}, }}];

function SelectTab(name)
{
    SetStatus("");
    for(var i = 0; i < ArrTabs.length; i++)
    {
        var Item = ArrTabs[i];
        if(Item.Map[name])
        {
            Item.Current = name;
            break;
        }
    }
    SetVisibleTab();
    SaveValues();
}

function SetVisibleTab()
{
    for(var i = 0; i < ArrTabs.length; i++)
    {
        var Item = ArrTabs[i];
        if(Item.ParentName && ArrTabs[Item.ParentIndex].Current !== Item.ParentName)
            continue;
        
        for(var name in Item.Map)
        {
            var Item2 = Item.Map[name];
            var Elem = $(name);
            var ElemM = $("M" + name);
            if(!ElemM)
                continue;
            
            if(Item.Current === name)
            {
                ElemM.className = Item.Class + " " + Item.CurClass;
                if(Elem)
                    Elem.style.display = 'block';
                if(Item2.F1 !== undefined)
                {
                    if(Item2.F1)
                    {
                        var Block = $("idServerBlock");
                        var BlockMem = Block.parentElement.removeChild(Block);
                        Elem.appendChild(BlockMem);
                    }
                    SetVisibleBlock("idServerBlock", Item2.F1);
                }
                if(Item2.F !== undefined)
                    Item2.F();
            }
            else
            {
                ElemM.className = Item.Class;
                if(Elem)
                    Elem.style.display = 'none';
            }
        }
    }
}

InitWalletKeyName();

function SetStatus(Str,bNoEscape)
{
    var id = $("idStatus");
    if(!bNoEscape)
    {
        if(Str)
            console.log(Str);
        Str = escapeHtml(Str);
    }
    id.innerHTML = Str;
}
function SetError(Str,bNoSound)
{
    console.log(Str);
    SetStatus("<DIV  align='left' style='color:#b50000'><B>" + escapeHtml(Str) + "</B></DIV>", 1);
}

var WasFirstUpdate = 0;
function UpdateData()
{
    var Cur1 = ArrTabs[0].Current;
    var Cur2 = ArrTabs[1].Current;
    
    if(!WasFirstUpdate || Cur1 === "TabFile" || Cur1 === "TabText" || Cur1 === "TabProjects" && Cur2 === "TabUpload" || $("idIcon").value === "=wait=")
    {
        
        GetData("GetCurrentInfo", {ArrLog:1}, function (Data)
        {
            if(Data && Data.result)
            {
                CheckSessionID(Data.sessionid);
                SHARD_NAME = Data.SHARD_NAME;
                NETWORK_NAME = Data.NETWORK;
                NETWORK_ID = NETWORK_NAME + "." + SHARD_NAME;
                WasFirstUpdate = 1;
                CONFIG_DATA = Data;
                SetBlockChainConstant(Data);
                SetArrLog(Data.ArrLog);
            }
        });
        
        var Key = GetPubKey();
        GetData("DappWalletList", {AllAccounts:1, Key:Key}, function (Data)
        {
            if(Data && Data.result)
            {
                UpdateFillUser(Data.arr);
            }
        });
    }
}

var MapAccounts = {};
function UpdateFillUser(ArrWallet)
{
    var Arr = [];
    for(var i = 0; i < ArrWallet.length; i++)
    {
        var Item = ArrWallet[i];
        var Value = {value:Item.Num, text:Item.Num + "." + Item.Name + "  " + SUM_TO_STRING(Item.Value, Item.Currency, 1)};
        Arr.push(Value);
        
        if(!MapAccounts[Item.Num])
            MapAccounts[Item.Num] = {};
        CopyObjKeys(MapAccounts[Item.Num], Item);
    }
    FillSelect("idUser", Arr);
}

function SetPrice()
{
    var Smart = {};
    SetDialogToSmart(Smart);
    $("idPrice").innerText = GetPrice(Smart);
}
function GetPrice(Smart)
{
    if(!CONFIG_DATA.PRICE_DAO)
        return 0;
    
    var Price;
    if(Smart.TokenGenerate)
        Price = CONFIG_DATA.PRICE_DAO.NewTokenSmart;
    else
        Price = CONFIG_DATA.PRICE_DAO.NewSmart;
    Price += (Smart.AccountLength - 1) * CONFIG_DATA.PRICE_DAO.NewAccount;
    return Price;
}

function IsPrivateMode(PrivKeyStr)
{
    if(PrivKeyStr && PrivKeyStr.length === 64)
        return 1;
    else
        return 0;
}

function SendStateHTML(Name)
{
    var Ret;
    if(Name)
    {
        Ret = ParseFileName($(Name).value);
    }
    else
    {
        Ret = {BlockNum:404, TrNum:0};
    }
    var SendObj = {"HTMLBlock":Ret.BlockNum, "HTMLTr":Ret.TrNum};
    var SendStr = JSON.stringify(SendObj);
    
    var FromID = $("idSmartOwner").value;
    if(!MapAccounts[FromID])
    {
        SetError("You must be the owner of the smart contact");
        return;
    }
    var ToID = ParseNum($("idSmartAccount").value);
    
    SetStatus("");
    DoConfirm("Send new state?", SendStr, function ()
    {
        SendTx(FromID, ToID, 0, SendStr, []);
    });
}

function SendTx(FromID,ToID,Price,Description,Body)
{
    var AccItem = MapAccounts[FromID];
    if(!AccItem)
    {
        SetError("Choose account,pls!");
        return;
    }
    
    var OperationID = AccItem.Value.OperationID;
    var TR = {Type:111, Version:4, OperationID:OperationID, FromID:FromID, Old:0, To:[{PubKey:[], ID:ToID, SumCOIN:Price, SumCENT:0}],
        Description:Description, Body:Body, Sign:"", };
    
    GetSignTransaction(TR, "", function (TR)
    {
        if(IsZeroArr(TR.Sign))
        {
            SetError("Open wallet, pls");
            return;
        }
        
        var Body = GetArrFromTR(TR);
        WriteArr(Body, TR.Sign, 64);
        
        SendTransactionNew(Body, TR, undefined, function (Err,TR,Body)
        {
            if(Err)
                return;
        });
    });
}

function SendHTMLToBlockchain()
{
    var HTML = GetHTMLCode();
    if($("idTrimCode").checked)
    {
        HTML = TrimStr(HTML);
    }
    
    SendText({}, "text/html", HTML);
}
function SendToBlockchain()
{
    SetStatus("");
    DoConfirm("Send " + $("idName").value + " to blockchain?", function ()
    {
        SendToBlockchain2();
    });
}
function SendToBlockchain2()
{
    
    var Smart = {};
    SetDialogToSmart(Smart);
    
    if(Smart.AccountLength < 1)
        Smart.AccountLength = 1;
    if(Smart.AccountLength > 50)
        Smart.AccountLength = 50;
    
    var Body = [];
    WriteByte(Body, 130);
    WriteByte(Body, Smart.TokenGenerate);
    WriteUint(Body, Smart.StartValue);
    WriteByte(Body, Smart.OwnerPubKey);
    WriteStr(Body, Smart.ISIN);
    WriteByte(Body, 0);
    WriteByte(Body, Smart.AccountLength);
    WriteStr(Body, Smart.StateFormat);
    WriteByte(Body, Smart.Category1);
    WriteByte(Body, Smart.Category2);
    WriteByte(Body, Smart.Category3);
    
    WriteByte(Body, Smart.Fixed);
    WriteStr(Body, Smart.CentName, 5);
    
    WriteUint32(Body, Smart.CrossMsgConfirms);
    for(var i = 0; i < 10; i++)
        Body[Body.length] = 0;
    
    var IconParam = ParseFileName($("idIcon").value);
    WriteUint(Body, Smart.IconBlockNum);
    WriteUint16(Body, Smart.IconTrNum);
    
    WriteStr(Body, Smart.ShortName, 5);
    WriteStr(Body, Smart.Name);
    WriteStr(Body, Smart.Description);
    
    var Code = Smart.Code;
    var HTML = Smart.HTML;
    if($("idNoSendHTML").checked && Smart.HTML)
        HTML = "-";
    
    if($("idTrimCode").checked)
    {
        Code = TrimStr(Code);
        HTML = TrimStr(HTML);
    }
    
    WriteStr(Body, Code);
    WriteStr(Body, HTML);
    
    var Price = GetPrice(Smart);
    
    var FromID = $("idUser").value;
    SendTx(FromID, 0, Price, "Create smart: " + Smart.Name, Body);
}

function CheckCtrlEnter(e,F)
{
    if(e.keyCode === 13)
    {
        if(glConfirmF)
        {
            e.preventDefault();
            closeModal();
            OnConfirmOK();
        }
    }
    if(e.keyCode === 27)
    {
        if(window.closeModal)
            closeModal();
    }
    
    if(e.ctrlKey && e.keyCode === 83)
    {
        e.preventDefault();
        $("idSave").click();
    }
    if(e.ctrlKey && e.keyCode === 79)
    {
        e.preventDefault();
        $("idLoad").click();
    }
}

function SelectStyle(value)
{
    var Select = $("idSelStyle");
    if(value)
        Select.value = value;
    
    if(!Select.value)
        Select.value = Select.options[0].value;
    
    document.body.className = "univers " + Select.value;
    
    if(window.ace)
    {
        SetTheme(editCode);
        SetTheme(editHTML);
    }
}

window.onload = function ()
{
    
    FillCategory("idCategory1");
    FillCategory("idCategory2");
    FillCategory("idCategory3");
    
    window.onkeydown = CheckCtrlEnter;
    
    if(IsLocalClient())
    {
        if(Storage.getItem("MainServer"))
        {
            MainServer = JSON.parse(Storage.getItem("MainServer"));
            if(MainServer)
                window.PROTOCOL_SERVER_PATH = GetProtocolServerPath(MainServer);
        }
    }
    
    var StyleName;
    if(!Storage.getItem("BIGWALLET"))
    {
        if(IsLocalClient())
            InitMainServer();
    }
    
    GetData("GetCurrentInfo", {}, function (Data)
    {
        if(Data && Data.result)
            SetBlockChainConstant(Data);
        
        LoadValues();
        if(!$("idSelStyle").value)
            $("idSelStyle").value = "styleLight";
        InitAce();
        SelectScreenStyle();
        
        setTimeout(FillSmart, 1000);
        
        SelectStyle();
        
        SetStatus("");
        
        LoadENV();
        SetVisibleTab();
        SetSampleByName();
        
        SetDialogEnabled();
        
        UpdateData();
        setInterval(UpdateData, 2000);
        
        WasOKLoaded = 1;
    });
}

function LoadENV()
{
    var EnvStr = localStorage["SMART-ENV"];
    if(EnvStr)
    {
        var Env = JSON.parse(EnvStr);
        $("idProjectList").value = Env.CurrentProject;
        SetCurrentProject();
        SelectTab(Env.CurrentTab);
    }
}
function SaveENV()
{
    var Env = {CurrentProject:$("idProjectList").value, CurrentTab:ArrTabs[1].Current, };
    
    localStorage["SMART-ENV"] = JSON.stringify(Env);
}

function LoadValues()
{
    LoadValuesByArr(SaveIdArr, "SMART2");
    var List = localStorage["SMART-SendFileList-" + window.NETWORK_NAME];
    if(List)
    {
        SendFileMap = JSON.parse(List);
        FillMapByName();
        FillSelect("idSendFileList", SendFileMap);
    }
    var ArrStr = localStorage["SMART-ProjectArray"];
    if(ArrStr)
    {
        ProjectArray = JSON.parse(ArrStr);
    }
    FillProject();
}
function SaveValues(All)
{
    SaveValuesByArr(SaveIdArr, "SMART2");
    
    if(All)
    {
        var bDisabled = (CurProjectValue != $("idProjectList").value);
        if(!bDisabled && CurProjectValue)
        {
            var Smart = ProjectArray[parseInt(CurProjectValue)];
            SetDialogToSmart(Smart);
            FillProject();
        }
        localStorage["SMART-ProjectArray"] = JSON.stringify(ProjectArray);
    }
}
setInterval(function ()
{
    SaveValues(1);
}
, 60 * 1000);
setInterval(function ()
{
    SaveValues();
}
, 1000);

window.onbeforeunload = function (e)
{
    if(WasOKLoaded)
    {
        SaveValues(1);
        SaveENV();
    }
}


var SendFileMap = {};
var FileMapByName = {};
function FillMapByName()
{
    FileMapByName = {};
    for(var key in SendFileMap)
    {
        var item = SendFileMap[key];
        FileMapByName[item.Name] = item;
    }
}

function SendFile(TR)
{
    var file = $("idFile").files[0];
    var reader = new FileReader();
    reader.onload = function ()
    {
        if(reader.result.byteLength > 16384)
            SetError("File very long");
        else
        {
            var view = new Uint8Array(reader.result);
            var Body = [5];
            var file = $("idFile").files[0];
            WriteStr(Body, file.name);
            WriteStr(Body, file.type);
            for(var i = 0; i < 10; i++)
                Body[Body.length] = 0;
            WriteTr(Body, view);
            
            if(!TR)
                TR = {};
            TR.Name = file.name;
            TR.Type = file.type;
            
            SendTransactionNew(Body, TR);
        }
    };
    reader.readAsArrayBuffer(file);
}

function CalclTextLength()
{
    var Str = $("idText").value;
    var view = GetArrFromStr(Str);
    SetStatus("Length:" + view.length);
}
function SendText(TR,type,Str)
{
    if(!type)
        type = $("idType").value;
    if(!Str)
        Str = $("idText").value;
    if(Str.length === 0)
        return;
    
    var view = GetArrFromStr(Str);
    if(view.length > 16000 && !IsFullNode())
    {
        SetStatus("Error length file = " + view.length + " (max size=16000)");
        return;
    }
    
    var Body = [5];
    var name = "text";
    WriteStr(Body, name);
    WriteStr(Body, type);
    for(var i = 0; i < 10; i++)
        Body[Body.length] = 0;
    WriteTr(Body, view);
    
    if(!TR)
        TR = {};
    TR.Name = name;
    TR.Type = type;
    
    SendTransactionNew(Body, TR);
}

function SetArrLog(arr)
{
    var Str = "";
    for(var i = 0; i < arr.length; i++)
    {
        var Item = arr[i];
        if(!CanAdItemToLog(Item))
            continue;
        
        var info = Item.text;
        
        var index1 = info.indexOf("Add to blockchain");
        var index2 = info.indexOf("file");
        if(index1 >= 0 && index2 > 0)
        {
            var StrRef0 = info.substr(index2);
            var StrRef = "/" + StrRef0;
            Str = Str + info.substr(0, index2) + " " + StrRef + "\n";
            
            var TR = MapSendTransaction[Item.key];
            if(TR && !SendFileMap[StrRef])
            {
                SendFileMap[StrRef] = {text:TR.Name + " (" + StrRef0 + ")", value:StrRef, Name:TR.Name, Type:TR.Type};
                FillMapByName();
                
                if(TR.idName)
                {
                    $(TR.idName).value = StrRef;
                    $(TR.idNameSrc).src = StrRef;
                    SaveValues();
                }
                
                localStorage["SMART-SendFileList-" + window.NETWORK_NAME] = JSON.stringify(SendFileMap);
                FillSelect("idSendFileList", SendFileMap);
            }
        }
        else
        {
            Str = Str + info + "\n";
        }
    }
    SetStatusFromServer(Str);
}

function ViewBlockchainFile()
{
    var item = SendFileMap[$("idSendFileList").value];
    if(!item)
    {
        $("idImgInfo").innerText = "Error";
    }
    else
    {
        $("idImgInfo").innerText = item.value + " " + item.Type;
        $("idImg").src = item.value;
    }
}
function SelectBlockchainFile(idName,idNameSrc)
{
    $("idFile").value = "";
    $('idFile').onchange = function ()
    {
        $('idFile').onchange = undefined;
        var file = $("idFile").files[0];
        if(!file)
            return;
        var item = FileMapByName[file.name];
        if(item)
        {
            $(idName).value = item.value;
            $(idNameSrc).src = item.value;
            SaveValues();
        }
        else
        {
            $(idName).value = "=wait=";
            $(idNameSrc).src = "";
            SendFile({idName:idName, idNameSrc:idNameSrc});
        }
    };
    $('idFile').click();
}
function SetSampleByName()
{
    var StrName = $("idIcon").value.trim();
    if(!StrName)
        $("idIconSample").src = "./PIC/viewer.png";
    else
        $("idIconSample").src = GetFilePath(StrName);
    SaveValues();
}

function ClearListFile()
{
    DoConfirm("Are you sure?", function ()
    {
        SendFileMap = {};
        FileMapByName = {};
        localStorage["SMART-SendFileList-" + window.NETWORK_NAME] = JSON.stringify(SendFileMap);
        FillSelect("idSendFileList", SendFileMap);
    });
}

function DoLoadingConfig(Str,Meta)
{
    localStorage["SMART-ProjectArray"] = Str;
    LoadValues();
}

function UpdatePlayInfo()
{
    if(!VM_ACCOUNTS)
        return;
    var Arr = [];
    for(var i = 100; i < VM_ACCOUNTS.length; i++)
    {
        var Item = VM_ACCOUNTS[i];
        if(Item && Item.Value)
        {
            var Value = {value:Item.Num, text:Item.Num + "." + Item.Name + "  " + SUM_TO_STRING(Item.Value, Item.Currency, 1)};
            Arr.push(Value);
        }
        if(i > 150)
            break;
    }
    FillSelect("idPlayAccount", Arr);
}

setInterval(UpdatePlayInfo, 1000);
