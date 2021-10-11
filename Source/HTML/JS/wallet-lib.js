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

function SetMapAccount(Item)
{
    var Num = ParseNum(Item.Num);
    if(!MapAccounts[Num])
        MapAccounts[Num] = {};
    CopyObjKeys(MapAccounts[Num], Item);
}

var WasAccountsDataStr;
function SetAccountsData(Data,AccountsDataStr)
{
    if(!Data || !Data.result)
        return;
    if(CONFIG_DATA.NotInit)
        return;
    
    if($("idBtRun"))
        $("idBtRun").style.display = (Data.arr.length ? '' : 'none');
    
    if(AccountsDataStr === WasAccountsDataStr)
        return;
    WasAccountsDataStr = AccountsDataStr;
    
    var arr = Data.arr;

    ASetGridData(arr, "grid_accounts", "idMyTotalSum",0,0);
    var ArrT=AccToListArr(arr);
    FillSelect("idAccount",ArrT);

    //console.log(idAccount.value);

    MaxBlockNum = GetCurrentBlockNumByTime();
    
    if(document.activeElement !== $("idTo"))
    {
        var dataList = $("idToList");
        if(dataList)
        {
            dataList.innerHTML = "";
        }
    }


    for(var i = 0; arr && i < arr.length; i++)
    {
        var Item = arr[i];
        Item.MyAccount = true;

        var Num = ParseNum(Item.Num);
        SetMapAccount(Item);



        if(dataList)
        {
            var Options = document.createElement('option');
            Options.value = Num;
            Options.label = GetAccountText(Item, Num, 1);
            dataList.appendChild(Options);
        }
    }


    var CurrentValue = LoadMapAfter["idAccount"];
    if(CurrentValue)
    {
        idAccount.value = CurrentValue;
        delete LoadMapAfter["idAccount"];
    }
    
    SetCurCurrencyName();
    UpdateTokenList();


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
    var ToID = GetSendAccTo();
    if(!MapAccounts[ToID] || (MapAccounts[ToID].MustUpdate && MapAccounts[ToID].MustUpdate >= MaxBlockNum))
    {
        
        GetData("GetAccountList", {StartNum:ToID}, function (Data)
        {
            if(Data && Data.result === 1 && Data.arr.length)
            {
                var Item = Data.arr[0];
                Item.UpdateData = Date.now();
                SetMapAccount(Item);
                //MapAccounts[Item.Num] = Item;
                SetNameAccTo();
            }
        });
    }
    SetNameAccTo();
}

function SetNameAccTo()
{
    var Str = "";
    var ToID = GetSendAccTo();
    var Item = MapAccounts[ToID];
    var StrTo = GetAccountText(Item, ToID, 1);
    
    var element = $("idNameTo");
    if(!element)
    {
        element = $("idNameTo2");
    }
    else
    {
        StrTo = "To " + StrTo;
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
            text = "" + Num + " " + text;
        if(bGetSum)
        {
            var Arr=AccToListArr([Item]);
            return Arr[0].text;
            // console.log(Arr[0])
            // var StrSum = SUM_TO_STRING(Item.Value, Item.Currency, 1);
            // text += " (" + StrSum + ")";
        }
        
        return text;
    }
    else
    {
        return "<Error address>";
    }
}

function OnSelectAccountFrom()
{
    OnEditTransactionFields();
    UpdateTokenList();
}

//NFT
function IsERCMode()
{
    return 1;
}


function UpdateTokenList()
{
    var Account=+idAccount.value;
    var Item=MapAccounts[idAccount.value];
    //console.log("Item=",Item)
    FillListNFT(idListNFT,Item?Item.BalanceArr:undefined,Account?Account*10000:0, "", 1,0,Account);
}

function GetSelectedToken()
{
    if(!idAccount.value)
        return;

    var CurSelect=idListNFT.CurSelect;
    if(!CurSelect)//default mode
        CurSelect=idListNFT.FirstSelect;

    if(!CurSelect || !$(CurSelect))
        return;

    var Element=$(CurSelect);
    return {
        Token:Element.dataset.token,
        Currency:+Element.dataset.currency,
        ID:Element.dataset.id,
        Amount:+Element.dataset.amount,
        element_id:Element.id
    };
}

function OnEditIdTo()
{
    CheckNameAccTo();
    OnEditTransactionFields();
}
function OnEditTransactionFields()
{
    if(IsVisibleBlock("edit_transaction"))
        CreateTransferTransaction();
    SetCurCurrencyName();
    SaveValues();
}
function SetCurCurrencyName()
{
    var idCoin = $("idCoinName");
    if(!idCoin)
        return;
    var CurToken=GetSelectedToken();
    if(!CurToken)
        return;

    idCoin.innerText=CurToken.Token;
 }

function IsPublicAddr(StrTo)
{
    if(StrTo.length === 66 && (StrTo.substr(0, 2) === "02" || StrTo.substr(0, 2) === "03") && IsHexStr(StrTo))
        return 1;
    else
        return 0;
}

async function CreateTransferTransaction(F,CheckErr,Run)
{
    CheckNameAccTo();
    CheckSending();
    
    var FromID = ParseNum($("idAccount").value);
    
    if(CheckErr && FromID === 0)
    {
        SetError("Select valid 'From account'");
        return;
    }
    
    var StrTo = GetSendAccTo();
    var bFindAcc = 0;
    var ToPubKey = "";
    var ToID = ParseNum(StrTo);
    
    if(CheckErr && ToID <= 0 && ToPubKey === "" && !AttachItem)
    {
        SetError("Valid 'Pay to' - required!!");
        return;
    }
    
    var Description = $("idDescription").value.substr(0, 200);
    
    var StrToAll = GetSendAccTo(1);
    var Index = StrToAll.indexOf(":");
    if(Index > 0)
    {
        var ToNext = StrToAll.substr(Index + 1);
        if(Description)
            Description = ToNext + ":" + Description;
        else
            Description = ToNext;
    }
    
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
    var OperationID = GetOperationIDFromItem(Item, CheckErr);
    
    var AttachBody = [];
    if(AttachItem)
    {
        AttachBody = AttachItem.Data.Body;
        if(!AttachBody)
            AttachBody = [];
    }

    var CurToken=GetSelectedToken();
    if(!CurToken)
        return;
    var Amount=FLOAT_FROM_COIN(Coin);
    if(Amount && CurToken.Amount<Amount)
        return SetError("Insufficient funds on the account: "+FromID)



    var TR={Version:4,OperationID:OperationID, FromID:FromID,Description:Description, Body:AttachBody};
    var BVersion=await AGetFormat("BLOCKCHAIN_VERSION");
    var Format=await AGetFormat("FORMAT_MONEY_TRANSFER"+(BVersion>=2?"5":"3"));
    TR.Type=await AGetFormat("TYPE_MONEY_TRANSFER"+(BVersion>=2?"5":"3"));
    if(BVersion<2)
    {
        TR.To=[{PubKey:[], ID:ToID, SumCOIN:Coin.SumCOIN,SumCENT:Coin.SumCENT}];
    }
    else
    {
        TR.TxTicks=35000;
        TR.TxMaxBlock=GetCurrentBlockNumByTime()+120;
        TR.ToID = ToID;
        TR.Amount=Coin;
        TR.CodeVer=await AGetFormat("CodeVer");
        if(Item.Currency!=CurToken.Currency)//if not tokengenerate mode
        {
            TR.Currency = CurToken.Currency;
            TR.TokenID = CurToken.ID;
        }
    }



    Object.defineProperties(TR, {bFindAcc:{configurable:true, writable:true, enumerable:false, value:bFindAcc}});
    Object.defineProperties(TR, {Run:{configurable:true, writable:true, enumerable:false, value:Run}});


    // if(JSON.stringify(TR) === JSON.stringify(CurrentTR))
    // {
    //     if(F)
    //         F(CurrentTR);
    //     return;
    // }
    //
    // CurrentTR = TR;


    var Body=SerializeLib.GetBufferFromObject(TR, Format, {});
    Body.length-=64;
    if(F)
    {
        SendTrArrayWithSign(Body, TR.FromID, TR, function (Err, TR, Body, Str)
        {
            //console.log(Str);
            if(Err)
                SetError(Str);
            else
                SetStatus(Str);
        });
    }

    // return ;
    //
    // GetSignTransaction(TR, "", function (TR)
    // {
    //     console.log(TR);
    //     return;
    //
    //     CurTransactionToForm(true);
    //     if(F)
    //         F(TR);
    // });
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
    
    if(!$("idSendButton"))
        return;
    
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

function GetSendAccTo(bAllPath)
{
    
    var Str = $("idTo").value;
    var StrAll = Str.trim();
    var Str = StrAll;
    var Index = Str.indexOf(":");
    if(Index > 0)
    {
        Str = Str.substr(0, Index);
    }
    
    if(ParseNum(Str) == Str)
    {
        if(bAllPath)
            return StrAll;
        else
            return Str;
    }
    
    return "";
}

// function AddWhiteList()
// {
//     var StrWhite = GetSendAccTo(1);
//     if(StrWhite && $("idWhiteOnSend").checked)
//         Storage.setItem("White:" + NETWORK_ID + ":" + StrWhite, 1);
// }

function SendMoneyTest()
{
    SendMoney();
    $("idAccount").value =  + $("idAccount").value + 1;
}


// function SendMoney2()
// {
//     AddWhiteList();
//     SendMoney();
// }
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


    // if(IsERCMode())
    // {
    //     return SendToken();
    // }


    
    if(!F)
        F = ClearAttach;
    CreateTransferTransaction(SendMoneyTR, true, F);
}

// async function SendToken()
// {
//     var Element=$(idListNFT.CurSelect);
//     if(!Element || !Element.dataset || !Element.dataset.token)
//         return SetError("Pls, select token");
//     var Token=Element.dataset.token;
//     var TokenID=Element.dataset.id;
//
//     var Params=
//         {
//             Token:Token,
//             ID:TokenID,
//             To:+idTo.value,
//             Amount:+idSumSend.value,
//             Description:idDescription.value,
//         };
//
//     var arr = ["Token","To", "Amount"];
//     for(var i = 0; i < arr.length; i++)
//     {
//         if(!Params[arr[i]])
//             return SetError("Pls, type "+arr[i]);
//     }
//
//     var Item=await AGetAccount(Params.To);
//     if(!Item || Item.Currency)
//         return SetError("Error: Invalid recipient account = "+Params.To);
//
//
//     if(CONFIG_DATA.COIN_STORE_NUM)
//         MSendCall(CONFIG_DATA.COIN_STORE_NUM,"Transfer",Params,[],+idAccount.value);
// }


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
    
    SendTransactionNew(Body, TR, function (Err,TR,Body)
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

    UpdateTokenList();
    SaveValues();
    CreateTransferTransaction();
}

function StartEditTransactionJSON()
{
    var Item = $("idTransaction");
    Item.className = "smallbold";
}

// function EditJSONTransaction()
// {
//     var name = "edit_transaction";
//
//     var Item = $("idTransaction");
//     if(IsVisibleBlock(name))
//     {
//         SetVisibleBlock(name, false);
//         Item.className = "";
//     }
//     else
//     {
//         CreateTransferTransaction();
//         SetVisibleBlock(name, true);
//         Item.className = "";
//     }
// }


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
    //PayList.push({Data:item});
    PayList=[{Data:item}];
    UseInvoice(0);
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
    
    // var idList = $("idSendList");
    // if(PayList.length)
    // {
    //     idList.innerHTML = "<DIV id='PayListInfo'>Select the item for send:</DIV>";
    //     for(var i = 0; i < PayList.length; i++)
    //     {
    //         var item = PayList[i];
    //         idList.innerHTML += GetInvoiceHTML(item, "UseInvoice(" + i + ")", "btinvoice");
    //     }
    //
    //     if(AttachItem === undefined)
    //         UseInvoice(0);
    // }
    // else
    // {
    //     idList.innerHTML = "";
    // }
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
    
    //CheckSendList(1);
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
            GetData("GetDappList", {StartNum:Smart, CountNum:1,Fields:["Num","ShortName"]}, function (Data)
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
        if(Item.Value.Smart===Smart)
            return SetStatus("Smart is empty");
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

function DoRemoveAccount(ID)
{
    //console.log("Remove account: "+ID);

    var Item = MapAccounts[ID];
    if(!Item)
        return;
    var OperationID = Item.Value.OperationID + 1;

    var Name = "DEL:"+Item.Name;
    var PubKey = "000000000000000000000000000000000000000000000000000000000000000000";
    //var PubKey = "026A04AB98D9E4774AD806E302DDDEB63BEA16B5CB5F223EE77478E861BB583EB3";//AA

    var Body = [];
    WriteByte(Body, TYPE_TRANSACTION_ACC_CHANGE);
    WriteUint(Body, OperationID);
    WriteUint(Body, ID);

    WriteArr(Body, GetArrFromHex(PubKey), 33);
    WriteStr(Body, Name, 40);

    for(var i = 0; i < 10; i++)
        Body.push(0);

    SendTrArrayWithSign(Body, ID);
    SetStatus("Remove account: "+ID)
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

function PasueBt(btn)
{
    btn.disabled = true;
    setTimeout(function ()
    {
        btn.disabled = false;
    }, 1000);
}


function SetAllSum()
{
    var CurToken = GetSelectedToken();
    if(CurToken)
        $("idSumSend").value = CurToken.Amount;
}
