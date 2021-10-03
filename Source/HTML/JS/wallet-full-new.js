/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


function PrepareToggleTab()
{
    let tabs = document.querySelectorAll(".tab");
    let tabContents = document.querySelectorAll(".tab-content");
    
    for(var n = 0; n < tabs.length; n++)
    {
        let Item = tabs[n];
        let Content = tabContents[n];
        Item.addEventListener("click", function ()
        {
            var parent = Item.parentNode;
            
            for(let i = 0; i < tabs.length; i++)
            {
                if(parent !== tabs[i].parentNode)
                    continue;
                
                tabs[i].classList.remove("active");
                tabContents[i].classList.remove("active");
            }
            Item.classList.add("active");
            Content.classList.add("active");
        });
    }
}

function PrepareDropdownToggle()
{
    const drop = document.querySelectorAll(".dropdown__item");
    drop.forEach(function (item)
    {
        item.addEventListener("click", function (event)
        {
            event.preventDefault();
            let target = event.target;
            for(var i = 0; i < drop.length; i++)
            {
                if(drop[i] != item)
                {
                    drop[i].classList.remove("active");
                }
            }
            if(target.classList.contains("drop"))
            {
                item.classList.toggle("active");
            }
        });
    });
}

function InitFullMain()
{
    PrepareDropdownToggle();
    
    PrepareToggleTab();
    var items = document.querySelectorAll(".doclose");
    items.forEach(function (item)
    {
        item.addEventListener("click", function (e)
        {
            closeModal();
        });
    });
}

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
    
    if(name === "TabAccounts" || name === "TabSend")
    {
        UpdatesAccountsData(1);
    }
    else
        if(name === "TabExplorer")
        {
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

function DropDownClearAllActive()
{
    let drop = document.querySelectorAll(".drop_down");
    drop.forEach(function (item)
    {
        item.classList.remove("active");
    });
}

function ViewCurrent(Def,flag,This)
{
    DropDownClearAllActive();
    if(ViewCurrentInner(Def, flag) && This)
        This.classList.add("active");
}

function ViewConstant()
{
    openModal('idBlockConstSet', 'idBtnConstSave');
    $("idConstant").value = JSON.stringify(CONFIG_DATA.CONSTANTS, "", 4);
}

function ViewOpenWallet()
{
    openModal('idBlockPasswordGet', 'idBtnEnterPassword');
    //itemPasswordGet.onkeydown = OnEnterPas1;
    itemPasswordGet.value = "";
    itemPasswordGet.focus();
}

function EditPrivateKey()
{
    if(IsPrivateMode())
    {
        $("idKeyNew").value = PrivKeyStr;
    }
    else
    {
        $("idKeyNew").value = PubKeyStr;
    }
    SetVisibleItemByTypeKey();
    openModal('idBlockEditWallet', 'idBtnSaveKey');
}
function NewPrivateKey()
{
    var arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    var Str = GetHexFromArr(sha3(arr));
    
    $("idKeyNew").value = Str;
    SetVisibleItemByTypeKey();
}

function SetVisibleItemByTypeKey()
{
    var StrPrivHex = $("idKeyNew").value;
    if(StrPrivHex && window.SignLib)
    {
        var Str;
        var PrivKeyArr = GetArrFromHex($("idKeyNew").value);
        if(PrivKeyArr.length === 33)
            Str = $("idKeyNew").value;
        else
            Str = GetHexFromArr(SignLib.publicKeyCreate(PrivKeyArr, 1));
        
        $("idPubKey").value = Str;
    }
}

// function EditJSONTransaction()
// {
//     CreateTransferTransaction();
//     openModal('idBlockEditJson', 'idBtnSendJSON');
// }

function TruncateBlockChain()
{
    DoBlockChainProcess("TruncateBlockChain", "Truncate last %1 blocks", "idBlockCount2");
}

function RetChangeSmart(Item)
{
    var StrName = RetOpenDapps(Item.SmartObj, 1, Item.Num);
    return '<div class="smart_name">' + StrName + '<div class="dots" onclick="ChangeSmart(' + Item.Num + ',' + Item.Value.Smart + ')"><img src="./img/dots.svg"></div></div>';
}

function RetOpenDapps(Item,bNum,AccountNum)
{
    if(!Item)
        return "<div></div>";
    var Name = escapeHtml(Item.Name);
    if(bNum)
        Name = "" + Item.Num + "." + Name;
    
    var StrOpen;
    if(Item.HTMLLength > 0)
        StrOpen = 'class="smart_coin pointer" onclick="OpenDapps(' + Item.Num + ',' + AccountNum + ',1)"';
    else
        StrOpen = 'class="smart_coin"';
    
    var StrImg = RetIconDapp(Item);
    return '<div ' + StrOpen + '>' + StrImg + '<p class="smart_coin-text">' + Name + '</p> </div>';
}

function RetIconDapp(Item)
{
    return '<img src="' + RetIconPath(Item, 0) + '" class="smart_coin-img"> ';
}

function ChangeSmart(NumAccount,WasSmart)
{
    if(!IsPrivateMode())
    {
        SetError("Pls, open wallet");
        return 0;
    }
    
    var StrHtml = '<BR><BR><div class="myrow">' + '<p>Smart number:</p>' + '<input type="number" class="select__item input inputacc" id="idSmartNew" min="0" max="100000000" value="">' + '</div><BR><BR>';
    setTimeout(function ()
    {
        $("idSmartNew").focus();
        $("idSmartNew").value = WasSmart;
    }, 1);
    
    DoConfirm("Account change", StrHtml, function ()
    {
        var SmartNum =  + $("idSmartNew").value;
        DoChangeSmart(NumAccount, WasSmart, SmartNum);
    });
}

function ViewStatus()
{
    var id = $("idStatus");
    var Str1 = '<div class="row df_space" style="width:700px;margin-bottom: 20px;"><div class="shard-name">Shard: ' + window.SHARD_NAME + '</div><div>' + StrMainStatus + '</div><div></div></div>';
    var Str2 = '<div>' + StrNormalStatus + '</div>';
    
    id.innerHTML = Str1 + Str2;
}



async function SendMoneyBefore()
{
    SetStatus("");
    if($("idSendButton").disabled)
    {
        return;
    }


    var StrToID = GetSendAccTo();
    var StrWhite = GetSendAccTo(1);
    var Item = MapAccounts[StrToID];

    var CurToken=GetSelectedToken();
    if(!CurToken)
        return;

    //console.log("CurToken:",CurToken);


    $("idTokenHolder").innerHTML = GetCopyNFTCard(CurToken.element_id,CurToken.Token,CurToken.ID,idSumSend.value);

    var CoinAmount = COIN_FROM_FLOAT($("idSumSend").value);
    var StrTo = " to " + GetAccountText(Item, StrWhite);


    $("idOnSendSum").innerText = STRING_FROM_COIN(CoinAmount);


    $("idOnSendCoinName").innerText = CurToken.Token;
    $("idOnSendToName").innerText = StrTo;

    SetVisibleBlock("idOnSendWarning", +idSumSend.value >= 100000);
    SetVisibleBlock("idBtOnSend", Item ? "inline-block" : "none");

    SetVisibleBlock("idBlockOnSend", 1);

    openModal('idBlockOnSend', 'idBtOnSend');

}

function RetDescription(Item)
{
    return '<div class="desc">' + Item.Description + '</div>';
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
    document.body.className = "" + Select.value;
}

function SaveEditAccount()
{
    var ID = $("idAccountNumEdit").value;
    
    var Item = MapAccounts[ID];
    if(!Item)
        return;
    
    var Name = $("idAccountNameEdit").value;
    var PubKey = $("idPublicKeyEdit").value;
    
    var OperationID = GetOperationIDFromItem(Item, 1);
    
    var Body = [];
    WriteByte(Body, TYPE_TRANSACTION_ACC_CHANGE);
    WriteUint(Body, OperationID);
    WriteUint(Body, ID);
    
    WriteArr(Body, GetArrFromHex(PubKey), 33);
    WriteStr(Body, Name, 40);
    
    for(var i = 0; i < 10; i++)
        Body.push(0);
    
    SendTrArrayWithSign(Body, ID);
}

function GotNewSertificate()
{
    RunServerCode("global.glSertEngine.GetNewSertificate()", 0, 1);
}

function GotSertificateDate()
{
    GetData("SendDirectCode", {Code:"global.glSertEngine && glSertEngine.GetDateSertificate()", WEB:1}, function (Data)
    {
        if(Data && Data.text)
        {
            var SertDate = ParseNum(Data.text);
            if(SertDate)
            {
                SetVisibleBlock("idSertifGroup", 1);
                ToLog("HTTPS sertificate expires at: " + formatDate(new Date(SertDate)));
                $("idSertifDays").innerText = "" + Math.floor((SertDate - new Date()) / 3600 / 24 / 1000) + " days";
            }
            else
            {
                SetVisibleBlock("idSertifGroup", 0);
            }
        }
    });
}
