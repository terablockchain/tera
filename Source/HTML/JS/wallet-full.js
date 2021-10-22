/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var WasInitCurrency = 0;
var CONFIG_DATA = {NotInit:1};
CONFIG_DATA.CONSTANTS = {};
var ServerBlockNumDB = 0;
var ServerCurBlockNum = 0;
var ServerTime = 0;
var MiningAccount = 0;

var WalletStatus;
var BLOCK_PROCESSING_LENGTH = 8;
var PubKeyStr;
var PrivKeyStr;
var WalletOpen;

var SERVER_IP;
var SERVER_PORT;

var CurTabName;

var TabArr = [{name:"TabAccounts", log:1}, {name:"TabSend", log:1}, {name:"TabDapps"}, {name:"TabSharding"}, {name:"TabExplorer"}];
var SaveIdArr = ["idAccount", "idTo", "idSumSend", "idDescription", "idSelStyle", "idViewAccountNum", "idViewBlockNum", "idViewJournNum",
"idViewCrossOutNum", "idViewCrossInNum", "idViewHashNum", "idViewDappNum", "idViewShardNum", "idRunText", "idViewAccountFilter",
"idBlockCount", "idBlockCount2", "idWN", "idCurTabName"];

var MaxAccID = 0;
var MaxDappsID = 0;
var MaxActNum = 0;
var MaxJournalNum = 0;
var HistoryMaxNum = 0;
var MaxCrossOutNum = 0;
var MaxCrossInNum = 0;
var MaxShardNum = 0;

var WasSetRestart = 0;

function IsPrivateMode()
{
    return IsPrivateKey(PrivKeyStr);
}

function NewPrivateKey()
{
    var arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    var Str = GetHexFromArr(sha3(arr));
    
    $("idKeyNew").value = Str;
    SetVisibleEditKeys(1);
    
    var Select = $("idTypeKey");
    Select.value = "private";
    
    SetVisibleItemByTypeKey();
}
function EditPrivateKey()
{
    if(!IsVisibleBlock("edit_keys"))
    {
        var Select = $("idTypeKey");
        if(IsPrivateMode())
        {
            $("idKeyNew").value = PrivKeyStr;
            Select.value = "private";
        }
        else
        {
            $("idKeyNew").value = PubKeyStr;
            Select.value = "public";
        }
        
        SetVisibleEditKeys(1);
    }
    else
    {
        CancelSavePrivateKey();
    }
}

function ConvertToPrivateKey()
{
    var Str = $("idKeyNew").value;
    if(!Str || Str.length < 20)
    {
        SetError("Enter secret words that are at least 20 characters long");
        return;
    }
    
    var Str2 = $("idKeyNew2").value;
    if(Str2 && Str !== Str2)
    {
        SetError("Re-entered secret does not match");
        return;
    }
    
    $("idTypeKey").value = "private";
    SetVisibleItemByTypeKey();
    $("idKeyNew").value = GetPrivateKeyFromStr(Str);
    $("idKeyNew2").value = "";
}

function GetPrivateKeyFromStr(Str)
{
    var StrHex = sha3_str(Str);
    for(var i = 0; i < 100000; i++)
        StrHex = sha3_str(StrHex);
    
    return StrHex.toUpperCase();
}

function CancelSavePrivateKey()
{
    SetVisibleEditKeys(0);
}

function FindMyAccounts()
{
    GetData("FindMyAccounts", {}, function (Data)
    {
        WasAccountsDataStr = "";
        UpdatesData();
    });
}

function ViewNewAccount()
{
    var name = "idAccountEdit";
    if(IsVisibleBlock(name))
    {
        SetVisibleBlock(name, false);
    }
    else
    {
        SetVisibleBlock(name, true);
        $("idAccountName").focus();
        
        var Select = $("idAccount");
        SetViewWN();
    }
}
function SetViewWN()
{
    var Item = $("Item.WN");
    if(!Item)
        return;
    
    Item.innerText = "";
    SetVisibleBlock("Item.WN", "none");
}
function CancelCreateAccount()
{
    var name = "idAccountEdit";
    SetVisibleBlock(name, false);
}

var WasCreateAccountInfo;
function CreateAccount(bAddToPay)
{
    if(!CanSendTransaction)
    {
        SetError("Can't Send transaction");
        return;
    }
    
    WasCreateAccountInfo = PubKeyStr;
    
    var Description = $("idAccountName").value;
    var AMinerID = ParseNum($("idAMinerID").value);
    if(AMinerID)
    {
        if(AMinerID < 1e9 || AMinerID > 1e10)
        {
            SetError("Error Advanced miner ID. Must be 10 digital.");
            return;
        }
    }
    var Smart = ParseNum($("idSmart").value);
    var Currency = FindCurrencyNum($("idCurrency").value);
    
    var WN = ParseNum($("idWN").value);
    
    if(!Description)
    {
        SetError("Enter the account name.");
        return;
    }
    
    if(WN)
    {
        GetData("GetAccountKey", WN, function (Data)
        {
            if(Data && Data.result === 1)
            {
                SendTrCreateAcc(Currency, Data.PubKeyStr, Description, AMinerID, Smart, 1, bAddToPay);
            }
        });
    }
    else
    {
        SendTrCreateAcc(Currency, PubKeyStr, Description, AMinerID, Smart, 0, bAddToPay);
    }
}

function SendRunRun()
{
    SetStatus("");
    GetData("SendDirectCode", {Code:"RunRun()", TX:1}, function (Data)
    {
        if(Data)
        {
            SetStatus("Run ok");
        }
    });
}

function IsCorrectShardName(Name)
{
    if(!Name || Name.length < 3)
        return "Error shard name: " + Name + " Length must be min 3 letters";
    const SHARD_LETTER = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    for(var i = 0; i < Name.length; i++)
    {
        var Index = SHARD_LETTER.indexOf(Name.substr(i, 1));
        if(Index < 0)
            return "Error shard name: " + Name + " Letters must be between A-Z or 0-9";
        if(i === 0 && Index < 10)
            return "Error shard name: " + Name + " First letters must be between A-Z";
    }
    
    return 1;
}

function CreateNewShard()
{
    var Name = $("idShardName").value;
    var Confirms = $("idShardConfirms").value;
    Name = Name.toUpperCase().trim();
    var Result = IsCorrectShardName(Name);
    if(Result !== 1)
        return SetError(Result);
    
    var TR = {Type:TYPE_TRANSACTION_NEW_SHARD, ShardName:Name, Confirms:Confirms, Description:$("idShardDescription").value, };
    
    var Body = [];
    WriteByte(Body, TR.Type);
    WriteStr(Body, TR.ShardName, 8);
    WriteStr(Body, TR.Description, 40);
    WriteUint32(Body, TR.Confirms);
    Body.length += 6;
    
    var Item = {name:Name, To:0, Amount:CONFIG_DATA.PRICE_DAO.NewShard, Description:"Shard " + Name + ":" + Confirms, Body:Body,
    };
    AddToInvoiceList(Item, 1);
}

function SetVisibleEditKeys(bSet)
{
    SetVisibleBlock("edit_keys", bSet);
    if(bSet)
    {
        SetVisibleItemByTypeKey();
        $("idKeyNew").focus();
    }
}

function SelectTypeKey()
{
    var Select = $("idTypeKey");
    var Item = $("idKeyNew");
    var Item2 = $("idKeyNew2");
    
    if(Select.value === "public" && (Item.value.length !== 66 || Item.value.substr(0, 1) !== "0"))
    {
        Item.value = "";
        Item2.value = "";
    }
    else
        if(Select.value === "private" && Item.value === PubKeyStr)
        {
            Item.value = "";
            Item2.value = "";
        }
        else
            if(Select.value === "brain" && Item.value.length >= 64 && IsHexStr(Item.value))
            {
                Item.value = "";
                Item2.value = "";
            }
    
    SetVisibleItemByTypeKey();
}
function SetVisibleItemByTypeKey()
{
    var ItemSelect = $("idTypeKey");
    if(ItemSelect)
    {
        var SelectType = ItemSelect.value;
        if(SelectType === "brain")
        {
            SetVisibleBlock("idViewKeyNew2", "table-row");
            SetVisibleBlock("idBtConvertKey", "inline-block");
            SetVisibleBlock("idBtSaveKey", false);
        }
        else
        {
            SetVisibleBlock("idViewKeyNew2", "none");
            SetVisibleBlock("idBtConvertKey", false);
            SetVisibleBlock("idBtSaveKey", "inline-block");
        }
    }
    
    var StrPrivHex = $("idKeyNew").value;
    if(StrPrivHex && window.SignLib)
    {
        var Str;
        var PrivKeyArr = GetArrFromHex($("idKeyNew").value);
        if(PrivKeyArr.length === 33)
            Str = $("idKeyNew").value;
        else
            Str = GetHexFromArr(SignLib.publicKeyCreate(PrivKeyArr, 1));
        
        $("idPubKey").innerText = Str;
    }
}


var CountViewRows = 20;
var DefAccounts = {BlockName:"idPaginationAccount", NumName:"idViewAccountNum", TabName:"grid_accounts_all", APIName:"GetAccountList",
    Param3:"", FilterName:"idViewAccountFilter", TotalSum:"idTotalSum", Params:{GetCoin:1}};
var DefBlock = {BlockName:"idPaginationBlock", NumName:"idViewBlockNum", TabName:"grid_block_all", APIName:"GetBlockList",
    Param3:"", FilterName:""};

var DefHistory = {BlockName:"idPaginationHistory", NumName:"idViewHistoryNum", TabName:"grid_history", APIName:"GetHistoryAct",
    Param3:"", FilterName:"idViewHistoryFilter", TotalSum:"idTotalSumH"};

var DefJournal = {BlockName:"idPaginationJournal", NumName:"idViewJournNum", TabName:"grid_journal", APIName:"GetJournalList",
    Param3:"", FBlockName:"idViewJournalRunBlockNum", FindBlock:"FindJournalByBlockNum"};
var DefHash = {BlockName:"idPaginationHash", NumName:"idViewHashNum", TabName:"grid_hash_all", APIName:"GetHashList", Param3:""};

var DefDapps = {BlockName:"idPaginationDapps", NumName:"idViewDappNum", TabName:"grid_dapps_all", APIName:"GetDappList", Param3:"",
    FilterName:"idViewDappsFilter", FilterName2:"idCategory", CountViewRows:10};

var DefCrossOut = {BlockName:"idPaginationCrossSend", NumName:"idViewCrossOutNum", TabName:"grid_cross_send", APIName:"GetCrossOutList",
    Param3:"", FBlockName:"idViewCrossOutBlockNum", FindBlock:"FindCrossOutByBlockNum"};
var DefCrossIn = {BlockName:"idPaginationCrossReceive", NumName:"idViewCrossInNum", TabName:"grid_cross_receive", APIName:"GetCrossInList",
    Param3:"", FBlockName:"idViewCrossInBlockNum", FindBlock:"FindCrossInByBlockNum"};

var DefShard = {BlockName:"idPaginationShard", NumName:"idViewShardNum", TabName:"grid_shard", APIName:"GetShardList", Param3:""};

function ViewHistory()
{
    ViewCurrent(DefHistory);
}
function ViewDapps()
{
    ViewCurrent(DefDapps);
}

var MapCheckBtPress = {};
var ArrCheckEscPress = [];
function SetImg(This,Name)
{
    if(!This)
        return;
    
    MapCheckBtPress[Name] = This;
    
    if(IsVisibleBlock(Name))
    {
        This.id = "idUp";
        
        for(var i = ArrCheckEscPress.length - 1; i >= 0; i--)
        {
            var element = ArrCheckEscPress[i];
            if(element.name === Name)
            {
                return;
            }
        }
        
        ArrCheckEscPress.push({name:Name, item:This, tab:CurTabName});
    }
    else
    {
        This.id = "idDown";
    }
}
setInterval(function ()
{
    for(var key in MapCheckBtPress)
    {
        var item = MapCheckBtPress[key];
        SetImg(item, key);
    }
}
, 300);
function UpdatesConfigData()
{
    GetData("GetWalletInfo", {}, function (Data)
    {
        SetConfigData(Data);
    });
}
function UpdatesAccountsData()
{
    GetData("/GetWalletAccounts", {}, function (Data,responseText)
    {
        SetAccountsData(Data, responseText);
    });
}

function UpdatesData()
{
    UpdatesConfigData();
    UpdatesAccountsData();
    CheckNameAccTo();
    CheckSending();
}

var TitleWarning = 0;
function SetTitle(TitleName)
{
    if(TitleWarning === 1)
        document.title = "*" + TitleName + "*";
    else
        if(TitleWarning === 2)
            document.title = "**" + TitleName + "**";
        else
            if(TitleWarning > 2)
                document.title = "***" + TitleName + "***";
            else
                document.title = TitleName;
}

var LastLoadPercent = 0;
var LastLoadPercentTime = 0;
function SetConfigData(Data)
{
    if(!Data || !Data.result)
        return;
    
    CONFIG_DATA = Data;
    CheckSessionID(Data.sessionid);
    
    window.SUM_PRECISION =  + CONFIG_DATA.CONSTANTS.SUM_PRECISION;
    window.DEBUG_WALLET = 0;
    // if(CONFIG_DATA.CONSTANTS.DEBUG_WALLET)
    //     window.DEBUG_WALLET = 1;
    if(!window.DEBUG_WALLET)
    {
        var State1 = "GetStateItem(Item)";
        var State2 = "GetStateItem((Item))";
        
        if($(State1))
        {
            SetVisibleBlock(State1, "none");
            $(State1).innerText = "";
        }
        if($(State2))
        {
            SetVisibleBlock(State2, "none");
            $(State2).innerText = "";
        }
    }
    
    ServerBlockNumDB = Data.BlockNumDB;
    ServerCurBlockNum = Data.CurBlockNum;
    ServerTime = Data.CurTime;
    var DeltaTime = Data.DELTA_CURRENT_TIME / 1000;
    
    var Name = Data.SHARD_NAME;
    if(CONFIG_DATA.CONSTANTS.WALLET_NAME)
        Name = CONFIG_DATA.CONSTANTS.WALLET_NAME;
    
    if(CONFIG_DATA.CONSTANTS.COUNT_VIEW_ROWS)
        CountViewRows = CONFIG_DATA.CONSTANTS.COUNT_VIEW_ROWS;
    
    SetBlockChainConstant(Data);
    MaxBlockNum = GetCurrentBlockNumByTime();
    
    // window.NETWORK_NAME = CONFIG_DATA.NETWORK;
    // window.SHARD_NAME = CONFIG_DATA.SHARD_NAME;
    CheckNetworkID(CONFIG_DATA);
    if(!WasInitCurrency)
    {
        
        WasInitCurrency = 1;
        FillCurrencyAsync("idCurrencyList");
    }
    
    var StrVersion = "" + Data.VersionNum;
    if(Data.CODE_VERSION.VersionNum && Data.VersionNum < Data.CODE_VERSION.VersionNum)
    {
        StrVersion = StrVersion + "/" + Data.CODE_VERSION.VersionNum;
    }
    
    SetTitle(Name + ":" + StrVersion);
    
    DeltaTime = DeltaTime.toFixed(3);
    var DeltaDB = Data.CurBlockNum - Data.BlockNumDB;
    var DeltaTX = Data.CurBlockNum - Data.TXBlockNum;
    
    var JinnStat = Data.NodeSyncStatus;
    
    if(DeltaDB > BLOCK_PROCESSING_LENGTH * 2)
    {
        var Percent = 0;
        CanSendTransaction = 0;
        var StrMode = "";
        var MaxNum = Data.CurBlockNum - BLOCK_PROCESSING_LENGTH;
        if(MaxNum > 0)
        {
            if(JinnStat)
            {
                var LoadedH = JinnStat.Header2 - JinnStat.Header1;
                var LoadedB = JinnStat.Block2 - JinnStat.Block1;
                if(LoadedB > 0)
                {
                    LoadedH = MaxNum - Data.BlockNumDB;
                }
                
                var Loaded = (LoadedH + LoadedB) / 2;
                Percent = 100 * (Loaded * 0.95) / DeltaDB;
                if(Percent >= 100)
                    Percent = 99.99;
                StrMode = "(H:" + (JinnStat.Header2 - JinnStat.Header1) + " B:" + (JinnStat.Block2 - JinnStat.Block1) + ")";
            }
            else
            {
                Percent = 100 * Data.BlockNumDB / MaxNum;
                StrMode = "(" + Data.BlockNumDB + "/" + MaxNum + ")";
            }
            
            if(Percent < 0)
                Percent = 0;
            if(Percent >= 99.5)
                Percent = Percent.toFixed(3);
            else
                Percent = Percent.toFixed(2);
            
            StrMode = " " + Percent + "% " + StrMode;
        }
        
        if(!JinnStat || Percent > LastLoadPercent || Date.now() - LastLoadPercentTime > 12 * 1000)
        {
            SetMainStatus("<DIV align='center' style='color:red'><big><B>Waiting for synchronization " + StrMode + "</B></big></DIV>");
            LastLoadPercent = Percent;
            LastLoadPercentTime = Date.now();
        }
        
        WalletStatus = "WAIT";
    }
    else
        if(!JinnStat && WalletStatus === "WAIT")
        {
            LastLoadPercent = 0;
            CanSendTransaction = 1;
            WalletStatus = "OK";
            SetMainStatus("<DIV align='center' style='color:green'><big><B>Synchronization complete</B></big></DIV>", 1);
        }
        else
        {
            LastLoadPercent = 0;
            if(JinnStat)
            {
                StrMode = "(H:" + (JinnStat.Header2 - JinnStat.Header1) + " B:" + (JinnStat.Block2 - JinnStat.Block1) + ")";
                SetMainStatus("<DIV align='center' style='color:green'><big><B>Synchronization complete " + StrMode + "</B></big></DIV>", 1);
            }
            CanSendTransaction = 1;
        }
    
    if(CONFIG_DATA.CONSTANTS.NOT_RUN)
    {
        CanSendTransaction = 0;
        WalletStatus = "OK";
        SetMainStatus("<DIV align='center' style='color:#565571'><big><B>NODE NOT RUNING</B></big></DIV>", 1);
    }
    
    MaxAccID = Data.MaxAccID;
    MaxDappsID = Data.MaxDappsID;
    MaxActNum = Data.MaxActNum;
    MaxJournalNum = Data.MaxJournalNum;
    MaxCrossOutNum = Data.MaxCrossOutNum;
    MaxCrossInNum = Data.MaxCrossInNum;
    MaxShardNum = Data.MaxShardNum;
    
    PubKeyStr = Data.PublicKey;
    PrivKeyStr = Data.PrivateKey;
    sessionStorage[WALLET_KEY_NAME] = PrivKeyStr;
    Storage.setItem(WALLET_KEY_NAME, "");
    
    WalletOpen = Data.WalletOpen;
    SetVisibleBtOpenWallet();
    
    HistoryMaxNum = Data.HistoryMaxNum;
    
    $("idCurBlockNum").innerText = Data.CurBlockNum;
    $("idDeltaDB").innerText = DeltaDB;
    $("idDeltaTX").innerText = DeltaTX;
    $("idDeltaTime").innerText = DeltaTime;
    $("idWalletVersion").innerText = StrVersion;
    $("idSpeedSignLib").innerText = Data.SpeedSignLib;
    
    SetArrLog(Data.ArrLog);
    
    if($("idDataPath").innerText !== Data.DATA_PATH)
        $("idDataPath").innerText = Data.DATA_PATH;
    
    var bDevService = !!CONFIG_DATA.CONSTANTS.WALLET_DESCRIPTION;
    SetVisibleBlock("idDevelopService", Data.IsDevelopAccount);
    SetVisibleBlock("idDevelopService2", bDevService);
    
    if(Data.NeedRestart)
    {
        DoRestartWallet();
    }
    
    SERVER_IP = Data.ip;
    SERVER_PORT = Data.port;
    $("idAutoDetectIP").checked = CONFIG_DATA.CONSTANTS.AUTODETECT_IP;
    
    if(CONFIG_DATA.CONSTANTS.AUTODETECT_IP)
        $("idIP").value = "";
    else
        SetConstValue("idIP", "JINN_IP");
    SetConstValue("idPort", "JINN_PORT");
    SetConstValue("idHTTPPort", "HTTP_PORT_NUMBER");
    SetConstValue("idHTTPPassword", "HTTP_PORT_PASSWORD");
    MiningAccount = Data.MiningAccount;
    $("idUseMining").checked = CONFIG_DATA.CONSTANTS.USE_MINING;
    SetConstValue("idPercentMining", "POW_MAX_PERCENT");
    SetConstValue("idMiningAccount", "MINING_ACCOUNT");
    if(Data.CountMiningCPU > 0 && CONFIG_DATA.CONSTANTS.USE_MINING)
        SetVisibleBlock("idMiningParams", "inline-block");
    else
        SetVisibleBlock("idMiningParams", 0);
    $("idUseMiningShards").checked = CONFIG_DATA.CONSTANTS.USE_MINING_SHARDS;

    var HName="Mh/s";
    if(Data.HashRate>1000)
    {
        HName="Gh/s";
        Data.HashRate = Data.HashRate / 1000;
    }
    else
    if(Data.HashRate<1)
    {
        HName="Kh/s";
        Data.HashRate = Data.HashRate * 1000;
    }
    SetStatusMining(`Mining on acc: <B>${MiningAccount}</B> HashRate:<B> ${(Math.floor(Data.HashRate * 10) / 10)}</B>${HName} CPU RUN:<B>` + Data.CountRunCPU + "</B>/" + Data.CountMiningCPU + " " + (Data.MiningPaused ? "<B style='color:darkred;'>=PAUSED=</B>" : ""));
    if(CONFIG_DATA.CONSTANTS.USE_MINING && ( + Data.CountRunCPU) !== ( + Data.CountMiningCPU))
    {
        $("idUseMining").className = "checkbox checkbox_red";
    }
    else
    {
        $("idUseMining").className = "checkbox";
    }
    
    if(Data.CODE_VERSION.VersionNum && Data.VersionNum < Data.CODE_VERSION.VersionNum)
    {
        $("idAutoUpdate").className = "checkbox checkbox_alert";
    }
    else
    {
        $("idAutoUpdate").className = "checkbox";
    }
    
    $("idAutoUpdate").checked = CONFIG_DATA.CONSTANTS.USE_AUTO_UPDATE;
    
    SetConstValueAuto();
    
    SetViewWN();
    
    StartDrawBlockInfo();
    if(CONFIG_DATA.MaxLogLevel < 4)
        CONFIG_DATA.MaxLogLevel = 4;
    $("idLogLevel").value = CONFIG_DATA.CONSTANTS.LOG_LEVEL;
    $("idLogLevelText").innerText = CONFIG_DATA.CONSTANTS.LOG_LEVEL;
    $("idLogLevel").max = CONFIG_DATA.MaxLogLevel;
    
    if(bDevService)
    {
        sessionStorage[WALLET_KEY_NAME] = "";
    }
}

function SetConstValue(IdName,ConstName)
{
    var Item = $(IdName);
    if(document.activeElement === Item)
    {
        return;
    }
    
    var Value = CONFIG_DATA.CONSTANTS[ConstName];
    if(Item.type === "checkbox")
    {
        Item.checked =  + Value;
    }
    else
    {
        Item.value = Value;
        
        var info = $("info" + Item.id);
        if(info)
        {
            info.innerText = Value;
        }
    }
}

function SetConstValueAuto()
{
    const arr = document.querySelectorAll(".node-const");
    arr.forEach(function (Item)
    {
        SetConstValue(Item.id, Item.id);
    });
    
    $("idCanSaveConst").value = 1;
}

function SaveNetParams()
{
    if(!$("idCanSaveConst").value)
        return;
    
    var Const = {};
    Const.HTTP_PORT_NUMBER = ParseNum($("idHTTPPort").value);
    Const.HTTP_PORT_PASSWORD = $("idHTTPPassword").value;
    
    Const.JINN_IP = $("idIP").value;
    Const.JINN_PORT = ParseNum($("idPort").value);
    Const.AUTODETECT_IP = $("idAutoDetectIP").checked;
    
    const arr = document.querySelectorAll(".node-const");
    arr.forEach(function (Item)
    {
        var Value;
        if(Item.type === "checkbox")
        {
            Value = Item.checked;
        }
        else
        {
            if(Item.type === "number")
                Value = ParseNum(Item.value);
            else
                Value = Item.value;
        }
        
        Const[Item.id] = Value;
    });
    
    GetData("SaveConstant", Const, function (Data)
    {
        SetStatus("Save ok");
    });
}


function ChangeLog()
{
    CONFIG_DATA.CONSTANTS.LOG_LEVEL =  + $("idLogLevel").value;
    $("idLogLevelText").innerText = CONFIG_DATA.CONSTANTS.LOG_LEVEL;
    SaveConstant(0, CONFIG_DATA.CONSTANTS);
}

function SetVisibleBtOpenWallet()
{
    var item = $("idOpenWallet");
    item.classList.remove("wallet-close");
    item.classList.remove("wallet-open");
    
    SetVisibleBlock("idOpenWallet", WalletOpen !== undefined);
    if(WalletOpen == true)
    {
        item.classList.add("wallet-open");
        if(item.value !== "Wallet opened")
        {
            item.value = "Wallet opened";
            item.style = "background-image: url('/HTML/PIC/lock_open.png');color:green;";
        }
    }
    else
        if(WalletOpen == false)
        {
            item.classList.add("wallet-close");
            if(item.value !== "Wallet closed")
            {
                item.value = "Wallet closed";
                item.style = "background-image: url('/HTML/PIC/lock_closed.png');color:" + "#5b5e91";
            }
        }
    
    SetVisibleBlock("wallet_config_tab", WalletOpen !== false);
}

function TestSignLib()
{
    GetData("TestSignLib", {});
}

function DoRepeatTx(BlockNum,Tx)
{
    ToLog("Copy OK!");
}

var StrMainStatus = "";
var StrNormalStatus = "";
function SetMainStatus(Str,bCanClear)
{
    StrMainStatus = Str;
    ViewStatus();
}
function SetStatus(Str,bError,bNoEscape)
{
    if(bError)
        return SetError(Str);
    
    if(bNoEscape)
        StrNormalStatus = Str;
    else
        StrNormalStatus = escapeHtml(Str);
    
    ViewStatus();
}

function ViewStatus()
{
    var Str = "<B>Shard: " + window.SHARD_NAME + " </B>" + StrNormalStatus + StrMainStatus;
    var id = $("idStatus");
    id.innerHTML = Str;
}
function SetError(Str,bNoSound)
{
    if(!bNoSound)
        $("sound_err").play();
    SetStatus("<span  align='center' style='color:red;align-content: center'><B>" + escapeHtml(Str) + "</B></span>", 0, 1);
}
function SetStatusMining(Str)
{
    var id = $("idStatusMining");
    id.innerHTML = Str;
}

function SetVisibleTab()
{
    if(!CurTabName)
        CurTabName = TabArr[0].name;
    
    var bLogVisible = 0;
    var str;
    for(var i = 0; i < TabArr.length; i++)
    {
        var name = TabArr[i].name;
        var Item = $(name);
        if(!Item)
            continue;
        if(CurTabName === name)
        {
            bLogVisible = TabArr[i].log;
            Item.style.display = 'block';
            str = "current bt bttab";
        }
        else
        {
            Item.style.display = 'none';
            str = "bttab bt";
        }
        
        var ItemM = $("M" + name);
        if(ItemM)
            ItemM.className = str;
    }
    SetVisibleBlock("idServerBlock", bLogVisible);
}

function OnSelectTab(name)
{
    if(name === "TabDapps")
    {
        ViewDapps();
    }
}

function SelectTab(name,bNoHistory)
{
    if(!name)
        name = "TabAccounts";
    CurTabName = name;
    OnSelectTab(name);
    if(!bNoHistory)
    {
        if(name === "TabAccounts")
            history.pushState(null, null, "#");
        else
            history.pushState(null, null, "#" + name);
    }
    
    SetVisibleTab();
    SaveValues();
    DoStableScroll();
}

function CheckCtrlEnterAndESC(e,F)
{
    if(IsVisibleBlock("idOverlay"))
    {
        if(e.keyCode === 27)
        {
            closeModal();
        }
        else
            if(e.keyCode === 13)
            {
                setTimeout(OnConfirmOK, 100);
            }
        return;
    }
    
    SaveValues();
}

function LoadValues()
{
    if(LoadValuesByArr(SaveIdArr))
    {
        CurTabName = localStorage["CurTabName"];
        
        LoadMapAfter["idAccount"] = localStorage.getItem("idAccount");
    }
}
function SaveValues()
{
    SaveValuesByArr(SaveIdArr);
    localStorage["CurTabName"] = CurTabName;
}

function SelectStyle(value)
{
    
    var Select = $("idSelStyle");
    if(!Select)
        return;
    
    if(value)
        Select.value = value;
    
    if(!Select.value)
        Select.value = Select.options[0].value;
    
    document.body.className = "univers " + Select.value;
}

function SetRun()
{
    SaveValues();
    localStorage["WasStart"] = "0";
    SetStatus("Set to Run script");
}

var itemPasswordGet, itemPassword1, itemPassword2, itemBtPassword;
function InitPasItems()
{
    itemPassword1 = $("idPassword1");
    itemPassword2 = $("idPassword2");
    itemPasswordGet = $("idPasswordGet");
}

function OnClickOpenCloseWallet()
{
    if(WalletOpen === true)
    {
        GetData("CloseWallet", {}, function (Data)
        {
            if(Data && Data.result === 1)
            {
                SetStatus("Wallet close");
            }
        });
    }
    else
        if(WalletOpen === false)
        {
            ViewOpenWallet();
        }
}

function OpenWallet()
{
    var Passwd1 = itemPasswordGet.value;
    GetData("OpenWallet", Passwd1, function (Data)
    {
        if(Data && Data.result === 1)
        {
            itemPasswordGet.value = "";
            SetStatus("Wallet open");
            SetVisibleBlock("idBlockPasswordGet", false);
            SetImg(itemBtPassword, 'idBlockPasswordGet');
        }
        else
        {
            SetError("Wrong password!");
        }
    });
}
function CancelOpenWallet()
{
    SetVisibleBlock("idBlockPasswordGet", false);
    SetImg(itemBtPassword, 'idBlockPasswordGet');
}

function ViewSetPassword()
{
    if(WalletOpen === false)
    {
        SetError("First open wallet!");
        return;
    }
    
    // itemPassword1.onkeydown = OnEnterPas1;
    // itemPassword2.onkeydown = OnEnterPas2;
    
    itemPassword1.value = "";
    itemPassword2.value = "";
    SetVisibleBlock("idBlockPasswordSet", !IsVisibleBlock("idBlockPasswordSet"));
    SetImg(itemBtPassword, 'idBlockPasswordSet');
    itemPassword1.focus();
}

function SetPassword(bCheckView)
{
    if(bCheckView && !IsVisibleBlock("idBlockPasswordSet"))
    {
        OpenWallet();
        return;
    }
    
    var Passwd1 = itemPassword1.value;
    var Passwd2 = itemPassword2.value;
    if(Passwd1 !== Passwd2)
    {
        SetError("Passwords are not equal");
        return;
    }
    itemPassword1.value = "";
    itemPassword2.value = "";
    
    GetData("SetWalletPasswordNew", Passwd1, function (Data)
    {
        if(Data && Data.result === 1)
        {
            SetStatus("New password was set");
            SetVisibleBlock("idBlockPasswordSet", false);
            SetImg(itemBtPassword, 'idBlockPasswordSet');
        }
    });
}
function CancelSetPassword()
{
    SetVisibleBlock("idBlockPasswordSet", false);
    SetImg(itemBtPassword, 'idBlockPasswordSet');
    SetVisibleBlock("idBlockPasswordGet", false);
    SetImg(itemBtPassword, 'idBlockPasswordGet');
}

function OnEnterPas1(e)
{
    if(e.keyCode === 13)
    {
        if(IsVisibleBlock("idBlockPasswordSet"))
        {
            itemPassword2.focus();
        }
        else
        {
            OpenWallet();
        }
    }
}
function OnEnterPas2(e)
{
    if(e.keyCode === 13)
    {
        SetPassword();
    }
}


function OpenOwnWebWallet()
{
    if(!CONFIG_DATA.CONSTANTS.HTTP_HOSTING_PORT)
        return;
    
    var port = CONFIG_DATA.CONSTANTS.HTTP_HOSTING_PORT;
    if(port === 80 || port === 443)
        port = 0;
    window.Open(window.location.protocol + '//' + window.location.hostname + (port ? ":" + port : "") + '/web-wallet.html');
}

function OnInitWallet()
{
    UpdatesData();
    setInterval(UpdatesData, 2000);
    
    setInterval(SaveValues, 2000);
    setTimeout(CheckNameAccTo, 200);
    
    if(window.location.hash)
    {
        var LocationPath = window.location.hash.substr(1);
        if(LocationPath)
        {
            SelectTab(LocationPath);
        }
    }
    
    setTimeout(function ()
    {
        OnSelectTab(CurTabName);
    }, 100);
}
