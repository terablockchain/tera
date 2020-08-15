/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var PayList = [];
var AttachItem;
var MapAccounts = {};
var LoadMapAfter = {};

var MapCheckTransaction = {};
var CanSendTransaction = 1;
var CurrentTR = {};

var MaxBlockNum = 0;

var DelList = {};


var WasAccountsDataStr;
function SetAccountsData(Data,AccountsDataStr)
{
    if(!Data || !Data.result)
        return;
    
    if($("idBtRun"))
        $("idBtRun").style.display = (Data.arr.length ? '' : 'none');
    
    if(AccountsDataStr === WasAccountsDataStr)
        return;
    WasAccountsDataStr = AccountsDataStr;
    
    var arr = Data.arr;
    var Select = $("idAccount");
    if(arr.length !== Select.options.length)
    {
        var options = Select.options;
        options.length = arr.length;
    }
    
    MaxBlockNum = GetCurrentBlockNumByTime();
    
    if(document.activeElement !== $("idTo"))
    {
        var dataList = $("idToList");
        if(dataList)
        {
            dataList.innerHTML = "";
        }
    }
    
    SetGridData(arr, "grid_accounts", "idMyTotalSum");
    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        Item.MyAccount = true;
        
        var Num = ParseNum(Item.Num);
        if(!MapAccounts[Num])
            MapAccounts[Num] = {};
        CopyObjKeys(MapAccounts[Num], Item);
        
        var option = Select.options[i];
        var StrText = GetAccountText(Item, Num, 1);
        if(option.text !== StrText)
            CheckNameAccTo();
        option.value = Num;
        option.text = StrText;
        
        if(!dataList)
            continue;
        var Options = document.createElement('option');
        Options.value = Num;
        Options.label = StrText;
        dataList.appendChild(Options);
    }
    
    var CurentValue = LoadMapAfter["idAccount"];
    if(CurentValue)
    {
        Select.value = CurentValue;
        delete LoadMapAfter["idAccount"];
    }
    
    SetCurCurencyName();
}

function CurTransactionToForm(bForce)
{
    var Item = $("idTransaction");
    if(Item && (Item.className === "" || bForce))
        Item.value = GetJSONFromTransaction(CurrentTR);
}

function CheckNameAccTo()
{
    MaxBlockNum = GetCurrentBlockNumByTime();
    var ToID = ParseNum($("idTo").value);
    if(!MapAccounts[ToID] || (MapAccounts[ToID].MustUpdate && MapAccounts[ToID].MustUpdate >= MaxBlockNum))
    {
        
        GetData("GetAccountList", {StartNum:ToID}, function (Data)
        {
            if(Data && Data.result === 1 && Data.arr.length)
            {
                var Item = Data.arr[0];
                Item.UpdateData = Date.now();
                MapAccounts[Item.Num] = Item;
                SetNameAccTo();
            }
        });
    }
    SetNameAccTo();
}

function SetNameAccTo()
{
    var Str = "";
    var ToID = $("idTo").value.trim();
    var Item = MapAccounts[ToID];
    var StrTo = GetAccountText(Item, ToID, 1);
    
    var element = $("idNameTo");
    if(!element)
    {
        element = $("idNameTo2");
    }
    else
    {
        StrTo = "To: " + StrTo;
    }
    
    if(!ToID || ToID === "0")
    {
        element.innerText = "";
        return;
    }
    
    if(element && element.innerText !== StrTo)
    {
        element.innerText = StrTo;
        if(Item && Item.MyAccount)
            element.className = "smallbold";
        else
            element.className = "";
    }
}

function GetAccountText(Item,Num,bGetSum)
{
    if(Item)
    {
        var text = Item.Name;
        if(!text || text.length === 0)
            text = Num;
        else
            text = "" + Num + ". " + text;
        if(bGetSum)
        {
            var StrSum = SUM_TO_STRING(Item.Value, Item.Currency, 1);
            text += " : " + StrSum;
        }
        
        return text;
    }
    else
    {
        if(IsPublicAddr(Num))
            return Num;
        else
            return "<Error address>";
    }
}

function OnEditIdTo()
{
    CheckNameAccTo();
    OnEditTransactionFields();
}
function OnEditTransactionFields()
{
    if(IsVisibleBlock("edit_transaction"))
        CreateTransaction();
    SetCurCurencyName();
    SaveValues();
}
function SetCurCurencyName()
{
    var idCoin = $("idCoinName");
    if(!idCoin)
        return;
    
    var Num = ParseNum($("idAccount").value);
    var Item = MapAccounts[Num];
    if(Item)
    {
        idCoin.innerText = CurrencyName(Item.Currency);
    }
}

function IsPublicAddr(StrTo)
{
    if(StrTo.length === 66 && (StrTo.substr(0, 2) === "02" || StrTo.substr(0, 2) === "03") && IsHexStr(StrTo))
        return 1;
    else
        return 0;
}

function CreateTransaction(F,CheckErr,Run)
{
    CheckNameAccTo();
    CheckSending();
    
    var FromID = ParseNum($("idAccount").value);
    
    if(CheckErr && FromID === 0)
    {
        SetError("Select valid 'From account'");
        return;
    }
    
    var StrTo = $("idTo").value.trim();
    var bFindAcc = 0;
    var ToPubKey = "";
    var ToID = ParseNum(StrTo);
    if(StrTo !== "" + ToID)
    {
        if(IsPublicAddr(StrTo))
        {
            ToID = 0;
            ToPubKey = StrTo;
            if(ToPubKey === window.PubKeyStr)
                bFindAcc = 1;
        }
        else
        {
            if(CheckErr)
                SetError("Valid 'Pay to' - required!");
            return;
        }
    }
    
    if(CheckErr && ToID <= 0 && ToPubKey === "" && !AttachItem)
    {
        SetError("Valid 'Pay to' - required!!");
        return;
    }
    
    var Description = $("idDescription").value.substr(0, 200);
    
    var StrSum = $("idSumSend").value;
    
    var indDot = StrSum.indexOf(".");
    if(indDot >= 0)
    {
        var StrTER = StrSum.substr(0, indDot);
        var StrCENT = StrSum.substr(indDot + 1);
    }
    else
    {
        var StrTER = StrSum;
        var StrCENT = "0";
    }
    StrCENT = StrCENT + "000000000";
    var Coin = {SumCOIN:ParseNum(StrTER), SumCENT:ParseNum(StrCENT.substr(0, 9))};
    
    var Item = MapAccounts[FromID];
    var OperationID = GetOperationIDFromItem(Item);
    
    var AttachBody = [];
    if(AttachItem)
    {
        AttachBody = AttachItem.Data.Body;
        if(!AttachBody)
            AttachBody = [];
    }
    var ToPubKeyArr = [];
    if(ToPubKey)
        ToPubKeyArr = GetArrFromHex(ToPubKey);
    
    var TR = {Type:111, Version:3, OperationSortID:OperationID, FromID:FromID, OperationID:OperationID, To:[{PubKey:ToPubKeyArr,
            ID:ToID, SumCOIN:Coin.SumCOIN, SumCENT:Coin.SumCENT}], Description:Description, Body:AttachBody, Sign:CurrentTR.Sign, };
    TR.Version = 4;
    
    Object.defineProperties(TR, {bFindAcc:{configurable:true, writable:true, enumerable:false, value:bFindAcc}});
    Object.defineProperties(TR, {Run:{configurable:true, writable:true, enumerable:false, value:Run}});
    
    if(JSON.stringify(TR) === JSON.stringify(CurrentTR))
    {
        if(F)
            F(CurrentTR);
        return;
    }
    
    CurrentTR = TR;
    
    GetSignTransaction(TR, "", function (TR)
    {
        CurTransactionToForm(true);
        if(F)
            F(TR);
    });
}
function SignJSON(F)
{
    if($("idSignJSON").disabled)
        return;
    
    var TR = GetTransactionFromJSON();
    if(!TR)
        return;
    CurrentTR = TR;
    
    GetSignTransaction(TR, "", function (TR)
    {
        CurTransactionToForm(true);
        if(F)
            F();
    });
}

function CheckSending(bToStatus)
{
    MaxBlockNum = GetCurrentBlockNumByTime();
    var CanSend = IsPrivateMode();
    var StrButton = "Send";
    var StrButtonSign = "Sign JSON";
    if(!CanSend)
    {
        StrButton = " ";
        StrButtonSign = " ";
    }
    
    $("idSendButton").disabled = (!CanSend);
    $("idSendButton").value = StrButton;
    
    $("idSignJSON").disabled = (!CanSend);
    $("idSignJSON").value = StrButtonSign;
    
    return CanSend;
}

function AddWhiteList()
{
    var ToID = ParseNum($("idTo").value);
    if(ToID && $("idWhiteOnSend").checked)
        Storage.setItem("White:" + ToID, 1);
}
function SendMoneyBefore()
{
    if($("idSendButton").disabled)
        return;
    
    var ToID = ParseNum($("idTo").value);
    var Item = MapAccounts[ToID];
    if(Storage.getItem("White:" + ToID) || !$("idSumSend").value || Item && Item.MyAccount)
    {
        SendMoney();
    }
    else
    {
        var CoinAmount = COIN_FROM_FLOAT($("idSumSend").value);
        var StrTo = " to " + GetAccountText(Item, ToID);
        $("idWhiteOnSend").checked = 0;
        $("idOnSendText").innerHTML = "<B style='color:#ff4534'>" + STRING_FROM_COIN(CoinAmount) + "</B> " + $("idCoinName").innerText + StrTo;
        
        if($("idSumSend").value >= 100000)
        {
            $("idOnSendText").innerHTML += "<BR><DIV style='color: yellow;'>WARNING: You are about to send a very large amount!</DIV>";
        }
        
        SetVisibleBlock("idBlockOnSend", 1);
        SetImg(this, 'idBlockOnSend');
    }
}
function SendMoney2()
{
    AddWhiteList();
    SendMoney();
}
function SendMoney(F)
{
    if(!CanSendTransaction)
    {
        SetError("Can't Send transaction");
        return;
    }
    
    CheckSending(true);
    if($("idSendButton").disabled)
        return;
    
    SetVisibleBlock("idBlockOnSend", 0);
    
    if(!F)
        F = ClearAttach;
    CreateTransaction(SendMoneyTR, true, F);
}

function GetJSONFromTransaction(TR)
{
    var TR2 = JSON.parse(JSON.stringify(TR));
    for(var i = 0; i < TR2.To.length; i++)
    {
        var Item = TR2.To[i];
        
        Item.PubKey = GetHexFromArr(Item.PubKey);
    }
    
    TR2.Body = GetHexFromArr(TR2.Body);
    TR2.Sign = GetHexFromArr(TR2.Sign);
    
    var Str = JSON.stringify(TR2, "", 4);
    return Str;
}
function GetTransactionFromJSON()
{
    var Str = $("idTransaction").value;
    try
    {
        var TR = JSON.parse(Str);
    }
    catch(e)
    {
        SetError(e);
        return undefined;
    }
    
    for(var i = 0; i < TR.To.length; i++)
    {
        var Item = TR.To[i];
        Item.PubKey = GetArrFromHex(Item.PubKey);
        if(Item.SumTER && Item.SumCOIN === undefined)
        {
            Item.SumCOIN = Item.SumTER;
            delete Item.SumTER;
        }
    }
    
    TR.Body = GetArrFromHex(TR.Body);
    TR.Sign = GetArrFromHex(TR.Sign);
    
    return TR;
}

function SendMoneyJSON()
{
    if(!CanSendTransaction)
    {
        SetError("Can't Send transaction");
        return;
    }
    
    var TR = GetTransactionFromJSON();
    if(!TR)
        return;
    
    SendMoneyTR(TR);
}
function SignAndSendFromJSON()
{
    SignJSON(SendMoneyJSON);
}

function GetTransactionText(TR,key)
{
    var Str;
    if(TR)
    {
        if(TR.Type === TYPE_TRANSACTION_CREATE)
        {
            Str = "New account " + TR.Name.substr(0, 20);
        }
        else
            if(TR.Type === 111)
            {
                var MapItem = {};
                var ValueTotal = {SumCOIN:0, SumCENT:0};
                
                Str = "" + TR.FromID + "/" + TR.OperationID + " to ";
                for(var i = 0; i < TR.To.length; i++)
                {
                    var Item = TR.To[i];
                    
                    if(Item.ID === TR.FromID || MapItem[Item.ID])
                        continue;
                    MapItem[Item.ID] = 1;
                    
                    ADD(ValueTotal, Item);
                    if(i === 0)
                        Str += "[";
                    if(Str.length < 16)
                    {
                        if(i > 0)
                            Str += ",";
                        if(Item.ID || (Item.PubKey && Item.PubKey.length !== 66))
                            Str += Item.ID;
                        else
                            Str += GetHexFromArr(Item.PubKey).substr(0, 8);
                    }
                    else
                        if(Str.substr(Str.length - 1) !== ".")
                            Str += "...";
                }
                Str += "] " + SUM_TO_STRING(ValueTotal);
                Str += " " + (TR.Description.substr(0, 20)).replace(/\n/g, "");
            }
    }
    else
    {
        if(key)
            Str = key;
        else
            Str = "";
    }
    return Str;
}

function SendMoneyTR(TR)
{
    var Body = GetArrFromTR(TR);
    WriteArr(Body, TR.Sign, 64);
    
    SendTransactionNew(Body, TR, undefined, function (Err,TR,Body)
    {
        if(Err)
            return;
    });
}

function ClearTransaction()
{
    PayList = [];
    ClearAttach();
    CheckSendList(1);
    
    var arr = ["idAccount", "idTo", "idSumSend", "idDescription"];
    for(var i = 0; i < arr.length; i++)
    {
        $(arr[i]).value = "";
    }
    SaveValues();
    CreateTransaction();
}

function StartEditTransactionJSON()
{
    var Item = $("idTransaction");
    Item.className = "smallbold";
}

function EditJSONTransaction()
{
    var name = "edit_transaction";
    
    var Item = $("idTransaction");
    if(IsVisibleBlock(name))
    {
        SetVisibleBlock(name, false);
        Item.className = "";
    }
    else
    {
        CreateTransaction();
        SetVisibleBlock(name, true);
        Item.className = "";
    }
}


var glNumPayCount = 0;
function GetInvoiceHTML(item,onclick,classstr)
{
    if(!item.num)
    {
        glNumPayCount++;
        item.num = glNumPayCount;
    }
    var idname = "idSendInvoice" + item.num;
    var value = "";
    if(item.Data.Amount)
        value += "<B>" + escapeHtml(item.Data.Amount) + "</B> Tera";
    else
        value += "<B style='color:green'>No pay</B>";
    
    value += "&#x00A;" + item.num + ". " + escapeHtml(item.Data.name);
    return "<button id='" + idname + "' onclick='" + onclick + "' class='" + classstr + "'>" + value + "</button>";
}

function AddSendList(item)
{
    PayList.push({Data:item});
}

function CheckSendList(bRedraw)
{
    TitleWarning = PayList.length;
    if(AttachItem)
        TitleWarning++;
    
    var Str = Storage.getItem("InvoiceList");
    if(!Str && !bRedraw)
        return;
    
    if(!bRedraw)
    {
        SelectTab("TabSend");
    }
    
    if(Str)
    {
        var arr = JSON.parse(Str);
        for(var i = 0; i < arr.length; i++)
        {
            AddSendList(arr[i]);
        }
        Storage.setItem("InvoiceList", "");
    }
    
    var idList = $("idSendList");
    if(PayList.length)
    {
        idList.innerHTML = "<DIV id='PaiListInfo'>Select the item you want to sign (pay) and send to blockchain:</DIV>";
        for(var i = 0; i < PayList.length; i++)
        {
            var item = PayList[i];
            idList.innerHTML += GetInvoiceHTML(item, "UseInvoice(" + i + ")", "btinvoice");
        }
        
        if(AttachItem === undefined)
            UseInvoice(0);
    }
    else
    {
        idList.innerHTML = "";
    }
}
setInterval(CheckSendList, 200);

function UseInvoice(Num)
{
    var item = PayList[Num];
    if(item.Data.From)
        $("idAccount").value = item.Data.From;
    
    $("idTo").value = item.Data.To;
    $("idSumSend").value = item.Data.Amount;
    $("idDescription").value = item.Data.Description;
    
    PayList.splice(Num, 1);
    
    AttachItem = item;
    $("idAttach").innerHTML = GetInvoiceHTML(AttachItem, "OpenAttach()", "btinvoice btinvoice_use");
    
    CheckSendList(1);
}

function ClearAttach()
{
    AttachItem = undefined;
    if($("idAttach"))
        $("idAttach").innerHTML = "";
}

function OpenAttach()
{
    if(AttachItem)
    {
        var Data2 = JSON.parse(JSON.stringify(AttachItem.Data));
        if(Data2.Body)
            Data2.Body = GetHexFromArr(Data2.Body);
        delete Data2.TransferSecret;
        alert("DATA:\n" + JSON.stringify(Data2, "", 4));
    }
}

var CURRENCY, PUBKEY, NAME, SMART;
function SendTrCreateAccWait(Currency,PubKey,Name,Smart)
{
    CURRENCY = Currency;
    PUBKEY = PubKey;
    NAME = Name;
    SMART = Smart;
    setTimeout(function ()
    {
        SendTrCreateAcc(CURRENCY, PUBKEY, NAME, 0, SMART, 0, 0);
    }, 50);
}

function SendTrCreateAcc(Currency,PubKey,Description,Adviser,Smart,bFindAcc,bAddToPay)
{
    var TR = GetTrCreateAcc(Currency, PubKey, Description, Adviser, Smart);
    var Body = GetBodyCreateAcc(TR);
    TR.bFindAcc = 1;
    
    if(bAddToPay)
    {
        var Item = {name:Description, To:0, Amount:CONFIG_DATA.PRICE_DAO.NewAccount, Description:"Create acc: " + Description, Body:Body,
        };
        AddToInvoiceList(Item, 1);
    }
    else
    {
        
        SendTransactionNew(Body, TR);
    }
    
    $("idAccountName").value = "";
    CancelCreateAccount();
}

function DoChangeSmart(NumAccount,WasSmart,SmartNum)
{
    if(SmartNum !== null && SmartNum != WasSmart)
    {
        var Smart = parseInt(SmartNum);
        if(Smart)
        {
            GetData("GetDappList", {StartNum:Smart, CountNum:1}, function (Data)
            {
                if(Data && Data.result && Data.arr.length === 1)
                {
                    SetSmartToAccount(NumAccount, Smart);
                }
                else
                {
                    SetError("Error smart number");
                }
            });
        }
        else
        {
            SetSmartToAccount(NumAccount, Smart);
        }
    }
}
function ChangeSmart(NumAccount,WasSmart)
{
    if(!IsPrivateMode())
    {
        SetError("Pls, open wallet");
        return 0;
    }
    
    var SmartNum = prompt("Enter smart number:", WasSmart);
    DoChangeSmart(NumAccount, WasSmart, SmartNum);
}

function SetSmartToAccount(NumAccount,Smart)
{
    var OperationID = 0;
    var Item = MapAccounts[NumAccount];
    if(Item)
    {
        OperationID = Item.Value.OperationID;
    }
    OperationID++;
    
    var TR = {Type:140, Account:NumAccount, Smart:Smart, FromNum:NumAccount, Version:4, Reserve:[], OperationID:OperationID, Sign:"",
    };
    
    var Body = [];
    WriteByte(Body, TR.Type);
    WriteUint(Body, TR.Account);
    WriteUint32(Body, TR.Smart);
    Body.push(TR.Version);
    WriteArr(Body, TR.Reserve, 9);
    WriteUint(Body, TR.FromNum);
    WriteUint(Body, TR.OperationID);
    
    SendTrArrayWithSign(Body, TR.Account, TR);
}

function CheckLengthAccDesription(name,Length)
{
    var Str = $(name).value.substr(0, Length + 1);
    var arr = toUTF8Array(Str);
    var Len = Length - arr.length;
    if(Len < 0)
        SetError("Bad length");
    else
        SetStatus("Lost: " + Len + " bytes");
}
