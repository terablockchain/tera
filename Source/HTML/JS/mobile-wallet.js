/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var WEB_WALLET_VERSION = "" + window.CLIENT_VERSION;

var SaveIdArr = ["idAccount", "idTo", "idSumSend", "idDescription", "idCurTabName", "idViewBlockNum", "idViewAccountNum", "idViewDappNum", "idLang","idMainServer"];

var CONFIG_DATA = {PRICE_DAO:{NewAccount:10}, MaxNumBlockDB:0, MaxAccID:0, MaxDappsID:0};
var CountViewRows = 20;
var DefAccounts = {BlockName:"idPaginationAccount", NumName:"idViewAccountNum", TabName:"explorer_accounts", APIName:"GetAccountList"};
var DefBlock = {BlockName:"idPaginationBlock", NumName:"idViewBlockNum", TabName:"explorer_blocks", APIName:"GetBlockList"};
var DefDapps = {BlockName:"idPaginationDapps", NumName:"idViewDappNum", TabName:"dapps_list", APIName:"GetDappList", CountViewRows:10,
    FilterName:"idCategory"};

var AccToggleMap={};
function SetImg()
{
}

var CONNECT_STATUS = 0;
var NotModalClose = 0;

var ClosePasswordOnExit = 0;

function OnResetPage()
{
    var HasPassword = IsLockedWallet();
    if(HasPassword)
    {
        SetStatus("Relogin...");
        DoExitWallet();
    }
}

window.addEventListener('keydown', function (e)
{
    if(e.keyCode === 27)
    {
        if(IsVisibleBlock("idOverlay"))
            closeModal();
        if(IsVisibleBlock("idCloseButton"))
            window.close();
    }
    else
        if(e.keyCode === 13)
        {
            if(glConfirmF)
                OnConfirmOK();
        }
}
);

window.addEventListener('beforeunload', function (e)
{
    // if(ClosePasswordOnExit)
    //     DoExitWallet(); - не нужно - иначе перестают работать даппы на других вкладках
}
);

window.addEventListener('load', function ()
{
    InitMobileInterface();
    DoNewSession();
    
    InitAccountsCard();
    DoLangScript();
    
    InitWalletKeyName();
    
    if(IsLocalClient())
    {
        OnLoad();
    }
    else
    {
        GetData("/GetCurrentInfo", {}, function (Data)
        {
            if(Data && Data.result)
            {
                // window.SHARD_NAME = Data.SHARD_NAME;
                // window.NETWORK_NAME = Data.NETWORK;
                // window.NETWORK_ID = Data.NETWORK + "." + Data.SHARD_NAME;
                CheckNetworkID(Data);
                
                Storage.setItem("NETWORK_ID", window.NETWORK_ID);
                console.log("Default network: " + NETWORK_ID);
                SetServerList(NETWORK_ID);
                SetBlockChainConstant(Data);
                OnLoad();
            }
        });
    }
    
    ClosePasswordOnExit = IsLockedWallet();
    if(ClosePasswordOnExit)
    {
        NotModalClose = 1;
        OpenPasswordForm();
    }
    else
    {
        if(!IsPrivateKey(GetPrivKey()))
            OpenWalletKey();
        Storage.setItem(WALLET_KEY_EXIT, "");
    }
    SetUsePassword(IsPresentWalletPassword());
    
    if(!$("idAccountsList"))
        return;
    
    $("idAccountsList").addEventListener("click", MyToggleList);
    
    if(window.addEventListener)
    {
        window.addEventListener("message", OnMessage);
    }
    else
    {
        window.attachEvent("onmessage", OnMessage);
    }
    
    if(UseInnerPage())
    {
        AddFrame("HistoryPage", "./history.html");
        AddFrame("BlockViewerPage", "./blockviewer.html");
    }
}
);

function SetServerList(NameID)
{
    SetNetworkID(NameID);
    
    FillSelect("idCurNetwork", [{value:NETWORK_ID, text:NameID}]);
    $("idCurNetwork").value = NETWORK_ID;
    Storage.setItem("NETWORK_ID", NETWORK_ID);
}

function SetNetworkID(NameID)
{
    var Index = NameID.indexOf(".");
    window.NETWORK_ID = NameID;
    window.NETWORK_NAME = NameID.substr(0, Index);
    window.SHARD_NAME = NameID.substr(Index + 1);
}

function OnLoad()
{
    if(Storage.getItem("NETWORK_ID"))
    {
        NETWORK_ID = Storage.getItem("NETWORK_ID");
    }
    $("idCurNetwork").value = NETWORK_ID;
    
    LoadValues();
    
    InitDappsCard();
    
    StartWebWallet();
    
    setInterval(UpdatesExplorerData, 3000);
    setInterval(UpdatesAccountsData, 2000);
    
    DoStableScroll();
    window.onmousemove = function (event)
    {
        SetDiagramMouseX(event);
    };
    
    if(window.location.hash)
    {
        var LocationPath = window.location.hash.substr(1);
        if(LocationPath)
        {
            SelectTab(LocationPath);
        }
    }
    
    FromCopyOnLoad();
}
function FromCopyOnLoad()
{
    var Str = sessionStorage["COPY-TX"];
    if(Str && Str !== "undefined")
    {
        var Data = JSON.parse(Str);
        $("idAccount").value = Data.From;
        $("idTo").value = Data.To;
        $("idSumSend").value = Data.Sum;
        $("idDescription").value = Data.Description;
        SetVisibleBlock("idCloseButton", 1);
    }
    delete sessionStorage["COPY-TX"];
}

function ChangeNetwork(bStart)
{
    FirstAccountsData = 1;
    CONNECT_STATUS = 0;
    
    SetNetworkID($("idCurNetwork").value);
    
    Storage.setItem("NETWORK_ID", NETWORK_ID);
    
    if(bStart)
        StartWebWallet();
    else
        ConnectWebWallet();
}

function UpdateTabs()
{
    UpdatesExplorerData();
    UpdatesAccountsData();
    ViewDapps();
}

function OnFindServer()
{
    var Item=GetMainServer();
    if(!Item)
    {
        CONNECT_STATUS =  - 1;
        SetStatus("Server not found");
        Storage.setItem("MainServer", undefined);
        return;
    }
    
    CONNECT_STATUS = 2;
    if(IsLocalClient())
    {
        Storage.setItem("MainServer", JSON.stringify({ip: Item.ip, port: Item.port}));
    }

    FillCurrencyAsync("idCurrencyList");
    
    SetDataUpdateTime(10);
    
    UpdateTabs();
}

function LoadValues()
{
    var StrDelList = Storage.getItem("DelList");
    if(StrDelList)
        DelList = JSON.parse(StrDelList);
    if(typeof DelList !== "object")
        DelList = {};
    
    if(LoadValuesByArr(SaveIdArr))
    {
        ChangeLang();
    }
    InitPrivKey();
}

function SaveValues()
{
    SaveValuesByArr(SaveIdArr);
    Storage.setItem("DelList", JSON.stringify(DelList));
}

var TabArr = [{name:"TabWelcome"}, {name:"TabWalletSet"}, {name:"TabKeySet"}, {name:"TabAccounts"}, {name:"TabSend"}, {name:"TabDapps"},
    {name:"TabExplorer"}, {name:"TabLogo"}];

function SelectTab(name)
{
    SetStatus("");
    $("idCurTabName").value = name;
    SetVisibleTab();
    SaveValues();
    OnSelectTab(name);
    
    if(!isMobile())
        if(name && history.pushState)
            history.pushState(null, null, "#" + name);
}

function OnSelectTab(name)
{
    if(!GetPrivKey())
    {
        GenerateKeyNew();
        SetPrivKey($("idPrivKeyEdit").value.trim());
        InitPrivKey();
    }
    
    if(name === "TabAccounts" || name === "TabSend")
    {
        UpdatesAccountsData(1);
    }
    else
        if(name === "TabExplorer")
        {
            UpdatesExplorerData(1);
        }
        else
            if(name === "TabDapps")
            {
                ViewDapps();
            }
}

function SetVisibleTab()
{
    var CurTabName = $("idCurTabName").value;
    if(!CurTabName || CurTabName === "undefined")
        CurTabName = TabArr[0].name;
    
    var str;
    for(var i = 0; i < TabArr.length; i++)
    {
        var name = TabArr[i].name;
        var Item = $(name);
        if(!Item)
            continue;
        if(CurTabName === name)
        {
            Item.style.display = 'block';
            str = "active";
        }
        else
        {
            Item.style.display = 'none';
            str = "";
        }
        
        var ItemM = $("M" + name);
        if(ItemM)
        {
            if(str)
            {
                ItemM.classList.add(str);
            }
            else
            {
                ItemM.classList.remove("active");
            }
        }
    }
}

function IsPrivateMode()
{
    var PrivKeyStr = GetPrivKey();
    return IsPrivateKey(PrivKeyStr);
}


function SetVisiblePrivKey()
{
    if(!$("idPrivKeyStatic"))
        return;
    
    if(bShowPrivKey)
        $("idPrivKeyStatic").innerText = GetPrivKey();
    else
        $("idPrivKeyStatic").innerText = "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••";
}
var bShowPrivKey = 0;
function OnVisiblePrivKey()
{
    bShowPrivKey = !bShowPrivKey;
    SetVisiblePrivKey();
}

function SetPubKeyHTML()
{
    if($("idPubKeyStatic"))
        $("idPubKeyStatic").innerText = GetPubKey();
}

function GenerateKeyNew()
{
    var arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    var Str = GetHexFromArr(sha3(arr));
    $("idPrivKeyEdit").value = Str;
}
function OnGenerateKeyNew()
{
    GenerateKeyNew();
}
function DoHashing()
{
    var Str = GetHexFromArr(sha3($("idPrivKeyEdit").value));
    $("idPrivKeyEdit").value = Str;
}
function OnEditPrivKey()
{
}

function OnPrivKeyOK()
{
    var StrKey=$("idPrivKeyEdit").value.trim();
    if(!IsCorrectPrivKey(StrKey))
    {
        return SetError("Error private key hex string");
    }

    SetPrivKey(StrKey);

    InitPrivKey();
    SelectTab('TabKeySet');
    ClearSend();
}


function OnPrivKeyCancel()
{
    InitPrivKey();
    SelectTab('TabKeySet');
}


var FirstAccountsData = 1;
var CurrentPage = 0;
var ROWS_ON_PAGE=20;
var AccountsCount =  - 1;
var DataUpdateTime = 0;

function SetDataUpdateTime(PeriodSec)
{
    DataUpdateTime = Date.now() + 1000 * PeriodSec;
}
function UpdatesAccountsData(bGetData)
{
    if(IsVisibleClass(".accounts-info__add"))
        return;
    
    if(!CONNECT_STATUS)
        return;
    
    var Str = GetPubKey();
    if(!Str)
    {
        return;
    }
    
    if(!bGetData)
    {
        if(IsVisibleBlock("TabAccounts") || DataUpdateTime >= Date.now())
        {
            bGetData = 1;
        }
        if(!bGetData)
            return;
    }
    

    GetData("/GetAccountListByKey", {Key:Str, Session:glSession, AllData:FirstAccountsData, BalanceArr:1,CurrentPage:CurrentPage}, async function (Data,responseText)
    {
        if(!Data)
            return;

        await CheckNetworkID(Data);

        AccountsCount = Data.Accounts;
        if(!AccountsCount)
        {
            if(Data.arr)
                AccountsCount = Data.arr.length;//old version API-1
            else
                AccountsCount=0;
        }
        ROWS_ON_PAGE = Data.ROWS_ON_PAGE;
        ViewAccountPages();

        if(!Data.result || !Data.arr)
            return;
        SetVisibleClass(".accounts-info__acc-list", AccountsCount);
        SetVisibleClass(".accounts-info__empty", !AccountsCount);
        SetVisibleClass(".accounts-info__add2", 0);
        if(AccountsCount)
        {
            SetAccountsCard(Data, responseText);
        }
        FirstAccountsData = 0;
    });
}

function ViewAccountPages()
{
    if(!ROWS_ON_PAGE)
        return;
    var Str="";
    var Pages=1+Math.floor(AccountsCount/ROWS_ON_PAGE);
    if(Pages>1)
    for(var i=0;i<Pages;i++)
    {
        Str+=`<div class="btn page ${CurrentPage===i?"currentpage":""}" onclick="OnViewPageAccount(${i})">Page ${i+1}</div>`;
    }
    if(idPagesList.WasinnerHTML!==Str)
    {
        idPagesList.WasinnerHTML=Str;
        idPagesList.innerHTML=Str;
    }
}

function OnViewPageAccount(Num)
{
    CurrentPage=Num;
    UpdatesAccountsData(1);
}

function ViewAddAccount(Visible)
{
    $("idAccountName").value = "";
    SetVisibleClass(".accounts-info__add", Visible);
    SetVisibleClass(".accounts-info__acc-list", !Visible);
    SetVisibleClass(".accounts-info__empty", 0);
}
function OnViewAddAccount()
{
    OnChangeAccName();
    ViewAddAccount(1);
    $("idAccountName").focus();
}

function CancelAddAccount()
{
    ViewAddAccount(0);
}
function OnChangeAccName()
{
    $("idBtAddAccount").disabled = !($("idAccountName").value.length);
}
function CancelCreateAccount()
{
}
function ViewTokenCurrencyInput()
{
    SetVisibleBlock("idRowTokenCurrency",!IsVisibleBlock("idRowTokenCurrency"));
}
function OnAddAccount()
{
    var Name = $("idAccountName").value;
    if(!Name)
    {
        SetError("Enter the account name");
        return;
    }
    var Smart = 0;
    var Currency = FindCurrencyNum($("idCurrency").value);
    
    SendTrCreateAccWait(Currency, GetPubKey(), Name, Smart);
    SetVisibleClass(".accounts-info__add", 0);
    SetVisibleClass(".accounts-info__add2", 1);
}


var WasAccountsDataStr;
var StrAccCardTemplate;
function InitAccountsCard()
{
    if($("AccCardTemplate"))
    {
        StrAccCardTemplate = $("AccCardTemplate").outerHTML;
        $("AccCardTemplate").outerHTML = "";
    }
}


async function SetAccountsCard(Data,AccountsDataStr)
{
    
    if(!Data || !Data.result)
    {
        return;
    }
    if(AccountsDataStr === WasAccountsDataStr)
        return;
    WasAccountsDataStr = AccountsDataStr;
    
    var arr = [];
    for(var i = 0; Data.arr && i < Data.arr.length; i++)
    {
        var Item = Data.arr[i];
        if(!DelList[Item.Num])
        {
            arr.push(Item);
        }
    }
    var Select = $("idAccount");
    if(!Select.options)
        return;
    
    if(arr.length !== Select.options.length)
    {
        var options = Select.options;
        options.length = arr.length;
    }
    
    MaxBlockNum = GetCurrentBlockNumByTime();
    
    $("idListCount").innerText = AccountsCount;
    
    var StrList = "";
    

    var dataList = $("idToList");
    if(dataList)
        dataList.innerHTML = "";

    var TotalCountNFT=0;
    var ListTotal = {};
    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        Item.MyAccount = true;
        //console.log(Item)
        var Num = ParseNum(Item.Num);
        SetMapAccount(Item);

        var option = Select.options[i];
        var StrText = GetAccountText(Item, Num, 1);
        if(option.text !== StrText)
            CheckNameAccTo();
        option.value = Num;
        option.text = StrText;
        var Str = StrAccCardTemplate;
        Str = Str.replace("AccCardTemplate", "idCard" + Item.Num);
        Str = Str.replace(/\$Item.Num/g, Item.Num);
        var Str1, Str2 = "";
        if(Item.Value.SumCOIN || Item.Value.SumCENT)
        {
            Str1 = STRING_FROM_COIN(Item.Value);
        }
        else
        {
            Str1 = "";
        }
        var StrCurrencyName;
        if(Str1==="")
        {
            Str = Str.replace("$value.icon_currency_class", "hide");
            StrCurrencyName="";
        }
        else
        {
            StrCurrencyName = await ACurrencyNameItem(Item);
        }

        Str = Str.replace("$Value.SumCOIN", Str1);
        Str = Str.replace("$Value.SumCENT", Str2);
        Str = Str.replace("$Value.CurrencyName", StrCurrencyName);

        var CurrencyObj = Item.CurrencyObj;
        if(!CurrencyObj)
            CurrencyObj = {IconBlockNum:0, Num:0};
        var CurrencyPath = RetIconPath(CurrencyObj, 1);
        Str = Str.replace("$value.currencyiconpath", "src='" + CurrencyPath + "'");


        // Str = Str.replace("$value.currencyiconpath", "src='" + RetIconPath(CurrencyObj, 1) + "'");
        // var CurrencyPath = RetIconPath(CurrencyObj);
        // if(CurrencyPath.substr(0, 6) !== "/file/")
        //     Str = Str.replace("prod-card__currency--with-dot", "");
        
        Str = Str.replace("$Item.Name", escapeHtml(Item.Name));
        
        var SmartObj = Item.SmartObj;
        if(!SmartObj)
            SmartObj = {Name:"", Num:0, HTMLLength:0};
        SmartObj.IconPath = RetIconPath(SmartObj, 0);
        if(SmartObj.IconBlockNum)
            Str = Str.replace("$smartobj.iconpath", "src='" + SmartObj.IconPath + "'");
        else
            Str = Str.replace("$smartobj.iconclass", "hidden");
        Str = Str.replace("$SmartObj.Name", escapeHtml(SmartObj.Name));
        Str = Str.replace(/\$SmartObj.Num/g, SmartObj.Num);
        Str = Str.replace(/\$SmartObj.HTMLLength/g, SmartObj.HTMLLength);

        if(!Item.SmartObj)
        {
            Str = Str.replace("prod-card__button", "prod-card__nobutton");
        }
        Str = Str.replace("prod-card__link--connect", "myhidden");
        //Str = Str.replace("prod-card__link--dapp", "myhidden");
        //Str = Str.replace("prod-card__dropdown", "prod-card__dropdown nodapp");


        var RetTotal=await CalcTotalAmountERC(Item,ListTotal);
        var StrCountTokens="";
        var StrOpenNFTPage="";
        if(RetTotal.CountTokens)
            StrCountTokens="Tokens count: <b>"+RetTotal.CountTokens+"</b> <div class='tokens_imgs'>"+RetTotal.ImgTokens+"</div>";
        if(RetTotal.CountNFT)
        {
            StrCountTokens+=" NFT: <b>"+RetTotal.CountNFT+"</b> <div class='tokens_imgs'>"+RetTotal.ImgNFTs+"</div>";
            StrOpenNFTPage="<button class='btn btn--white btn-nft-open' onclick='OpenTokensPage(" + Item.Num + ")'>Show NFT</button>";
        }

        Str = Str.replace("$Item.COUNT_TOKENS", StrCountTokens);
        Str = Str.replace("$Item.LIST_TOKENS", RetTotal.ListTokens);
        Str = Str.replace("$Item.OPEN_NFT_PAGE", StrOpenNFTPage);


        TotalCountNFT+=RetTotal.CountNFT;


        StrList += Str;
        Str = "";
        

        
        if(!dataList)
            continue;
        var Options = document.createElement('option');
        Options.value = Num;
        Options.label = StrText;
        dataList.appendChild(Options);
    }



    idAccountsList.innerHTML = StrList;
    StrList = "";

    for(var key in AccToggleMap)
        SetToggleClass($(key),1);





    var StrTotal = "";
    for(var key in ListTotal)
    {
        var Total = ListTotal[key];
        StrTotal += '<div class="total-info__item"><dt>' + Total.Name + '</dt><dd>' + STRING_FROM_COIN(Total) + '</dd></div>';
    }
    $("idTotalList").innerHTML = StrTotal;
    
    var CurrentValue = LoadMapAfter["idAccount"];
    if(CurrentValue)
    {
        Select.value = CurrentValue;
        delete LoadMapAfter["idAccount"];
    }



    UpdateTokenList();
    ConvertTokenImages();
}




var glWasSmart;
var glWasNumAccount;
function ChangeSmartLocal(NumAccount,WasSmart)
{
    if(!IsPrivateMode())
    {
        SetError("Pls, open wallet");
        return 0;
    }
    
    openModal('idSmartEnter');
    if(WasSmart)
        $("idSmartNum").value = WasSmart;
    else
        $("idSmartNum").value = "";
    $("idSmartNum").focus();
    glWasNumAccount = NumAccount;
    glWasSmart = WasSmart;
}

function DoSetSmartLocal()
{
    DoChangeSmart(glWasNumAccount, glWasSmart, $("idSmartNum").value);
    closeModal();
}

function ConnectSmart(NumAccount)
{
    ChangeSmartLocal(NumAccount, 0);
}
function SetSmart(NumAccount,WasSmart)
{
    ChangeSmartLocal(NumAccount, WasSmart);
}
function DelSmart(NumAccount,WasSmart)
{
    SetSmartToAccount(NumAccount, 0);
}
function RemoveAccount(NumAccount)
{
    DoConfirm("Remove account","Confirm delete account: "+NumAccount);
    glConfirmF = function OnRemoveAccount()
    {
        DoRemoveAccount(NumAccount);
        HideAccount(NumAccount);
    }

}

function HideAccount(NumAccount)
{
    DelList[NumAccount] = 1;
    AccountsCount = 0;
    WasAccountsDataStr = "";
    SaveValues();
    FirstAccountsData = 1;
    
    UpdatesAccountsData(1);
}
function RestoreAllAccounts()
{
    DelList = {};
    HideAccount(0);
    FirstAccountsData = 1;
    UpdatesAccountsData(1);
}

function UpdatesExplorerData(bGetData)
{
    var bDiagram = 0;
    if(IsVisibleBlock("TabExplorer") && IsVisibleBlock("idStatBlock"))
        bDiagram = 1;
    
    if(!bGetData)
    {
        if(bDiagram || DataUpdateTime >= Date.now())
        {
            bGetData = 1;
        }
    }
    
    if(!bGetData)
        return;
    
    var WasSendTr = 0;
    for(var key in MapSendTransaction)
    {
        var Item = MapSendTransaction[key];
        if(!Item.WasProcess && !Item.final)
        {
            WasSendTr = 1;
            break;
        }
    }
    
    GetData("GetCurrentInfo", {Diagram:bDiagram, ArrLog:WasSendTr}, function (Data)
    {
        if(!Data || !Data.result)
            return;
        
        SetExplorerData(Data);
        SetBlockChainConstant(Data);
        
        var arr = Data.arr;
        for(var i = 0; arr && i < arr.length; i++)
        {
            var ItemServer = arr[i];
            var ItemClient = DiagramMap[ItemServer.name];
            if(!ItemClient || ItemClient.Extern)
                continue;
            
            ItemClient.arr = ItemServer.arr;
            ItemClient.AvgValue = ItemServer.AvgValue;
            ItemClient.steptime = ItemServer.steptime;
            ItemClient.fillStyle = "white";
            
            DrawDiagram(ItemClient);
        }
    });
}
var FirstCallDiagram = 1;

function SetExplorerData(Data)
{
    if(!Data || !Data.result)
        return;
    if(!$("idBHeight"))
        return;
    
    CONFIG_DATA = Data;
    window.FIRST_TIME_BLOCK = Data.FIRST_TIME_BLOCK;
    window.CONSENSUS_PERIOD_TIME = Data.CONSENSUS_PERIOD_TIME;
    if(FirstCallDiagram)
    {
        ViewEnd(DefAccounts, CONFIG_DATA.MaxAccID, 1);
        ViewEnd(DefBlock, CONFIG_DATA.MaxNumBlockDB, 1);
        InitDiagram();
    }
    FirstCallDiagram = 0;
    
    var StrVersion = "" + Data.VersionNum;
    $("idBHeight").innerText = Data.MaxNumBlockDB;
    $("idBVersion").innerText = StrVersion;
    $("idWVersion").innerText = WEB_WALLET_VERSION;
    
    SetArrLog(Data.ArrLog);
}

function SetArrLog(arr)
{
    if(!arr)
        return;
    
    arr.sort(function (a,b)
    {
        return a.id - b.id;
    });
    
    for(var i = 0; i < arr.length; i++)
    {
        var Item = arr[i];
        if(!Item.final)
            continue;
        var TR = MapSendTransaction[Item.key];
        if(TR && !TR.WasError && Item.final < 0)
        {
            TR.WasError = 1;
            SetError(Item.text);
        }
        
        if(TR && !TR.WasProcess && Item.final)
        {
            TR.WasProcess = 1;
            if(Item.final > 0 && !TR.WasError)
                SetStatus(Item.text);
            
            if(typeof Item.text==="string" && Item.text.indexOf("Add to blockchain") >= 0)
            {
                if(TR.Run)
                {
                    TR.Run(TR);
                    TR.Run = undefined;
                }
            }
            
            var Account = MapCheckTransaction[Item.key];
            if(Account)
            {
                delete MapCheckTransaction[Item.key];
                Account.NextSendTime = 0;
            }
        }
    }
    CheckSending();
}

var DiagramArr = [{name:"MAX:ALL_NODES", text:"Number of public nodes", value:0, red:"#1d506b", MouseText:" nodes", CountNameX:10},
    {name:"MAX:HASH_RATE_B", text:"HashRate, Tera hash/s", value:0, red:"#286b16", MathPow:2, MathDiv:1024 * 1024 * 1024 * 1024,
    KPrecision:10, NoTextMax:1, MouseText:" T h/s", CountNameX:10}, ];

function InitDiagram()
{
    var width = 1120;
    if(isMobile())
    {
        for(var i = 0; i < DiagramArr.length; i++)
            DiagramArr[i].CountNameX = 4;
        width = 320;
    }
    InitDiagramByArr(DiagramArr, width);
}

function ViewCounters(This)
{
    var BlockName = "idStatBlock";
    var element = $(BlockName);
    
    var bVisible = IsVisibleBlock(BlockName);
    if(!bVisible)
        MoveUp(element);
    SetVisibleBlock(BlockName, !bVisible);
    var ResVisible = IsVisibleBlock(BlockName);
    if(This && This.className)
    {
        This.className = This.className.replace("btpress", "");
        if(ResVisible)
            This.className += " btpress";
    }
    
    if(!bVisible)
    {
        UpdatesExplorerData(1);
    }
}


setInterval(CheckSending, 1000);

function OpenAddressBook()
{
    return;
    var bVisible = IsVisibleBlock("idAddressBook");
    SetVisibleBlock("idAddressBook", !bVisible);
}

function CloaseAddressBook()
{
    OpenAddressBook();
}

function ClearSend()
{
    $("idAccount").value = "";
    $("idTo").value = "";
    $("idSumSend").value = "";
    $("idDescription").value = "";
    $("idNameTo2").innerText = "";


    UpdateTokenList();
}


function downloadKey(fieldID)
{
    var text = document.getElementById(fieldID).value;
    var blob = new Blob([text], {type:"text/plain"});
    var anchor = document.createElement("a");
    anchor.download = "tera-key.txt";
    anchor.href = window.URL.createObjectURL(blob);
    anchor.target = "_blank";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

var glWasModal = 0;
// function openModal(id)
// {
//     glWasModal = 1;
//     var modal = document.querySelector("#" + id);
//     var overlay = document.querySelector("#overlay");
//     modal.style.display = "block";
//     overlay.style.display = "block";
// }
// function closeModal()
// {
//     glConfirmF = undefined;
//
//     glWasModal = 0;
//     var modals = document.querySelectorAll(".modal,#overlay,#idConfirm,#idOverlay");
//     modals.forEach(function (item)
//     {
//         item.style.display = "none";
//     });
// }

function showMenu(Num)
{
    var menu = document.querySelector("#idBt" + Num);
    if(menu.style.display === "none")
    {
        menu.style.display = "block";
    }
    else
    {
        menu.style.display = "none";
    }
}
function closeMenu(Num)
{
    var menu = document.querySelector("#idBt" + Num);
    setTimeout(function ()
    {
        menu.style.display = "none";
    }, 115);
}

function UploadKey(id)
{
    var file = $(id).files[0];
    var reader = new FileReader();
    reader.onload = function ()
    {
        if(reader.result.byteLength !== 64)
            SetError("Error file length (" + reader.result.byteLength + ")");
        else
        {
            var view = new Uint8Array(reader.result);
            var Key = Utf8ArrayToStr(view);
            SetStatus("OK");
            ToLog("Result: " + Key);
            SetPrivKey(Key);
            InitPrivKey();
            $(id).value = "";
        }
    };
    reader.readAsArrayBuffer(file);
}


function InitPrivKey()
{
    $("idPrivKeyEdit").value = GetPrivKey();
    SetPubKeyHTML();
    SetVisiblePrivKey();
    if($("idSave2"))
        $("idSave2").disabled = !IsPrivateMode();
}

async function SendMobileBefore()
{
    if($("idSendButton").disabled)
        return;

    var CurToken=GetSelectedToken();
    if(!CurToken)
        return;

    var FromID = ParseNum($("idAccount").value);
    var Item = MapAccounts[FromID];
    if(!Item)
    {
        SetError("Error FROM ID");
        return;
    }
    $("idConfirmFromID").innerText = Item.Num;
    $("idConfirmFromName").innerText = Item.Name + " (" + STRING_FROM_COIN(Item.Value) + " " + await ACurrencyNameItem(Item) + ")";
    
    var ToID = ($("idTo").value);
    $("idConfirmToID").innerText = ToID;
    
    var Item2 = MapAccounts[ToID];
    if(Item2)
    {
        $("idConfirmToName").innerText = Item2.Name + " (" + STRING_FROM_COIN(Item2.Value) + " " + await ACurrencyNameItem(Item2) + ")";
    }
    else
    {
        $("idConfirmToName").innerText = "";
    }

    $("idTokenHolder").innerHTML = GetCopyNFTCard(CurToken.element_id,CurToken.Token,CurToken.ID,idSumSend.value);
    //SetVisibleBlock("idTokenHolder",1);

    var CoinAmount = COIN_FROM_FLOAT($("idSumSend").value);
    $("idConfirmAmount").innerText = STRING_FROM_COIN(CoinAmount);
    $("idConfirmCurrency").innerText = CurToken.Token;

    $("idConfirmDescription").innerText = $("idDescription").value;
    
    SetVisibleClass(".send-page__setting", 0);
    SetVisibleClass(".send-page__confirm", 1);
    
    SetStatus("");
    UpdatesAccountsData(1);
    UpdatesExplorerData(1);
}

function OKSend()
{
    // if(IsERCMode())
    // {
    //     SendToken();
    //     closeModal();
    // }
    // else
    SendMoney(function ()
    {
        if(glWasModal)
        {
            ClearSend();
            SaveValues();
        }
        
        closeModal();
    });
    SetDataUpdateTime(20);
    
    CancelSend();
}

function CancelSend()
{
    SetVisibleClass(".send-page__setting", 1);
    SetVisibleClass(".send-page__confirm", 0);
}


function SetNewPassword()
{
    var Str1 = $("Password1").value.trim();
    var Str2 = $("Password2").value.trim();
    if(Str1 !== Str2)
    {
        SetError("Wrong passwords");
        return;
    }
    
    var Key = GetPrivKey();
    SetWalletPassword(Str1);
    
    SetPrivKey(Key);
    SetPubKeyHTML();
    
    closeModal();
    $("Password1").value = "";
    $("Password2").value = "";
    if(Str1)
        SetStatus("Password changed successfully");
    else
        SetStatus("Password has been reset successfully");
    SetUsePassword(Str1);
}

var MultipleMode = 0;

function MyOpenWallet(bNoCheck)
{
    var Result = MyOpenWalletInner(bNoCheck);
    if(!Result)
        OpenPasswordForm();
}
function MyOpenWalletInner(bNoCheck)
{
    var Str = $("Password").value.trim();
    if(!Str)
    {
        SetError("Type password, pls");
        return 0;
    }
    $("Password").value = "";
    
    if(Str.substr(0, 11) === "--subwallet")
    {
        Str = Str.substr(11);
        if(Str === " off")
        {
            Storage.setItem("USESUBWALLET", 0);
            SetStatus("Set off subwallet mode");
        }
        else
        {
            Storage.setItem("USESUBWALLET", 1);
            SetStatus("Set subwallet mode");
        }
        SetUsePassword(1);
        return 1;
    }
    if(Str === "--reset")
    {
        SetWalletPassword("");
        OpenWalletKey();
        SetUsePassword(0);
        NotModalClose = 0;
        closeModal();
        return 1;
    }
    
    SetWalletPassword(Str);
    OpenWalletKey();
    
    SetStatus("");
    var PrivKey = GetArrFromHex(GetPrivKey());
    if(bNoCheck)
    {
        MultipleMode = 1;
        SetVisibleBlock("idKeyEdit", 0);
        
        SetVisibleBlock("idLoad2", 0);
    }
    else
    {
        var WasPubKey = Storage.getItem("WALLET_PUB_KEY_MAIN");
        var TestPubKey = GetHexFromArr(SignLib.publicKeyCreate(PrivKey, 1));
        if(WasPubKey !== TestPubKey)
        {
            SetWalletPassword("");
            SetError("Wrong password");
            return 0;
        }
        SetStatus("Password ok");
        
        MultipleMode = 0;
        SetVisibleBlock("idKeyEdit", 1);
        
        SetVisibleBlock("idLoad2", 1);
    }
    
    NotModalClose = 0;
    closeModal();
    InitPrivKey();
    SetPubKeyHTML();
    
    SetUsePassword(1);
    
    Storage.setItem(WALLET_KEY_LOGIN, GetHexFromArr(PrivKey));
    setTimeout(function ()
    {
        Storage.setItem(WALLET_KEY_LOGIN, "");
    }, 10);
    Storage.setItem(WALLET_KEY_EXIT, "");
    
    return 1;
}

function SetUsePassword(bUse)
{
    document.documentElement.style.setProperty('--fill--password', bUse ? 'red' : 'white');
    SetVisibleBlock("idWalletExit", !!bUse);
    
    SetVisibleBlock("idEntrance", Storage.getItem("USESUBWALLET") === "1");
}

function OpenPasswordForm()
{
    openModal('password-modal-enter');
    glConfirmF = MyOpenWallet;
    $("Password").focus();
}

function DoExitWallet()
{
    ClearSend();
    SaveValues();
    NotModalClose = 1;
    $("Password").value = "";
    SetWalletPassword("");
    OpenWalletKey();
    OpenPasswordForm();
    
    Storage.setItem(WALLET_KEY_EXIT, Date.now());
}

var StrDappCardTemplate="";
var StrDappRowCardTemplate="";
var CardMapList = {};
function InitDappsCard()
{
    if($("DappRowCardTemplate"))
    {
        StrDappRowCardTemplate = $("DappRowCardTemplate").outerHTML;
        $("DappRowCardTemplate").outerHTML = "";
    }
    if($("DappCardTemplate"))
    {
        StrDappCardTemplate = $("DappCardTemplate").outerHTML;
    }
}

function ViewDapps()
{
    ViewCurrent(DefDapps);
    GetData("/GetDappCategory", {}, function (Data)
    {
        if(Data && Data.result && Data.arr)
        {
            var arr = Data.arr;
            for(var i = 0; i < arr.length; i++)
            {
                var key = arr[i];
                arr[i] = {sort:MapCategory[key].toUpperCase(), text:MapCategory[key], value:key};
            }
            arr.push({sort:"-", text:"Choose the category", value:0});
            FillCategoryAndSort("idCategory", arr);
        }
    });
}

function FillDappCard(Str,Item)
{
    CardMapList[Item.Num] = Item;
    
    Str = Str.replace(/\$Item.Num/g, Item.Num);
    Str = Str.replace("$Item.Name", escapeHtml(Item.Name));
    Str = Str.replace("$Item.Description", escapeHtml(Item.Description));
    Str = Str.replace("$Item.Owner", Item.Owner);
    
    //if(!Item.TokenGenerate)
    Str = Str.replace("dapp-modal__ok-token", "myhidden");
    
    Str = Str.replace(/\$Item.HTMLLength/g, Item.HTMLLength);
    Str = Str.replace("$item.iconpath", "src='" + RetIconPath(Item, 0) + "'");
    return Str;
}

function RetDappCard(Item)
{
    var Str = FillDappCard(StrDappRowCardTemplate, Item);
    Str = Str.replace("DappRowCardTemplate", "idCard" + Item.Num);
    return Str;
}

function OpenDappCard(Num)
{
    var Item = CardMapList[Num];
    if(!Item)
        return;
    
    var Str = FillDappCard(StrDappCardTemplate, Item);
    Str = Str.replace("$Item.Account", RetBaseAccount(Item));
    Str = Str.replace("$Item.BlockNum", RetOpenBlock(Item.BlockNum,  - 1));
    Str = FillDappCategory(Str, Item, 1);
    Str = FillDappCategory(Str, Item, 2);
    Str = FillDappCategory(Str, Item, 3);
    
    $("DappCardTemplate").outerHTML = Str;
    openModal('DappCardTemplate');
}
function OpenOnlyDapp(Num,HTMLLength)
{
    if(HTMLLength)
    {
        OpenDapps(Num, 0, HTMLLength);
        closeModal();
    }
}

function FillDappCategory(Str,Item,Num)
{
    var Value = Item["Category" + Num];
    if(Value && MapCategory[Value])
    {
        Str = Str.replace("$Item.Category" + Num, MapCategory[Value]);
    }
    else
    {
        Str = Str.replace("dappcategory" + Num, "myhidden");
    }
    return Str;
}

function MyToggleList(e)
{
    var item = e.target;
    
    while(true)
    {
        if(!item)
            break;
        if(!item.classList)
            break;
        
        if(item.onclick && item.onclick !== MyToggleList)
            break;
        
        if(item.classList.contains("find--switch"))
        {
            if(item.classList.contains("prod-card--switch"))
            {
                AccToggleMap[item.id]=1;
                SetToggleClass(item,1);
            }
            else
            {
                delete AccToggleMap[item.id];

                SetToggleClass(item,0);
            }
            
            break;
        }
        
        item = item.parentNode;
    }
}

function SetToggleClass(item,bValue)
{
    if(!item)
        return;

    if(bValue)
    {
        item.classList.add("prod-card--active");
        item.classList.add("prod-card--toggle");
        item.classList.remove("prod-card--switch");
    }
    else
    {
        item.classList.remove("prod-card--active");
        item.classList.remove("prod-card--toggle");
        item.classList.add("prod-card--switch");
    }
}

function OpenHistoryPage(Num)
{
    if(!UseInnerPage() || isOS())
    {
        OpenWindow("./history.html#" + Num);
        return;
    }
    
    SetVisibleFrame("idHistoryPage", 1);
    SendMessage("HistoryPage", {IsTeraWallet:1,Account:Num, FrameName:"idHistoryPage"});
    closeModal();
}

function OpenBlockViewerPage(Num)
{
    if(!UseInnerPage() || isOS())
    {
        OpenWindow("./blockviewer.html#" + Num);
        return;
    }
    
    SetVisibleFrame("idBlockViewerPage", 1);
    SendMessage("BlockViewerPage", {IsTeraWallet:1,BlockNum:Num, FrameName:"idBlockViewerPage"});
    closeModal();
}

function AddFrame(name,filename)
{
    var iframe = document.createElement('iframe');
    iframe.name = name;
    iframe.src = filename;
    iframe.sandbox = "allow-scripts allow-same-origin allow-popups";
    iframe.id = "id" + name;
    iframe.style = "display: none";
    document.getElementsByTagName('body')[0].appendChild(iframe);
}

function SetVisibleFrame(name,bVisible)
{
    SetVisibleBlock("idMainHeader", !bVisible);
    SetVisibleBlock("idMain", !bVisible);
    SetVisibleBlock(name, bVisible);
    if(bVisible && $(name))
        $(name).focus();
}

function SendMessage(name,Data)
{
    var win = window.frames[name];
    win.postMessage(Data, "*");
}
function OnMessage(event)
{
    var Data = event.data;
    if(!Data || typeof Data !== "object")
        return;
    
    var cmd = Data.cmd;
    if(cmd === "Close")
    {
        SetVisibleFrame(Data.FrameName, 0);
    }
    else
        if(cmd === "OpenBlockViewerPage")
        {
            SetVisibleFrame(Data.FrameName, 0);
            OpenBlockViewerPage(Data.BlockNum);
        }
}





//------------------------------------------------------------------------------ LANG SUPPORT

var LangItems = [];

function InitLangItems(ArrItems)
{
    var tags = ["TITLE", "BUTTON", "DIV", "INPUT", "TH", "TD", "SPAN", "A", "H1", "H2", "H3", "H4", "H5", "P", "DT"];
    var Map2 = {};
    for(var n = 0; n < tags.length; n++)
    {
        var tagname = tags[n];
        var elems = document.getElementsByTagName(tagname);
        for(var elem, i = 0; elem = elems[i++]; )
        {
            var Text = elem.innerText;
            if(elem.innerHTML !== Text)
                continue;
            if(!Text)
                continue;
            
            if(Text.substr(0, 1) === "$")
                continue;
            
            if(Text.toUpperCase() == Text.toLowerCase())
                continue;
            
            ArrItems.push({key:Text, elem:elem});
        }
    }
}

function DoLangItems(ArrItems,Map)
{
    var Map2 = {};
    for(var n = 0; n < ArrItems.length; n++)
    {
        var key = ArrItems[n].key;
        var elem = ArrItems[n].elem;
        if(Map)
        {
            var TextNew = Map[key];
            if(TextNew === undefined)
            {
                Map[key] = key;
                TextNew = key;
            }
            
            if(elem.innerText !== TextNew)
            {
                elem.innerText = TextNew;
            }
        }
        else
        {
            Map2[key] = key;
        }
    }
    return Map2;
}

function DoLangScript()
{
    InitLangItems(LangItems);
    LangMap["ENG"] = DoLangItems(LangItems);
    
    FillSelect("idLang", LangMap, "KEY");
}

function ChangeLang()
{
    if(!$("idLang"))
        return;
    
    var key = $("idLang").value;
    if(!key)
    {
        key = "ENG";
        $("idLang").value = key;
    }
    DoLangItems(LangItems, LangMap[key]);
    SaveValues();
}

function GetNewLangItem()
{
    console.log(JSON.stringify(LangMap["ENG"]));
}

function OpenHelp()
{
    var Key = $("idLang").value;
    var Map = LangMap[$("idLang").value];
    var Link = Map["==HELP-LINK=="];
    if(!Link)
        Link = "https://medium.com/@evkara777/tera-cryptocurrency-wallet-types-account-creation-97735abad783";
    OpenWindow(Link);
}

var LangMap = {};
LangMap["ENG"] = {};
LangMap["RUS"] = {"TERA WALLET":"TERA КОШЕЛЕК", "Generate key":"Сгенерировать ключ", "OK":"OK", "Cancel":"Отмена", "Edit":"Редактирование",
    "Save key":"Сохран.", "+ CREATE A NEW ACCOUNT":"+ СОЗДАТЬ НОВЫЙ СЧЕТ", "Create account":"Создать счет", "Send":"Отправить",
    "CONFIRM":"Подтвердить", "Accounts":"Счета", "Account(s)":"Счет(а,ов)", "Blocks and Tx":"Блоки и Транзакции", "Counters":"Показатели",
    "Open DApp":"Открыть", "Back":"Назад", "Delete":"Удалить", "Save to book":"Сохранить в книгу", "Choose":"Выбрать", "RECONNECT":"КОННЕКТ",
    "DApps":"DApps", "ID":"ИД", "Amount":"Величина", "Cur":"Вал", "Name":"Имя", "PubKey":"Пуб.ключ", "Operation":"Операция", "Smart":"Смарт",
    "Block Num":"Ном блока", "Num":"Ном", "Date":"Дата", "Data Hash":"Хеш данных", "PowHash":"Хеш сложности", "Block Hash":"Хеш блока",
    "Bytes":"Байт", "Pow":"Сложн", "Miner":"Майнер", "(secret)":"(секрет)", "Show":"Показать", "TERA":"TERA", "Blockchain height:":"Высота блокчейна:",
    "Current create:":"Текущий блок:", "Protocol ver:":"Версия протокола:", "ID: $Item.Num":"ИД: $Item.Num", "Token generate":"Генерация токенов",
    "ACCOUNTS":"СЧЕТА", "SEND":"ОТПРАВИТЬ", "DAPPS":"ДАППС", "EXPLORER":"ПРОСМ", "ATTENTION: Before using the wallet, save the private key.":"ВНИМАНИЕ: Перед использованием кошелька сохраните приватный ключ",
    "Web-site":"Веб-сайт", "Bitcointalk":"Bitcointalk", "Twitter":"Твиттер", "Telegram":"Телеграм", "Discord":"Дискорд", "QQchat":"QQchat",
    "Buy/sell/mine TERA":"Купить/продать/майнить", "+ CREATE NEW":"+ СОЗДАТЬ", "Confirm Transaction":"Подтверждение транзакции",
    "CREATE DAPPS":"СОЗДАТЬ", "Set pass":"Установить пароль", "Unlock":"Разблокировать", "Entrance to sub-wallet":"Войти в под-кошелек",
    "Public name":"Публичное имя", "Currency":"Валюта", "Pay to:":"Получатель:", "Amount:":"Сумма:", "Description:":"Описание:",
    "Welcome to TERA Wallet":"Добро пожаловать в кошелек TERA", "Edit your wallet":"Редактирование вашего кошелька", "Key settings":"Задание ключей",
    "KEY SETTINGS":"КЛЮЧИ", "Create an account":"Создание счета", "Sending coins":"Отправка монет", "Decentralized applications (dApps)":"Децентрализованные приложения (DApps)",
    "Secure your wallet":"Безопасность вашего кошелька", "Wallet is secured":"Установлен пароль", "Total on page":"Всего", "Item.Name":"Item.Name",
    "You have no accounts yet":"У вас нет ни одного счета", "Wait 10-15 sec":"Ждите 10-15 сек", "Creating your account":"Идет создание вашего счета",
    "From:":"Отправитель:", "Set a password for protect entry":"Установите пароль для безопасности", "Enter password to unlock wallet":"Введите пароль для разблокировки кошелька",
    "From ID:":"Отправитель:", "Pay to ID:":"Получатель:", "Account":"Счет", "Owner":"Владелец", "Block num":"Ном блока", "Private key (secret)":"Приватный ключ (секретно)",
    "Load key":"Загруз.", "Create your first account and start using TERA":"Создайте свой первый счет и начните использовать TERA",
    "0 Accounts":"0 Счетов", "OWNER: {Item.Owner}":"Владелец: {Item.Owner}", "More info":"Инфо", "Public key":"Публичный ключ",
    "Enter number of dapp":"Введите номер Dapp", "Enter the dapps number that will be added to your account. Attention make sure that you trust this dapp, otherwise you may lose all funds in this account.":"Введите номер Dapp, который будет добавлен в ваш аккаунт. Внимание убедитесь, что Вы доверяете ему, в противном случае вы можете потерять все средства на этом счете.",
    "Sending Tx":"Отправка транзакции", "Wallet ver:":"Версия:", "Tera Wallet Guide...":"Руководство по Tera Wallet...", "==HELP-LINK==":"https://medium.com/@evkara777/tera-%D0%BA%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D0%BD%D1%8B%D0%B9-%D0%BA%D0%BE%D1%88%D0%B5%D0%BB%D0%B5%D0%BA-%D0%B2%D0%B8%D0%B4%D1%8B-%D1%81%D0%BE%D0%B7%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5-%D1%81%D1%87%D0%B5%D1%82%D0%B0-6402531ecc11",
};
LangMap["简体中文"] = {"TERA WALLET":"TERA 钱包", "Generate key":"生成私钥", "OK":"OK", "Cancel":"取消", "Edit":"编辑", "Save key":"保存私钥",
    "+ CREATE A NEW ACCOUNT":"+ 新建账号", "Create account":"创建账号", "Send":"发送", "SEND":"转账", "CONFIRM":"确认", "Accounts":"账号", "Account(s)":"账号",
    "Blocks and Tx":"区块和交易", "Counters":"状态统计", "Open DApp":"打开DApp", "Back":"返回", "Delete":"删除", "Save to book":"保存到地址本", "Choose":"选择",
    "RECONNECT":"重连", "DApps":"DApps", "ID":"ID", "Amount":"余额", "Cur":"币种", "Name":"名称", "PubKey":"公钥", "Operation":"操作次数", "Smart":"DApp",
    "Block Num":"区块编号", "Num":"编号", "Date":"日期", "Data Hash":"数据哈希", "PowHash":"Pow哈希", "Block Hash":"区块哈希", "Bytes":"字节", "Pow":"Pow",
    "Miner":"矿工", "(secret)":"(机密)", "Show":"显示", "TERA":"TERA", "Blockchain height:":"区块高度:", "Current create:":"最近区块:", "Protocol ver:":"协议版本:",
    "Token generate":"生成代币", "ACCOUNTS":"账号", "DAPPS":"DAPPS", "EXPLORER":"浏览器", "ATTENTION: Before using the wallet, save the private key.":"注意: 使用钱包前，务必保存好私钥。",
    "Web-site":"官网", "Bitcointalk":"创世贴", "Twitter":"推特", "Telegram":"电报", "Discord":"Discord", "QQchat":"QQ群", "Buy/sell/mine TERA":"TERA 交易/挖矿",
    "+ CREATE NEW":"+ 新建", "Confirm Transaction":"确认交易", "CREATE DAPPS":"创建DAPPS", "Set pass":"设置密码", "Unlock":"解锁", "Entrance to sub-wallet":"进入子钱包",
    "Public name":"名称", "Currency":"币种", "Pay to:":"收款:", "Amount:":"金额:", "Description:":"描述:", "Welcome to TERA Wallet":"欢迎使用TERA钱包",
    "Edit your wallet":"编辑钱包", "Key settings":"设置私钥", "KEY SETTINGS":"设置私钥", "Create an account":"创建账号", "Sending coins":"转账",
    "Decentralized applications (dApps)":"去中心化应用 (DApps)", "Secure your wallet":"设置钱包密码", "Wallet is secured":"钱包密码已设置", "Total":"总计",
    "Item.Name":"Item.Name", "You have no accounts yet":"你还没有账号", "Wait 10-15 sec":"等待10-15秒", "Creating your account":"创建你的账号",
    "From:":"付款:", "Set a password for protect entry":"设置密码保护钱包", "Enter password to unlock wallet":"输入密码解锁钱包", "From ID:":"付款ID:",
    "Pay to ID:":"收款ID:", "Account":"账号", "Owner":"拥有者", "Block num":"区块编号", "Private key (secret)":"私钥 (机密)", "Load key":"载入私钥",
    "Create your first account and start using TERA":"创建你的第一个账号，开启TERA之旅", "0 Accounts":"0 账号", "OWNER: {Item.Owner}":"拥有者: {Item.Owner}",
    "More info":"详情", "Public key":"公钥", "Tera Wallet Guide...":"TERA钱包创建指南", "==HELP-LINK==":"https://terafoundation.org/files/Tera-Wallet-cn.pdf",
};
LangMap["한글"] = {"TERA WALLET":"TERA 지갑", "Generate key":"개인 키 생성", "OK":"OK", "Cancel":"취소", "Edit":"편집", "Save key":"개인 키 저장",
    "+ CREATE A NEW ACCOUNT":"+ 새 계정 만들기", "Create account":"계정 만들기", "Send":"발송", "CONFIRM":"확인", "Accounts":"계정", "Account(s)":"계정",
    "Blocks & Tx":"블록 & 교역 번호", "Counters":"컨디션 통계", "Open DApp":" DApp을 열기", "Back":"되돌아가기", "Delete":"삭제", "Save to book":"저장",
    "Choose":"선택", "RECONNECT":"다시 연결", "DApps":"DApps", "ID":"ID", "Amount":"잔금", "Cur":"화폐", "Name":"이름", "PubKey":"공공키", "Operation":"조작 횟수",
    "Smart":"DApp", "Block Num":"블록 번호", "Num":"번호", "Date":"날짜", "Data Hash":"데이터 하희", "PowHash":"Pow하희", "Block Hash":"블록 하희",
    "Bytes":"바이트", "Pow":"Pow", "Miner":"바이트", "(secret)":"(비밀)", "Show":"쇼", "TERA":"TERA", "Blockchain height:":"블록높이:", "Current create:":"최근 블록:",
    "Protocol ver:":"프로토콜 버전:", "Token generate":"생성대폐", "ACCOUNTS":"계정", "SEND":"발송", "DAPPS":"DAPPS", "EXPLORER":"브라우저", "ATTENTION: Before using the wallet, save the private key.":"주의: 지갑을 사용하기 전에 반드시 개인 키를 저장해야 한다.",
    "Web-site":"사이트", "Bitcointalk":"비트 화폐포럼", "Twitter":"트위터", "Telegram":"전보", "Discord":"Discord", "QQchat":"QQ ", "Buy/sell/mine TERA":"TERA거래 /채광",
    "+ CREATE NEW":"+신건", "Confirm Transaction":"거래 확인", "CREATE DAPPS":" DAPPS만들기", "Set pass":"비밀번호 설정", "Unlock":"잠금 풀기", "Entrance to sub-wallet":"부속 지갑 들어가기",
    "Public name":"이름", "Currency":"화폐", "Pay to:":"지불:", "Amount:":"수량:", "Description:":"묘사:", "Welcome to TERA Wallet":"TERA 지갑을 환영합니다",
    "Edit your wallet":"지갑 편집", "Key settings":"개인 키 설정", "KEY SETTINGS":"개인 키 설정", "Create an account":"계정 만들기", "Sending coins":"동전 보내기",
    "Decentralized applications (dApps)":"분산식 응용(DApps)", "Secure your wallet":"지갑 비밀번호 설정", "Wallet is secured":"지갑 비밀번호가 설정되었습니다. ",
    "Total on page":"총계", "Item.Name":"Item.Name", "You have no accounts yet":"당신 아직 계정이 없다", "Wait 10-15 sec":" 10 -15초 기다리기", "Creating your account":"계정 만들기",
    "From:":"부터:", "\n Item.Description\n ":"\n Item.Description\n ", "Set a password for protect entry":"접근 비밀번호 설정", "Enter password to unlock wallet":"비밀번호 잠금 풀기",
    "From ID:":" ID부터:", "Pay to ID:":"ID 에게 지불:", "Account":"계정", "Owner":"소유자", "Block num":"블록 번호", "Private key (secret)":"개인 키",
    "Load key":"개인 키 불러오기", "Create your first account and start using TERA":"첫 번째 계정 만들기, TERA 의 여정을 열고", "0 Accounts":"0계정",
    "OWNER: {Item.Owner}":"소유자: {Item.Owner}", "More info":"자세", "Public key":"공공키", };
