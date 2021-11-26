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
"idSendTo", "idSendSum", "idSendDesc", "idNoSendHTML", "idTrimCode", "idLoadDapp", "idChildIP", "idChildPort", "idChildScore","idCurrency","idTokenID","idFontSize"];

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
var glMapCode;

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
    console.log("%c" + Str, "color:red;font-weight:bold;");
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
    for(var i=0;i<ArrWallet.length;i++)
        MapAccounts[ArrWallet[i].Num]=ArrWallet[i];

    var Arr=AccToListArr(ArrWallet,0);
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
    // if(Smart.TokenGenerate)
    //     Price = CONFIG_DATA.PRICE_DAO.NewTokenSmart;
    // else
    Price = CONFIG_DATA.PRICE_DAO.NewSmart;
    //Price += (Smart.AccountLength - 1) * CONFIG_DATA.PRICE_DAO.NewAccount;
    return Price;
}

function IsPrivateMode(PrivKeyStr)
{
    return IsPrivateKey(PrivKeyStr);
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
    
    var FromID = +$("idSmartOwner").value;
    var Item = MapAccounts[FromID];
    if(!Item)
    {
        SetError("You must be the owner of the smart contact");
        return;
    }

    SetStatus("");
    DoConfirm("Send new state?", SendStr, async function ()
    {
        // var BVersion=await AGetFormat("BLOCKCHAIN_VERSION");
        // if(BVersion>=2)
        // {

            var Format=await AGetFormat("FORMAT_SMART_SET");
            var TR={};
            TR.Type=await AGetFormat("TYPE_SMART_SET");
            TR.Version=4;
            TR.OperationID = GetOperationIDFromItem(Item, 1);
            TR.FromNum=FromID;
            TR.Smart = +$("idSmartNum").value;
            TR.HTMLBlock=Ret.BlockNum;
            TR.HTMLTr=Ret.TrNum;
            //console.log(TR);
            var Body=SerializeLib.GetBufferFromObject(TR, Format, {});
            Body.length-=64;

            SendTrArrayWithSign(Body, FromID, TR);

        // }
        // else
        // {
        //     var ToID = ParseNum($("idSmartAccount").value);
        //     SendTx(FromID, ToID, 0, SendStr, []);
        // }
    });
}

function DebugHTMLInBlockchain()
{
    DoConfirm("Debug","Type dapp number: <BR><BR> <INPUT type='input' id='idDebugNum'>",function ()
    {
        SaveValues(1);

        var Key="DAPP-DEBUG:"+idDebugNum.value;
        localStorage[Key] = idName.value;
    });
    setTimeout(function ()
    {
        window.idDebugNum.focus();
        // console.log(window.idDebugNum);
        // document.activeElement=window.idDebugNum;
    },10)
}
function ClearDebugHTMLInBlockchain()
{
    for(var key in localStorage)
    {
        if(key.substr(0,11)==="DAPP-DEBUG:")
            delete localStorage[key];
    }
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

function SendJSToBlockchain()
{
    var Str = GetHTMLCode();
    var bTrim=$("idTrimCode").checked;

    //find js code
    var Arr = Str.split("\n");
    var StrAll = "";
    var bAdd=0;
    for(var i = 0; i < Arr.length; i++)
    {
        var Str1 =Arr[i];
        var Str2 = Str1.trim();
        if(!bAdd && Str2==="<script>")
        {
            bAdd=1;
            continue;
        }
        else
        if(bAdd && Str2==="</script>")
        {
            bAdd=0;
            continue;
        }

        if(!bAdd)
            continue;
        if(bTrim)
        {
            Str1 = Str2;
            if(Str1.substring(0, 2) === "//")
            {
                Str1 = null;
            }
            if(!Str1)
                continue;
        }


        StrAll += Str1 + "\n";
    }

    if(!StrAll)
        return SetError("Not find js-part");
    if(bAdd)
        return SetError("Error finding js-part");

    //console.log(StrAll);
    console.log("Js length="+StrAll.length);


    SendText({}, "application/javascript", StrAll);
}
function GetCodeSmart(bTrim)
{
    var Smart = {};
    SetDialogToSmart(Smart);


    //find js codes
    var MapCode = {All:{name:"All code",Code:""}};


    var Arr = Smart.Code.split("\n");
    var StrAll = "", CurLib="",StrCommon="";
    var bAdd = 0;
    for(var i = 0; i < Arr.length; i++)
    {
        var Str1 = Arr[i];
        var Str2 = Str1.trim();
        if(Str2.substr(0, 12) === "//lib-start:")
        {
            var LibName = Str2.substr(12);
            if(CurLib)
            {
                SetError("Error: found start library: "+LibName+" without closing the previous: "+CurLib);
                return undefined;
            }
            CurLib=LibName;
            if(!MapCode[CurLib])
                MapCode[CurLib]={name:CurLib,Code:""};
        }
        else
        if(Str2.substr(0, 10) === "//lib-end:")
        {
            var LibName = Str2.substr(10);
            if(CurLib!=LibName)
            {
                SetError("Error: found closing library: "+LibName+". Current library must: "+CurLib);
                return undefined;
            }
            CurLib="";
        }

        if(CurLib)
            MapCode[CurLib].Code+=Str1 + "\n";
        else
            if(!CurLib)
                StrCommon += Str1 + "\n";

        StrAll += Str1 + "\n";
    }

    if(CurLib)
    {
        SetError("Error: Current library not was closed: "+CurLib);
        return undefined;
    }

    for(var key in MapCode)
    {
        if(key=="All")
            continue;
        MapCode[key].Code+=StrCommon
    }

    MapCode.All.Code=StrAll;
    return MapCode;
}

function SendToBlockchain()
{
    var StrErr=IsErrTokenNames();
    if(StrErr)
        return SetError("Error "+StrErr);

    SetStatus("");
    glMapCode=GetCodeSmart();
    if(!glMapCode)
        return;

    var Str='<select id="idCodeMode"></select>';
    DoConfirm("Send " + $("idName").value + " to blockchain?", Str,function ()
    {
        SendToBlockchain2(idCodeMode.value);
    });


    FillSelect("idCodeMode",glMapCode,"NAME");
}
async function SendToBlockchain2(CodeType)
{

    var Smart = {};
    SetDialogToSmart(Smart);


    var Name=Smart.Name;
    if(CodeType!=="All")
        Name=CodeType;

    
     Smart.AccountLength = 1;



    var Code = glMapCode[CodeType].Code;// Smart.Code;

    var HTML = Smart.HTML;
    if($("idNoSendHTML").checked && Smart.HTML)
        HTML = "-";
    
    if($("idTrimCode").checked)
    {
        Code = TrimStr(Code);
        HTML = TrimStr(HTML);
    }

    var TR=CopyObjKeys({},Smart);
    TR.Name=Name;
    TR.Code=Code;
    TR.HTML=HTML;

    TR.StartValue = 0;


    // TR.TokenGenerate=1;
    // TR.StartValue=1000000;

    //TR.ShortName=NormalizeCurrencyName(TR.ShortName);

    var Price = GetPrice(Smart);

    var Version=await AGetFormat("BLOCKCHAIN_VERSION");
    var Format=await AGetFormat("FORMAT_SMART_CREATE"+(Version>=2?"2":"1"));
    TR.Type=await AGetFormat("TYPE_SMART_CREATE"+(Version>=2?"2":"1"));
    var Body=SerializeLib.GetBufferFromObject(TR, Format, {});


    var FromID = +$("idUser").value;
    if(Version<2)
        SendTx(FromID, 0, Price, "Create smart: " + Smart.Name, Body);
    else
        SendTx5(FromID, 0, Price, "Create smart: " + Smart.Name, Body);

    console.log("Send smart "+Name+" length:",Body.length);
    //console.log(Code);

}
async function SendTx5(FromID,ToID,Price,Description,Body)
{
    var AccItem = MapAccounts[FromID];
    if(!AccItem)
    {
        SetError("Choose account,pls!");
        return;
    }


    var OperationID = AccItem.Value.OperationID;
    var TR = {
        Version: 4,
        OperationID: OperationID,
        FromID: FromID,
        TxTicks:35000,
        TxMaxBlock:GetCurrentBlockNumByTime()+120,
        Currency:0,
        ToID:ToID,
        Amount:{SumCOIN: Price, SumCENT: 0},
        TokenID:"",
        Description: Description,
        Body: Body,
        Sign: [],
    };

    var Format=await AGetFormat("FORMAT_MONEY_TRANSFER5");
    TR.Type=await AGetFormat("TYPE_MONEY_TRANSFER5");
    TR.CodeVer=await AGetFormat("CodeVer");

    // console.log(TR)
    // return;;
    var Body=SerializeLib.GetBufferFromObject(TR, Format, {});
    Body.length-=64;

    SendTrArrayWithSign(Body, FromID, TR);
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

        SendTransactionNew(Body, TR, function (Err,TR,Body)
        {
            if(Err)
                return;
        });
    });
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
function SelectEditorsParams()
{
    if(!window.ace)
        return;

    SetAceOptions(editCode);
    SetAceOptions(editHTML);


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
            SetMainServer(JSON.parse(Storage.getItem("MainServer")));
        }
    }
    
    var StyleName;
    if(!IsFullNode())
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

        if(!ProjectArray || ProjectArray.length==0)//защита  от записи пустого массива
        {
            var ArrStr = localStorage["SMART-ProjectArray"];
            if(ArrStr)
            {
                var Arr0 = JSON.parse(ArrStr);
                if(Arr0.length>1)
                {
                    console.log("Error? Prev length Arr=",Arr0.length);
                    return;
                }
            }
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
        ClearDebugHTMLInBlockchain();
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
            var file = $("idFile").files[0];

            var view = new Uint8Array(reader.result);
            SendFileData(TR,file.name,file.type,view);
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
async function SendText(TR,type,Str)
{
    if(!type)
        type = $("idType").value;
    if(!Str)
        Str = $("idText").value;
    if(Str.length === 0)
        return;

    var view = GetArrFromStr(Str);
    if(view.length > 32000 && !IsFullNode())
    {
        SetStatus("Error length file = " + view.length + " (max size=32000)");
        return;
    }
    SendFileData(TR,"text",type,view);
}

async function SendFileData(TR,name,type,view)
{

    if(!TR)
        TR = {};

    TR.Type = await AGetFormat("TYPE_TRANSACTION_FILE");
    TR.Name = name;
    TR.ContentType = type;
    TR.Reserve = [];
    TR.Data = view;

    var Format=await AGetFormat("FORMAT_FILE_CREATE");
    var Body=SerializeLib.GetBufferFromObject(TR, Format, {});
    //Body.length-=64;
    //console.log(TR);
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
        
        var info = String(Item.text);

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
    // PrevSmartValue=undefined;
    // idProjectList.value=undefined;
    // SetSmartToDialog(GetBlankSmart(),0,1);
    localStorage["SMART-ProjectArray"] = Str;
    LoadValues();

    SetCurrentProject();
}

function UpdatePlayInfo()
{
    if(!VM_ACCOUNTS)
        return;

    var UserArr = [];
    for(var i = 100; i < VM_ACCOUNTS.length; i++)
    {
        var Item = ACCOUNTS.ReadStateTR(i);
        UserArr.push(Item);
        if(i > 150)
            break;
    }

    var Arr=AccToListArr(UserArr);
    FillSelect("idPlayAccount", Arr);
}

function CorrectFrameSize()
{
}


setInterval(UpdatePlayInfo, 1000);
