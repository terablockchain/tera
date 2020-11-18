/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

window.GlBackgroundColor = "#202731";

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
    }
    else
        if(name === "TabExplorer")
        {
        }
        else
            if(name === "TabDapps")
            {
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

function ViewCurrentNew(Def,flag,This)
{
    DropDownClearAllActive();
    This.classList.add("active");
}

function ViewConstant()
{
    openModal('idBlockConstSet');
    $("idConstant").value = JSON.stringify(CONFIG_DATA.CONSTANTS, "", 4);
}

function ViewOpenWallet()
{
    openModal('idBlockPasswordGet');
    itemPasswordGet.onkeydown = OnEnterPas1;
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
    openModal('idBlockEditWallet');
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

function SaveNetParams()
{
    
    var Const = {};
    Const.HTTP_PORT_NUMBER = $("idHTTPPort").value;
    Const.HTTP_PORT_PASSWORD = $("idHTTPPassword").value;
    
    Const.JINN_IP = $("idIP").value;
    Const.JINN_PORT = $("idPort").value;
    Const.AUTODETECT_IP = $("idAutoDetectIP").checked;
    
    GetData("SaveConstant", Const, function (Data)
    {
        SetStatus("SaveNetParams");
    });
}

function EditJSONTransaction()
{
    CreateTransaction();
    openModal('idBlockEditJson');
}

function TruncateBlockChain()
{
    DoBlockChainProcess("TruncateBlockChain", "Truncate last %1 blocks", "idBlockCount2");
}
