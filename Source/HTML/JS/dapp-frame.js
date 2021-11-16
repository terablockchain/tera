

var glDlgTransfer;
var glListTransfer=[];
var idTimerTransfer=0;

var TestLoadMode=0;
var TestLoadName="";
var bStatusTab;

function CorrectFrameSize()
{
    if(!bStatusTab)
    {
        idFrame.style.top=0;
        idFrame.style.height="100vh";
    }
}


//DAPP TRANSFER
window.onload=function()
{
    bStatusTab=!(location.href.indexOf("nostatus")>=0);
    SetVisibleBlock("idStatus",bStatusTab);
    SetVisibleBlock("idMenu",bStatusTab);



    InitMobileInterface();
    DoNewSession();
    InitTranslate();


    if(window.location.hash)
        OPEN_PATH=unescape(window.location.hash.substr(1));
    if(IsLocalClient())
    {
        DapNumber=window.location.search.substr(6);
        var CurMainServer=Storage.getItem("MainServer");
        if(CurMainServer)
        {
            SetMainServer(JSON.parse(CurMainServer));
        }
    }
    glSmart=parseInt(DapNumber);


    var Key=GetPubKey();
    GetData("DappInfo",{Smart:glSmart, Key:Key, Session:glSession, AllData:1}, function (SetData)
    {
        if(!SetData || !SetData.result)
            return;

        CONFIG_DATA=SetData;
        SMART=SetData.Smart;
        BASE_ACCOUNT=SetData.Account;
        if(!SMART)
            return SetError("Error load data-info from server");

        SetBlockChainConstant(SetData);
        document.title=SMART.Name;


        //if(CONFIG_DATA.NETWORK!=="MAIN-JINN.TERA")
        DAPPPREFIX="DAPP-"+CONFIG_DATA.NETWORK+"."+CONFIG_DATA.SHARD_NAME;

        InitMenu();

        if(CheckStorageDebug())
            return;


        var HTMLBlock,HTMLTr;
        //console.log("SMART",SMART)
        if(SMART.HTMLBlock)
        {
            HTMLBlock=SMART.HTMLBlock;
            HTMLTr=SMART.HTMLTr;
        }
        else
        {
            HTMLBlock=BASE_ACCOUNT.SmartState.HTMLBlock;
            HTMLTr=BASE_ACCOUNT.SmartState.HTMLTr;
        }
        if(HTMLBlock)
        {
            ToLog("Load HTML from: /file/"+HTMLBlock+"/"+HTMLTr);
            GetData("DappBlockFile",{BlockNum:HTMLBlock,TrNum:HTMLTr}, function (SetData)
            {
                if(SetData && SetData.result)
                {
                    CreateFrame(SetData.Body);
                }
            });
        }
        else
        {
            GetData("DappSmartHTMLFile",{Smart:glSmart}, function (SetData)
            {
                if(SetData && SetData.result)
                {
                    CreateFrame(SetData.Body);
                }
            });
        }


    });

    //LoadSignLib();

    window.addEventListener("popstate", function(event)
    {
        OPEN_PATH=unescape(window.location.hash.substr(1));
        if(!glProgramSetHash)
            SendMessage({cmd:"History",OPEN_PATH:OPEN_PATH});

    }, false);


    if(isMobile())
        SetMobileMode();


};


function SetLocationHash(Str)
{
    glProgramSetHash=1;
    window.location.hash=Str;
    glProgramSetHash=0;
}

function SetMobileMode()
{
    var newchild = document.createElement("meta")
    newchild.name = "viewport"
    newchild.content = "width=device-width, initial-scale=1.0";//, maximum-scale=1.0, user-scalable=0;
    window.parent.document.getElementsByTagName("head")[0].appendChild(newchild);
}


var idInstallApp=0;
function CheckInstall()
{
    if(!idInstallApp)
        idInstallApp=setInterval(RunCheckInstall,2000);
}

function RunCheckInstall()
{

}
function OpenWalletPage()
{
    OpenWindow(GetWalletLink());
}
function OpenSmartSrc()
{
    OpenWindow("/smart/"+glSmart);
}

//LIB
function IsPrivateMode(PrivKeyStr)
{
    if(Storage.getItem(WALLET_KEY_EXIT))
        return 0;

    return IsPrivateKey(PrivKeyStr);
}


function SetStatus(Str,bNoEscape)
{
    var id = $("idStatus");
    if(!bNoEscape)
    {
        if(Str)
            console.log(Str);
        Str = escapeHtml(Str);
    }
    id.innerHTML=Str;

}

function SetError(Str,bNoSound)
{
    if(Str)
        console.log("%c" + Str, "color:red;font-weight:bold;");
    SetStatus("<DIV style='color:red'><B>"+escapeHtml(Str)+"</B></DIV>",1);
}


function CreateNewWebKeys()
{
    var arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    var PrivKey=sha3(arr);
    SetPrivKey(GetHexFromArr(PrivKey));
    Storage.setItem("idPubKey",GetHexFromArr(SignLib.publicKeyCreate(PrivKey,1)));
    CONFIG_DATA.PubKey=GetPubKey();



}

var CountCreateNewAccount=0;
function CreateNewAccount(Currency,Name,PubKey,F,Context,Confirm)
{
    if(!CONFIG_DATA.WalletCanSign)
    {
        if(IsFullNode() || IsLockedWallet())
        {
            SetError("Pls, open wallet");
            return;
        }

        CreateNewWebKeys();
    }
    if(CountCreateNewAccount>20)
        return;
    CountCreateNewAccount++;

    if(!Name)
        Name=SMART.Name;
    if(PubKey===undefined)
        PubKey=CONFIG_DATA.PubKey;

    var TR=GetTrCreateAcc(Currency,PubKey,Name,0,SMART.Num);
    var Body=GetBodyCreateAcc(TR);
    SendTransactionNew(Body,TR,F,Context,Confirm);
}

function InstallApp()
{

    CreateNewAccount(BASE_ACCOUNT.Currency);

    if(idInstallApp)
    {
        clearInterval(idInstallApp);
        idInstallApp=setInterval(RunCheckInstall,30000);
    }

}

function ResetDapp()
{
    SetStatus("");
    DoNewSession();
    if(idInstallApp)
    {
        clearInterval(idInstallApp);
        idInstallApp=0;
    }
    glListTransfer=[];
    CloseTransferDlg();
}
function RunDappFromFile()
{
    CloseMenu();
    LoadDappFromFile();
}
function RunDappFromStorage()
{
    CloseMenu();
    ResetDapp();
    LoadDappFromStorage();
}



function LoadDappFromFile()
{
    $('idFile').onchange=function ()
    {
        ResetDapp();
        CreateFromFile();
    };
    $('idFile').click();
}
function ReloadDapp()
{
    ResetDapp();

    if(TestLoadMode==="FILE")
        CreateFromFile();
    else
    if(TestLoadMode==="STORAGE")
        CreateFromStorage();
    else
        window.location.reload();
}
function CreateFromFile()
{
    var file = $("idFile").files[0];
    var reader = new FileReader();
    reader.onload = function()
    {
        TestLoadMode="FILE";
        SetVisibleBlock("idRestart",1);
        var view = new Uint8Array(reader.result);
        var Str=Utf8ArrayToStr(view);
        if($("idFrame"))
            $("idFrame").outerHTML="";
        CreateFrame(Str);
        $("idRunItem").innerText="Runing DApp from: "+file.name;
    };
    if(file)
        reader.readAsArrayBuffer(file);
}

function CreateFromStorage()
{
    var ArrStr = localStorage["SMART-ProjectArray"];
    if(ArrStr)
    {
        var FindDapp=undefined;
        var ProjectArray = JSON.parse(ArrStr);
        for(var i=0;i<ProjectArray.length;i++)
        {
            var Dapp=ProjectArray[i];
            if(Dapp.Name===TestLoadName)
            {
                FindDapp = Dapp;
                break;
            }
        }
        if(!FindDapp)
            return SetError("Error dapp name: "+TestLoadName);
        //console.log("HTML:",Dapp.HTML.substr(0,100));
        if($("idFrame"))
            $("idFrame").outerHTML="";
        CreateFrame(FindDapp.HTML);
    }
}

function LoadDappFromStorage()
{
    DoConfirm("Storage","Load dapp name: <BR><BR> <INPUT type='string' id='idSmartName'>",function ()
    {
        TestLoadMode="STORAGE";
        SetVisibleBlock("idRestart",1);

        TestLoadName=idSmartName.value.trim();
        CreateFromStorage();
    });

}

function CheckStorageDebug()
{
    var Key="DAPP-DEBUG:"+glSmart;
    var Name=localStorage[Key];
    if(Name)
    {
        console.log("Load from storage:",Name)
        TestLoadMode="STORAGE";
        TestLoadName=Name;

        CreateFromStorage();
        return 1;
    }

}

function InitMenu()
{
    $("idCreateItem").innerText=$("idCreateItem").innerText.replace("NNN",SMART.Num);
}
var OpenMenu=0;
function OnClickMenu()
{
    DoVisibleMenu(!OpenMenu);
}
function CloseMenu()
{
    DoVisibleMenu(0);
}
function DoVisibleMenu(SetMenu)
{
    setTimeout(function ()
    {
        OpenMenu=SetMenu;
        $("idMenu").className="top "+(OpenMenu?"open":"close");
    },50);

}

window.onclick=function (t)
{
    if(OpenMenu)
    {
        CloseMenu();
    }
};
window.onkeydown = function (e)
{
    //ToLog("keyCode="+e.keyCode);
    switch (e.keyCode)
    {
        case 27:
            CloseTransferDlg();
            if(OpenMenu)
            {
                CloseMenu();
            }
            break;
        case 116:
            e.preventDefault();
            ReloadDapp();
            break;
        default:
    }
};


//TRANSLATE TRANSLATE TRANSLATE
//TRANSLATE TRANSLATE TRANSLATE
//TRANSLATE TRANSLATE TRANSLATE
function DoTranslate(Data)
{
    Data.Key="_"+Data.Key;

    var id=Data.Key;
    var div=$(id);
    if(div && div.innerText!==Data.Str)
    {
        Data.Str2=div.innerText;
        SendMessage(Data);
        return;
    }

    Data.Str2=sessionStorage[id];
    if(Data.Str2)
    {
        if($("idCanTranslate").innerText==="Translation completed.")
        {
            TranslateArr.push(Data);
        }
        else
        {
            SendMessage(Data);
        }
        return;
    }


    var Lib=$("idTranslate");
    div = document.createElement('div');
    div.id=id;
    div.innerText=Data.Str;
    Lib.appendChild(div);

    var observer = new MutationObserver(function(mutations)
    {
        mutations.forEach(function(mutation)
        {
            if(Data.Str2)
                return;

            //ToLog(div.innerText)
            sessionStorage[Data.Key]=div.innerText;
            Data.Str2=div.innerText;
            SendMessage(Data);
        });
    });
    observer.observe(
        div,
        {
            childList: true,
            attributes: false,
            subtree: true,
            characterData: true,
        }
    );

}
function InitTranslate()
{
    var observer = new MutationObserver(function(mutations)
    {
        mutations.forEach(function(mutation)
        {
            for(var i=0;i<TranslateArr.length;i++)
                SendMessage(TranslateArr[i]);
            TranslateArr=[];
        });
    });
    observer.observe(
        $("idCanTranslate"),
        {
            childList: true,
            attributes: false,
            subtree: true,
            characterData: true,
        }
    );

}



//-------------------------------------------- Transfer
function SetTransferCounter()
{
    idAccess1.innerText="1/"+(1+glListTransfer.length);
}
async function AddToTransfer(Data)
{
    //console.log(Data);

    if(glDlgTransfer)
    {
        glListTransfer.push(Data);
        StartTransferTimer();

        SetTransferCounter();
        return;
    }

    glDlgTransfer=Data;

    //console.log("Show");

    SetTransferCounter();

    var PayContext=Data.ParamsPay;
    if(!PayContext.Value)
        PayContext.Value=0;
    if(typeof PayContext.Value==="number")
        PayContext.Value=COIN_FROM_FLOAT3(PayContext.Value);
    if(ISZERO(PayContext.Value))
        //throw new Error("Zero Value");
        return SendErrorTransfer("Zero Value")


    //PayContext.ToID
    //var DataFrom=await AGetData("GetAccount", PayContext.FromID);
    var DataFrom=await AReadAccount(PayContext.FromID);
    var DataTo=await AReadAccount(PayContext.ToID);
    //console.log("DataTo:",DataTo);
    // //console.log("AddToTransfer",Data);

    if(!DataFrom)
        //throw new Error("Error account number: " + PayContext.FromID);
        return SendErrorTransfer("Error account number: " + PayContext.FromID)

    if(!DataTo)
        //throw new Error("Error account number: " + PayContext.ToID);
        return SendErrorTransfer("Error account number: " + PayContext.ToID)

    Data.FromItem=DataFrom;

    var Currency;
    if(!PayContext.Currency || PayContext.Currency==Data.FromItem.Currency)
    {
        PayContext.ID="";
        PayContext.Currency = 0;
        Currency=Data.FromItem.Currency;
    }
    else
    {
        Currency=PayContext.Currency;
    }


    //console.log(PayContext.Currency , PayContext.ID,"Currency:",Currency);

    idAmount.innerText=FLOAT_FROM_COIN(PayContext.Value);
    idFrom.innerHTML="<B>"+PayContext.FromID+"</B> ("+DataFrom.Name+")";
    idTo.innerHTML="<B>"+PayContext.ToID+"</B> ("+DataTo.Name+")";

    var ParamsCall=Data.ParamsCall;
    var StrMehtod="";
    if(ParamsCall)
    {
        StrMehtod=escapeHtml(ParamsCall.Method);
        if(Data.Smart!==DataTo.Value.Smart)
        {
            StrMehtod+="<span class='red'>(smart:"+DataTo.Value.Smart+")</span>";
        }
    }


    idMethod.innerHTML=StrMehtod;
    SetVisibleBlock("idRowID",!!ParamsCall);

    idID.innerText=PayContext.ID;
    SetVisibleBlock("idRowID",!!PayContext.ID);
    idToken.innerText=await ACurrencyName(Currency);

    SetVisibleBlock("idTransfer",1);
    document.activeElement=idTransfer;
}



async function SendTransfer()
{
    if(!glDlgTransfer)
        return;

    //Подготовка Run транзакции

    var Data=glDlgTransfer;
    var PayContext=Data.ParamsPay;
    var ParamsCall=Data.ParamsCall;

    var OperationID = GetOperationIDFromItem(Data.FromItem, 1);
    var TR={};
    var Body=[];
    if(ParamsCall)
    {
        TR.Version=4;
        var Format=await AGetFormat("FORMAT_SMART_RUN2");
        TR.Type=await AGetFormat("TYPE_SMART_RUN2");
        TR.Account=0;
        TR.OperationID = 0;//OperationID;
        TR.MethodName=ParamsCall.Method;
        TR.Params=JSON.stringify(ParamsCall.Params);
        TR.FromNum=PayContext.FromID;
        TR.ParamsArr=ParamsCall.ParamsArr;
        TR.Reserve=[];
        Body=SerializeLib.GetBufferFromObject(TR, Format, {});
        Body.length=Math.max(50,Body.length-64);

    }

    //Подготовка Transfer транзакции

    TR=
        {
            Type:await AGetFormat("TYPE_MONEY_TRANSFER5"),
            Version:4,
            OperationID:OperationID,
            FromID:PayContext.FromID,
            ToID:PayContext.ToID,
            TxTicks:Data.TxTicks?Data.TxTicks:35000,
            TxMaxBlock:GetCurrentBlockNumByTime()+120,
            Amount:PayContext.Value,
            Description:PayContext.Description,
            Currency: PayContext.Currency,
            TokenID: PayContext.ID,
            CodeVer:await AGetFormat("CodeVer"),
            Body:Body,
        };



    var Format5=await AGetFormat("FORMAT_MONEY_TRANSFER5");
    var Body5=SerializeLib.GetBufferFromObject(TR, Format5, {});
    Body5.length-=64;

    //console.log(TR);
    SendTrArrayWithSign(Body5, PayContext.FromID, TR, RetSendTx,Data,1);

    //RetSendTx,Data,Data.Confirm,Data.TxTicks

}

function OnOKTr()
{
    SendTransfer();
    CloseTransferDlg();
}
function OnHideTr()
{
    CloseTransferDlg();
}
function OnCancelTr()
{
    SendErrorTransfer("Rejected by the user");
}


function SendErrorTransfer(StrError)
{
    if(glDlgTransfer)
        RetSendTx(1,{}, [], StrError, glDlgTransfer);
    CloseTransferDlg();
}

function CloseTransferDlg()
{
    glDlgTransfer=undefined;
    SetVisibleBlock("idTransfer",0);
}

function StartTransferTimer()
{
    if(!idTimerTransfer)
        idTimerTransfer=setInterval(CheckTransferList,100);
}
function CheckTransferList()
{
    if(glDlgTransfer)
        return;
    if(!glListTransfer.length)
    {
        if(idTimerTransfer)
            clearInterval(idTimerTransfer);
        idTimerTransfer=0;
        return;
    }

    AddToTransfer(glListTransfer.shift());
}
