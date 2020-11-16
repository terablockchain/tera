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
var CONFIG_DATA = {};
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
var SaveIdArr = ["idAccount", "idTo", "idSumSend", "idDescription", "idSelStyle", "idViewAccountNum", "idViewBlockNum", "idViewActNum",
"idViewJournNum", "idViewCrossOutNum", "idViewCrossInNum", "idViewHashNum", "idViewDappNum", "idViewShardNum", "idRunText",
"idViewAccountFilter", "idBlockCount"];

var MaxAccID = 0;
var MaxDappsID = 0;
var MaxActNum = 0;
var MaxJournalNum = 0;
var HistoryMaxNum = 0;
var MaxCrossOutNum = 0;
var MaxCrossInNum = 0;
var MaxShardNum = 0;

var idPercentItem;

var WasSetRestart = 0;

function IsPrivateMode()
{
    if(PrivKeyStr && PrivKeyStr.length === 64 && PrivKeyStr !== "0000000000000000000000000000000000000000000000000000000000000000")
        return true;
    else
        return false;
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
    $("Item.WN").innerText = "";
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
    var Currency = GetCurrencyByName($("idCurrency").value);
    
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
    
    SetVisibleShardCreate();
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
    var SelectType = $("idTypeKey").value;
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
    
    var StrPrivHex = $("idKeyNew").value;
    if(StrPrivHex && window.SignLib)
    {
        var PrivKeyArr = GetArrFromHex($("idKeyNew").value);
        if(PrivKeyArr.length === 33)
            $("idPubKey").innerText = $("idKeyNew").value;
        else
            $("idPubKey").innerText = GetHexFromArr(SignLib.publicKeyCreate(PrivKeyArr, 1));
    }
}


var CountViewRows = 20;
var DefAccounts = {BlockName:"idPaginationAccount", NumName:"idViewAccountNum", TabName:"grid_accounts_all", APIName:"GetAccountList",
    Param3:"", FilterName:"idViewAccountFilter", TotalSum:"idTotalSum"};
var DefBlock = {BlockName:"idPaginationBlock", NumName:"idViewBlockNum", TabName:"grid_block_all", APIName:"GetBlockList",
    Param3:"", FilterName:""};

var DefHistory = {BlockName:"idPaginationHistory", NumName:"idViewHistoryNum", TabName:"grid_history", APIName:"GetHistoryAct",
    Param3:"", FilterName:"idViewHistoryFilter", TotalSum:"idTotalSumH"};
var DefActs = {BlockName:"idPaginationAct", NumName:"idViewActNum", TabName:"grid_acts_all", APIName:"GetActList", Param3:""};
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
    
    CheckSessionID(Data.sessionid);
    
    CONFIG_DATA = Data;
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
    
    window.NETWORK_NAME = CONFIG_DATA.NETWORK;
    window.SHARD_NAME = CONFIG_DATA.SHARD_NAME;
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
    
    var MIN_SPEED = 700;
    if(CONFIG_DATA.SpeedSignLib < MIN_SPEED)
        $("idSpeedSignLib").className = "red";
    else
        $("idSpeedSignLib").className = "";
    if(CONFIG_DATA.SpeedSignLib)
        SetVisibleBlock("idSignLibError", (CONFIG_DATA.SpeedSignLib < MIN_SPEED));
    
    SetArrLog(Data.ArrLog);
    
    if($("idDataPath").innerText !== Data.DATA_PATH)
        $("idDataPath").innerText = Data.DATA_PATH;
    
    SetVisibleBlock("idChainMode", Data.IsDevelopAccount);
    
    var bDevService = !!CONFIG_DATA.CONSTANTS.WALLET_DESCRIPTION;
    SetVisibleBlock("idDevelopService", Data.IsDevelopAccount);
    SetVisibleBlock("idDevelopService2", bDevService);
    
    if(Data.NeedRestart)
    {
        DoRestartWallet();
    }
    
    SERVER_IP = Data.ip;
    SERVER_PORT = Data.port;
    MiningAccount = Data.MiningAccount;
    $("idUseMining").checked = CONFIG_DATA.CONSTANTS.USE_MINING;
    $("idUseMiningShards").checked = CONFIG_DATA.CONSTANTS.USE_MINING_SHARDS;
    if(!idPercentItem || document.activeElement !== idPercentItem)
    {
        idPercentItem = $("idPercentMining");
        idPercentItem.value = CONFIG_DATA.CONSTANTS.POW_MAX_PERCENT;
    }
    if(Data.CountMiningCPU > 0 && CONFIG_DATA.CONSTANTS.USE_MINING)
        SetVisibleBlock("idMiningParams", "inline-block");
    else
        SetVisibleBlock("idMiningParams", 0);
    
    SetStatusMining(" Mining on:<B>" + MiningAccount + "</B>  HashRate:<B>" + (Math.floor(Data.HashRate * 10) / 10) + "</B>Mh/s CPU RUN:<B>" + Data.CountRunCPU + "</B>/" + Data.CountMiningCPU + " " + (Data.MiningPaused ? "<B style='color:darkred;'>=PAUSED=</B>" : ""));
    if(CONFIG_DATA.CONSTANTS.USE_MINING && Data.CountRunCPU !== Data.CountMiningCPU)
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
    
    window.DEBUG_WALLET = CONFIG_DATA.CONSTANTS.DEBUG_WALLET;
    
    SetViewWN();
    
    StartDrawBlockInfo();
    if(CONFIG_DATA.MaxLogLevel < 4)
        CONFIG_DATA.MaxLogLevel = 4;
    $("idLogLevel").value = CONFIG_DATA.CONSTANTS.LOG_LEVEL;
    $("idLogLevelText").innerText = CONFIG_DATA.CONSTANTS.LOG_LEVEL;
    $("idLogLevel").max = CONFIG_DATA.MaxLogLevel;
    
    if(!CONFIG_DATA.CONSTANTS.DEBUG_WALLET)
    {
        SetVisibleBlock("GetStateItem(Item)", "none");
        $("GetStateItem(Item)").innerText = "";
        SetVisibleBlock("GetStateItem2(Item)", "none");
        $("GetStateItem2(Item)").innerText = "";
    }
    
    if(bDevService)
    {
        sessionStorage[WALLET_KEY_NAME] = "";
    }
}

function ChangeLog()
{
    CONFIG_DATA.CONSTANTS.LOG_LEVEL =  + $("idLogLevel").value;
    $("idLogLevelText").innerText = CONFIG_DATA.CONSTANTS.LOG_LEVEL;
    SaveConstant(0, CONFIG_DATA.CONSTANTS);
}

function SetVisibleBtOpenWallet()
{
    SetVisibleBlock("idOpenWallet", WalletOpen !== undefined);
    var item = $("idOpenWallet");
    if(WalletOpen == true)
    {
        item.value = "Wallet opened";
        item.style = "background-image: url('/HTML/PIC/lock_open.png');color:green;";
    }
    else
        if(WalletOpen == false)
        {
            item.value = "Wallet closed";
            item.style = "background-image: url('/HTML/PIC/lock_closed.png');color:" + "#9b712a";
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

var bMainCanClear = true;
var StrMainStatus = "";
var StrNormalStatus = "";
function SetMainStatus(Str,bCanClear)
{
    bMainCanClear = bCanClear;
    StrMainStatus = Str;
    ViewStatus();
}
function SetStatus(Str,bError)
{
    if(bError)
        return SetError(Str);
    
    StrNormalStatus = Str;
    if(bMainCanClear)
    {
        StrMainStatus = "";
    }
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
    SetStatus("<span  align='center' style='color:red;align-content: center'><B>" + Str + "</B></span>");
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
    
    if(e.ctrlKey && e.keyCode === 13)
    {
        
        if(CurTabName === "TabAccounts" && IsVisibleBlock("edit_keys"))
            SavePrivateKey();
        else
            if(CurTabName === "TabAccounts" && IsVisibleBlock("idAccountEdit"))
                CreateAccount(0);
            else
                if(CurTabName === "TabAccounts" && IsVisibleBlock("edit_mining_set"))
                    SaveMiningSet();
                else
                    if(CurTabName === "TabSend")
                    {
                        if(IsVisibleBlock("edit_transaction"))
                            SignAndSendFromJSON();
                        else
                            if(IsVisibleBlock("idBlockOnSend"))
                                SendMoney2();
                            else
                                SendMoneyBefore();
                    }
                    else
                        if(IsVisibleBlock("idBlockPasswordSet"))
                            SetPassword();
                        else
                            if(IsVisibleBlock("idBlockPasswordGet"))
                                SetPassword();
                            else
                                if(WalletOpen === false)
                                {
                                    ViewOpenWallet();
                                }
    }
    else
        if(e.keyCode === 27)
        {
            for(var i = ArrCheckEscPress.length - 1; i >= 0; i--)
            {
                var element = ArrCheckEscPress[i];
                if(element.tab === CurTabName)
                {
                    SetVisibleBlock(element.name, false);
                    SetImg(element.item, element.name);
                    ArrCheckEscPress.splice(i, 1);
                    break;
                }
            }
        }
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
    if(value)
        Select.value = value;
    
    if(!Select.value)
        Select.value = Select.options[0].value;
    
    document.body.className = "univers " + Select.value;
}

function InitRun()
{
    if(localStorage["WasStart"] !== "1")
    {
        var ValText = $("idRunText").value;
        if(ValText && ValText !== "undefined" && ValText.trim())
        {
            localStorage["WasStart"] = "1";
            SetError("Run script ... Was Error?", 1);
            eval(ValText);
            SetStatus("Run script ... OK");
        }
        localStorage["WasStart"] = "0";
    }
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

function ViewOpenWallet()
{
    
    if(WalletOpen !== false)
    {
        SetStatus("Wallet not close");
        return;
    }
    
    itemPasswordGet.onkeydown = OnEnterPas1;
    itemPasswordGet.value = "";
    SetVisibleBlock("idBlockPasswordGet", true);
    itemPasswordGet.focus();
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
    
    itemPassword1.onkeydown = OnEnterPas1;
    itemPassword2.onkeydown = OnEnterPas2;
    
    itemPassword1.value = "";
    itemPassword2.value = "";
    SetVisibleBlock("idBlockPasswordSet", !IsVisibleBlock("idBlockPasswordSet"));
    SetImg(itemBtPassword, 'idBlockPasswordSet');
    itemPassword1.focus();
}

function SetPassword()
{
    if(!IsVisibleBlock("idBlockPasswordSet"))
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

function SetAllSum()
{
    var Item = MapAccounts[$("idAccount").value];
    if(Item)
    {
        $("idSumSend").value = FLOAT_FROM_COIN(Item.Value);
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
    
    UpdatesConfigData();
    UpdatesData();
    setInterval(UpdatesData, 1000);
    setInterval(UpdatesConfigData, 1000);
    setInterval(CheckNewMoney, 2000);
    setInterval(SaveValues, 2000);
    setTimeout(CheckNameAccTo, 100);
    
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
