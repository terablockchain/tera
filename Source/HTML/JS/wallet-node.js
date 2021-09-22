/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

function SavePrivateKey()
{
    
    var Str = $("idKeyNew").value;
    Str = Str.trim();
    if(!IsHexStr(Str))
    {
        SetError("Error: Need HEX chars only");
        return;
    }
    
    if(Str.length !== 64 && Str.length !== 66)
    {
        SetError("Error: Length must 64 or 66 HEX chars. (Length=" + Str.length + ")");
        return;
    }
    
    GetData("SetWalletKey", Str, function (Data)
    {
        if(Data && Data.result === 1)
        {
            SetVisibleEditKeys(0);
            UpdatesData();
            
            if(Str.length === 64 && PrivKeyStr !== Str)
                SetStatus("Private key changed");
            else
                if(Str.length === 66 && PubKeyStr !== Str)
                    SetStatus("Public key changed");
        }
    });
}

async function SetNewSysCore(TR)
{
    if(!TR.FromNum)
        TR.FromNum=TR.NextNum;
    var OperationID = 0;
    var Item = MapAccounts[TR.FromNum];
    if(Item)
    {
        OperationID = Item.Value.OperationID;
    }
    OperationID++;

    TR.Type=20;
    TR.Version=4;
    TR.Reserve=[];
    TR.OperationID=OperationID;

    var Format=await AGetFormat("FORMAT_SYS");
    var Body=SerializeLib.GetBufferFromObject(TR, Format, {});
    Body.length-=64;

    //console.log("=BODY=",Body);
    SendTrArrayWithSign(Body, TR.FromNum, TR);
}

function SetSysCoreJSON()
{
    var Data = JSON.parse(JSON.stringify(CONFIG_DATA.PRICE_DAO));
    var Data2 = CopyObjKeys({Service:"SetNewSysCore"}, Data);
    var Str = JSON.stringify(Data2, "", 2);
    $("idDevService").value = Str;
}
function SetCodeVersionJSON()
{
    var Data = JSON.parse(JSON.stringify(CONFIG_DATA.CODE_VERSION));
    if(!Data.BlockNum)
    {
        Data.LevelUpdate = 16;
        Data.BlockPeriod = 1;
    }
    
    Data.BlockNum = CONFIG_DATA.CurBlockNum;
    Data.addrArr = GetHexFromArr(Data.addrArr);
    Data.Hash = GetHexFromArr(Data.Hash);
    Data.Sign = GetHexFromArr(Data.Sign);
    Data.Hash = undefined;
    Data.Sign = undefined;
    Data.StartLoadVersionNum = undefined;
    
    var Data2 = CopyObjKeys({Service:"SetNewCodeVersion"}, Data);
    var Str = JSON.stringify(Data2, "", 2);
    $("idDevService").value = Str;
}

function SetNetConstJSON()
{
    var Str = JSON.stringify(Data, "", 2);
    $("idDevService").value = Str;
    var Data = {JINN:CONFIG_DATA.JINN_NET_CONSTANT};
    
    if(Data.JINN)
    {
        delete Data.JINN.NetConstStartNum;
        delete Data.JINN.NetConstVer;
        delete Data.JINN.CHECK_POINT_HASH;
        delete Data.JINN.RESERVE_DATA;
        delete Data.JINN.NET_SIGN;
    }
    
    var Data2 = CopyObjKeys({Service:"SetCheckNetConstant"}, Data);
    var Str = JSON.stringify(Data2, "", 2);
    $("idDevService").value = Str;
}

function ConnectToAll()
{
    RunServerCode('SERVER.ConnectToAll()');
}

function RunDevelopService()
{
    try
    {
        var Data = JSON.parse($("idDevService").value);
    }
    catch(e)
    {
        SetError("Error JSON format setting data");
        return;
    }
    if(!Data.Service)
    {
        SetError("Error format setting - not found Service");
        return;
    }

    if(Data.Service=="SetNewSysCore")
        return SetNewSysCore(Data);

    
    if(Data.addrArr)
        Data.addrArr = GetArrFromHex(Data.addrArr);
    
    GetData(Data.Service, Data, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text, !Data.result);
        }
        else
        {
            ToError("Error");
        }
    });
}

function RestartNode()
{
    GetData("RestartNode", {});
    DoRestartWallet();
}

function UseAutoUpdate()
{
    var Data = {USE_AUTO_UPDATE:$("idAutoUpdate").checked, DoMining:1};
    
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save AutoUpdate: " + $("idAutoUpdate").checked);
        }
    });
}
function UseMining()
{
    if(!MiningAccount)
    {
        SetError("Not set mining account");
        return;
    }
    var Data = {USE_MINING:$("idUseMining").checked, DoMining:1};
    
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save Mining: " + $("idUseMining").checked);
        }
    });
}

function UseMiningShards()
{
    var Data = {USE_MINING_SHARDS:$("idUseMiningShards").checked};
    
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save mining cross-tx: " + $("idUseMiningShards").checked);
        }
    });
}
function SetPercentMining()
{
    var Data = {POW_MAX_PERCENT:ParseNum($("idPercentMining").value)};
    
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save Mining percent: " + $("idPercentMining").value + " %");
        }
    });
}

function MiningSets()
{
    var name = "edit_mining_set";
    if(IsVisibleBlock(name))
    {
        SetVisibleBlock(name, false);
    }
    else
    {
        SetVisibleBlock(name, true);
        $("idMiningAccount").value = MiningAccount;
        $("idMiningAccount").focus();
    }
}
function SaveMiningSet(Value)
{
    SetVisibleBlock("edit_mining_set", false);
    
    if(Value)
    {
        MiningAccount = Value;
    }
    else
    {
        MiningAccount = ParseNum($("idMiningAccount").value);
    }
    GetData("SetMining", MiningAccount, function (Data)
    {
    });
}
function CancalMiningSet()
{
    var name = "edit_mining_set";
    SetVisibleBlock(name, false);
}

var WasHistoryMaxNum;
var WasLastNumSound = 0;

function DoRestartWallet()
{
    SetStatus("<H1 align='center' style='color:blue'>Restarting program...</H1>", 0, 1);
    if(!WasSetRestart)
    {
        WasSetRestart = 1;
        setTimeout(function ()
        {
            window.location.reload();
        }, 10 * 1000);
    }
}

function SetArrLog(arr)
{
    var Str = "";
    var bFindAccount = 0;
    for(var i = 0; i < arr.length; i++)
    {
        var Item = arr[i];
        if(!CanAdItemToLog(Item))
            continue;
        
        var tr_text = GetTransactionText(MapSendTransaction[Item.key], Item.key.substr(0, 12));
        var info = Item.time + " " + Item.text;
        if(tr_text)
            info += " (" + tr_text + ")";
        
        var TR = MapSendTransaction[Item.key];
        if(Item.final)
        {
            if(TR)
            {
                //console.log(Item);
                if(Item.final < 0 && !TR.WasError)
                {
                    TR.WasError = 1;
                    SetError(Item.text);
                }
                if(Item.final > 0 && !TR.WasSetStatus && !TR.WasError)
                {
                    TR.WasSetStatus = 1;
                    SetStatus(Item.text);
                }
                
                if(typeof Item.text==="string" && Item.text.indexOf("Add to blockchain") >= 0)
                {
                    if(TR.bFindAcc)
                    {
                        bFindAccount = 1;
                        TR.bFindAcc = 0;
                    }
                    if(TR.Run)
                    {
                        TR.Run(TR);
                        TR.Run = undefined;
                    }
                    
                    if(window.MapAccounts && TR.To)
                    {
                        for(var n = 0; n < TR.To.length; n++)
                        {
                            var ToID = TR.To[n].ID;
                            delete MapAccounts[ToID];
                        }
                    }
                }
            }
            
            var Account = MapCheckTransaction[Item.key];
            if(Account)
            {
                delete MapCheckTransaction[Item.key];
                Account.NextSendTime = 0;
            }
        }
        
        Str = Str + info + "\n";
    }
    SetStatusFromServer(Str);
    CheckSending();
    
    if(bFindAccount)
    {
        FindMyAccounts();
    }
}
function SetAutoMining()
{
    setTimeout(function ()
    {
        var Select = $("idAccount");
        if(Select.options.length)
        {
            SaveMiningSet(Select.options[Select.options.length - 1].value);
        }
    }, 100);
}

function ViewNetworkMode()
{
    if(IsVisibleBlock('idNetworkView'))
    {
        SetVisibleBlock('idNetworkView', false);
    }
    else
    {
        SetVisibleBlock('idNetworkView', true);
        
        OnSetNetworkMode();
    }
}
function OnSetNetworkMode()
{
    $("idIP").disabled = $("idAutoDetectIP").checked;
}

function SetNetworkParams(bRestart)
{
    
    var Mode = {};
    Mode.AutoDetectIP = $("idAutoDetectIP").checked;
    Mode.ip = $("idIP").value;
    Mode.port = ParseNum($("idPort").value);
    
    Mode.DoRestartNode = bRestart;
    
    GetData("SetNetMode", Mode, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Set net work params OK");
            SetVisibleBlock('idNetworkView', false);
        }
    });
    if(bRestart)
        DoRestartWallet();
}

function ViewConstant()
{
    if(IsVisibleBlock('idConstantView'))
    {
        SetVisibleBlock('idConstantView', false);
    }
    else
    {
        SetVisibleBlock('idConstantView', true);
        $("idConstant").value = JSON.stringify(CONFIG_DATA.CONSTANTS, "", 2);
    }
}
function SaveConstant(bRestart,Data)
{
    if(!Data)
    {
        try
        {
            Data = JSON.parse($("idConstant").value);
        }
        catch(e)
        {
            SetError("Error JSON format setting constant");
            return;
        }
    }
    
    Data.DoRestartNode = bRestart;
    
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save Constant OK");
            SetVisibleBlock('idConstantView', false);
        }
    });
    if(bRestart)
        DoRestartWallet();
}

function ViewRemoteParams()
{
    if(IsVisibleBlock('idRemoteView'))
    {
        SetVisibleBlock('idRemoteView', false);
    }
    else
    {
        SetVisibleBlock('idRemoteView', true);
    }
}
function SetRemoteParams(bRestart)
{
    var PrevHTTPPassword = HTTPPassword;
    var HTTPPort = ParseNum($("idHTTPPort").value);
    var HTTPPassword = $("idHTTPPassword").value;
    
    GetData("SetHTTPParams", {HTTPPort:HTTPPort, HTTPPassword:HTTPPassword, DoRestartNode:bRestart}, function (Data)
    {
        if(!PrevHTTPPassword && HTTPPassword)
            window.location.reload();
        else
        {
            SetVisibleBlock('idRemoteView', false);
            SetStatus("Set HTTP params OK");
        }
    });
    if(bRestart)
        DoRestartWallet();
}


function RewriteAllTransactions()
{
    DoBlockChainProcess("RewriteAllTransactions", "Rewrite all transactions", 0);
}

function RewriteTransactions()
{
    DoBlockChainProcess("RewriteTransactions", "Rewrite transactions on last %1 blocks", "idBlockCount");
}

function TruncateBlockChain()
{
    DoBlockChainProcess("TruncateBlockChain", "Truncate last %1 blocks", "idBlockCount");
}

function ClearDataBase()
{
    DoBlockChainProcess("ClearDataBase", "Clear DataBase", 0);
}

function StartLoadNewCode()
{
    DoBlockChainProcess("StartLoadNewCode", "Download last code and restart node", 0);
}


function AddSetNode()
{
    var Params = {ip:$("idChildIP").value, port: + $("idChildPort").value, Score: + $("idChildScore").value, };
    GetData("AddSetNode", Params, function (Data)
    {
        if(Data)
        {
            if(!Data.result)
                SetStatus("Error AddSetNode", 1);
            else
                SetStatus("OK AddSetNode");
        }
    });
}

function DoBlockChainProcess(FuncName,Text,LastBlockId)
{
    SaveValues();
    
    var Params = {};
    if(LastBlockId)
    {
        Params.BlockCount = ParseNum($(LastBlockId).value);
        Text = Text.replace("%1", Params.BlockCount);
    }
    
    DoConfirm(Text + "", "Are you sure?", function ()
    {
        SetVisibleBlock("idServerBlock", 1);
        SetStatus("START: " + Text);
        
        GetData(FuncName, Params, function (Data)
        {
            if(Data)
            {
                SetStatus("FINISH: " + Text, !Data.result);
            }
        });
    });
}

function SetNewActSearch(DefActs)
{
    var BlockNum =  + $("idViewActBlockNum").value;
    if(!BlockNum)
        return;
    
    GetData("FindActByBlockNum", {BlockNum:BlockNum}, function (Data)
    {
        if(Data && Data.Num)
        {
            $("idViewActNum").value = Data.Num;
            ViewCurrent(DefActs);
        }
    });
}


function SetNewAccHashSearch(Def)
{
    var BlockNum =  + $("idViewAccHashBlockNum").value;
    if(!BlockNum)
        return;
    
    var Period = CONFIG_DATA.PERIOD_ACCOUNT_HASH;
    if(!Period)
        Period = 50;
    
    $("idViewHashNum").value = Math.floor(BlockNum / Period);
    ViewCurrent(Def);
}

function SetRowByBlockNum(Def)
{
    let BlockNum =  + $(Def.FBlockName).value;
    if(!BlockNum)
    {
        SetStatus("");
        return;
    }
    
    GetData(Def.FindBlock, {BlockNum:BlockNum}, function (Data)
    {
        if(Data && Data.Num)
        {
            SetStatus("");
            $(Def.NumName).value = Data.Num;
            ViewCurrent(Def);
        }
        else
        {
            SetError("Not found block: " + BlockNum);
        }
    });
}
