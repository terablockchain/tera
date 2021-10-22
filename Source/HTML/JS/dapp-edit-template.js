
function ShowSyntax(idStr)
{
    $("idSyntaxText").innerHTML=$(idStr).innerHTML;
    openModal("idSyntaxDlg");
}


function TemplateAllEvent()
{
// global context:
// context.BlockNum - Block num
// context.TrNum - Tx num
// context.Account - current account {Num,Currency,Smart,Value:{SumCOIN,SumCENT}}
// context.Smart - current smart {Num,Name,Account,Owner}
// context.FromNum - sender account num
// context.ToNum - payee account num
// context.Description - text
// context.Value - {SumCOIN,SumCENT}
// context.Currency - token currency
// context.ID - token ID
// context.SmartMode - 1 if run from smartcontract
// context.Tx - tx (not present in events)


function OnGet()//getting coins
{

}

function OnSend()//sending coins
{

}

function OnCreate()//creating this smart
{

}

function OnSetSmart()//linking a account to this smart
{

}

function OnDeleteSmart()//unlinking this smart from account
{

}

//---------------------------------Proxy
// function OnProxy(Method,Params,ParamsArr,PublicMode)
// {
// }

//---------------------------------Software token events
// function OnTransfer(Params)
// {
// }
// function OnGetBalance(Account,ID)
// {
// }
}


var CodeTemplateSmart=
[
function OnGet()//getting coins
{

},

function OnSend()//sending coins
{

},


function OnCreate()//creating this smart
{

},


function OnSetSmart()//linking a account to this smart
{

},


function OnDeleteSmart()//unlinking this smart from account
{

},

function OnProxy(Method,Params,ParamsArr,PublicMode)//proxing call methods
{
},

function OnTransfer(Params)//Software tokens support
{
},

function OnGetBalance(Account,ID)//Software tokens support
{
}

];





function CodeTemplateDapp()
{


"public"
function Run(Params,ParamsArr)
{
    var PayAmount=FLOAT_FROM_COIN(context.Value);
    var PayCurrency=context.Currency;
    var PayID=context.ID;

    Event(context.Smart.Name+" Got: "+PayAmount+" Currency:"+PayCurrency);

    Send(context.FromNum,context.Value,"Refund",PayCurrency,PayID);
}

}

//---------------------------------------------------------------

function DappTemplate()
{


    //-------------
    //Events
    //-------------
    ALL_ACCOUNTS=1;
    window.addEventListener('Init',function ()
    {
        //        ToLog("Init:");
        //        ToLog("OPEN_PATH: "+OPEN_PATH);
        //        ToLog("NETWORK:"+INFO.NETWORK);
        //        ToLog("INFO:\n"+JSON.stringify(INFO));
        //        ToLog("BASE_ACCOUNT:\n"+JSON.stringify(BASE_ACCOUNT));
        //        ToLog("SMART:\n"+JSON.stringify(SMART));
    });
    window.addEventListener('History',function (e)
    {
        var Data=e.detail;
        ToLog("History: "+Data.OPEN_PATH);
    });

    window.addEventListener('Event',function(e)
    {
        var Data=e.detail;
        var Description=Data.Description;
        if(Data.Error)
        {
            SetError(Description);
        }
        else
        {
            ToLog("Event:"+JSON.stringify(Description));
            SetStatus(Description);
        }
    });

    window.addEventListener('UpdateInfo',function ()
    {
        UpdateFillUser();
    });
    function UpdateFillUser()
    {
        var Arr=AccToListArr(USER_ACCOUNT);
        FillSelect("idAddrTera",Arr);
        //console.log(window.NETWORK_ID)
    }

    //-------------
    //Users methods
    //-------------

    async function SendTest()
    {
        try
        {
            var Ret=await StartTransfer(
                {FromID:+idAddrTera.value,ToID:SMART.Account,Value:500,Description:"Test transfer",Currency:0,ID:""},
                {Method:"Run",Params:{}},
                50000);


        }
        catch(e)
        {
             return SetError(e.Text)
        }
        finally
        {
        }

        SetStatus("Sent, Result: "+Ret.Text);
    }

    //------------------------ insert

    var LocalNum={"LOCAL-JINN":536,"TEST-JINN":11688933,"MAIN-JINN":75152874}[NETWORK_NAME];
    var Str="";
    var Path="/file/"+LocalNum+"/0";
    if(LocalNum)
        Str+=`<script src="${GetURLPath(Path)}">TAB4</script`+">";

    Str+=` 
<style>

    body
    {
      background-color:#F5F5F5;
      padding: 0;
      margin: 0;
    }


    .row
    {
        display: block;
        margin: 0;
        padding:0;
        line-height: 24px;
    }
    
    .row_acc
    {
        display: flex;
        width:310px;
        height: 32px;
        margin: 10px 0px 10px 0px;
        padding:0;
    }
     .row_acc p
    {
        margin-top: 4px;
    }
    .row_acc select
    {
        max-width:200px;
        height: 26px;
    }
    
    .btn_acc
    {
        cursor:pointer;
        width:26px;
        height:26px; 
        margin:0px 5px; 
        padding:0px;
        border: 0;
        border-radius:5px;
        fill:#000;
    }
    .btn_acc:hover
    {
        cursor: pointer;
        fill: #cb763a;
    }

</style>
    
    
    `


    document.write(Str);


}
//---------------------------------------------------------------

function SmartTemplate1()
{
"public"
function SetKey(Params)
{
    //Note: needs some coins on smart contract base account

    WriteValue(Params.Key,Params.Value,Params.Format);
}


"public"
function RemoveKey(Params)
{
    return RemoveValue(Params.Key);
}



//for static call

"public"
function GetKey(Params)
{
    return ReadValue(Params.Key,Params.Format);
}
}

//---------------------------------------------------------------

function DappTemplate1()
{
    async function SendKey()
    {
        var Ret=await ASendCall(0,"SetKey",{Key:"Name",Value:"Ilon Mask"},[],0);
        SetStatus("Sent, Result: "+Ret.Text);

    }
    async function SendDel()
    {
        var Ret=await ASendCall(0,"RemoveKey",{Key:"Name"},[],0);
        SetStatus("Sent, Result: "+Ret.Text);
    }

    async function GotKeyValue()
    {
        var Value=await ACall(0,"GetKey",{Key:"Name"},[]);
        DoConfirm("Got value:",JSON.stringify(Value));

    }

}

//---------------------------------------------------------------

function SiteTemplateSmart()
{
//for static call
"public"
function CheckAccess(Path)
{
    if(Path==="http://example.com/")
        return 1;
    else
        return 0;
}
}

//---------------------------------------------------------------

function SiteTemplateHTML()
{
    //use its code in extern www page

    function StaticCall()
    {
        web3.tera.StaticCall({From:0, To:209, Method:"MiningList", Params:{}},function (Data)//223295
        {
            if(Data.result)
                idResult.value="OK, MiningList="+Data.RetValue.length;
        });
    }

    function SendTx()
    {
        web3.tera.Send({To:20, Sum:1.5, Description:"Test only"});
    }

    function SendMethod()
    {
        web3.tera.SendCall({From:113, To:113, Method:"Method1", Params:{Sum:5}},function (Data)
        {
            idResult.value="Send Method result = "+Data.result;
        });
    }

    function Create()
    {
        web3.tera.CreateAccount({Currency:0, Description:"Test"},function (Data)
        {
            idResult.value="Send CreateAccount result = "+Data.result;
        });
    }

    web3.tera.OnInfo(function ()
    {
        idInfo.value=JSON.stringify(web3.tera.INFO);
    });

    web3.tera.OnEvent(function (Data)
    {
        idEvents.value=JSON.stringify(Data);
    });

    web3.tera.OnLogin(function (Result)
    {
        idBlockSend.style.display=Result?"inline-block":"none";
    });

    window.addEventListener('load',function ()
    {
        web3.tera.InjectHTML();
    });
}

//---------------------------------------------------------------

function TemplateSmartToken()
{

"public"
function InPlaceShow()
{
    return 1;
}


//"public" <------ uncomment it for use from Proxy
function OnTransfer(Params)
{
    //Params: From,To,Amount,ID
    if(!FLOAT_FROM_COIN(Params.Amount))
        return;

    if(Params.ID && (Params.Amount.SumCENT || typeof Params.Amount.SumCENT!=="number"))
        throw "Error Amount for NFT. Fractional values are prohibited.";

    if(Params.To<8)//burn
    {
        Burn(Params.From,Params.ID,Params.Amount);
        Burn(0,Params.ID,Params.Amount);
        return;
    }



    TransferGet(Params);
    return TransferSend(Params);
    //return TransferSend_WithBurn(Params,0.5); - uncomment it for use burn mode with Fee=0.5%

}
function TransferGet(Params)
{
    var Item1=ReadItem(Params.From);
    var Row1=FindRow(Item1.Arr,Params.ID);

    if(!SUB(Row1,Params.Amount))
        throw "There are not enough funds on the account: "+Params.From;
    if(ISZERO(Row1))
        DeleteRow(Item1.Arr,Params.ID);
    WriteItem(Item1);
}

function TransferSend(Params)
{
    var Item2=ReadItem(Params.To);
    var Row2=FindRow(Item2.Arr,Params.ID);
    ADD(Row2,Params.Amount);

    WriteItem(Item2);

    RegInWallet(Params.To);
}


function TransferSend_WithBurn(Params,PercentFee)
{
    var Item2=ReadItem(Params.To);
    var Row2=FindRow(Item2.Arr,Params.ID);


    var KK=100/(100+PercentFee);

    var Amount=FLOAT_FROM_COIN(Params.Amount);
    var Amount2=Amount*KK;

    if(!Amount2 || Amount2<1e-9)
        throw "Error dest amount = "+Amount2;

    var DestCoin=COIN_FROM_FLOAT(Amount2);
    ADD(Row2,DestCoin);
    WriteItem(Item2);

    //decrement total amount
    var Fee=Amount2-Amount;
    if(Fee>1e-9)
        Burn(0,Params.ID,Fee);


    RegInWallet(Params.To);

    return DestCoin;
}


"public"//for use from Proxy
function OnGetBalance(Account,ID)
{
    var Item=ReadItem(Account);
    if(!Item)
        Item={Arr:[]};
    if(ID!==undefined)
        return FindRow(Item.Arr,ID);

    var Arr=Item.Arr;
    for(var i=0;i<Arr.length;i++)
        if(Arr[i].ID)
            Arr[i].URI="/nft/"+Arr[i].ID;

    return Arr;
}



//Token Lib

function Format()
{
    return {Arr:[{ID:"str",SumCOIN:"uint",SumCENT:"uint32"}]};
}
function ReadItem(Account)
{
    var Key="ACC:"+Account;
    var Item=ReadValue(Key,Format());
    if(!Item)
        Item={Arr:[]};
    Item.Key=Key;
    return Item;
}

function WriteItem(Item)
{
    WriteValue(Item.Key,Item,Format());
}

function FindRow(Arr,ID)
{
    if(!ID)
        ID="";
    for(var i=0;i<Arr.length;i++)
        if(Arr[i].ID==ID)
        {
            return Arr[i];
        }

    var Row={ID:ID,SumCOIN:0,SumCENT:0};
    Arr.push(Row);
    return Row;
}

function DeleteRow(Arr,ID)
{
    if(!ID)
        ID="";
    for(var i=0;i<Arr.length;i++)
        if(Arr[i].ID==ID)
        {
            Arr.splice(i,1);
            break;
        }
}


function Mint(Account,ID,Amount)
{
    if(typeof Amount==="number")
        Amount=COIN_FROM_FLOAT(Amount);

    var Item=ReadItem(Account);
    var Row=FindRow(Item.Arr,ID);
    ADD(Row,Amount);
    WriteItem(Item);

    if(Account)
        RegInWallet(Account);
}

function Burn(Account,ID,Amount)
{
    if(typeof Amount==="number")
        Amount=COIN_FROM_FLOAT(Amount);

    var Item=ReadItem(Account);
    var Row=FindRow(Item.Arr,ID);
    if(!SUB(Row,Amount))
        throw "Error burn Amount in account: "+Account+" Lack of funds: "+(-FLOAT_FROM_COIN(Row));
    if(ISZERO(Row))
        DeleteRow(Item.Arr,ID);
    WriteItem(Item);
}




//Owner mode

"public"
function DoMint(Params)
{
    CheckOwnerPermission();

    Mint(Params.Account,Params.ID,Params.Amount);
    Mint(0,Params.ID,Params.Amount);
}

"public"
function DoBurn(Params)
{
    CheckOwnerPermission();
    Burn(Params.Account,Params.ID,Params.Amount);
    Burn(0,Params.ID,Params.Amount);
}

"public"
function MintNFT(Params)
{
    CheckOwnerPermission();

    Params.Amount=1;
    Params.ID=""+(context.BlockNum*1000+context.TrNum);//self
    DoMint(Params);
}




function CheckOwnerPermission()
{
    if(context.Smart.Num<7)//test mode
        return;

    if(context.FromNum!==context.Smart.Owner)
        throw "Access is only allowed from Owner account";
}


//static mode


"public"
function DoGetBalance(Params)
{
    return GetBalance(Params.Account,Params.Currency,Params.ID);
}


"public"
function TotalAmount(Params)
{
    return GetBalance(0,Params.Currency,Params.ID);
}



}

//---------------------------------------------------------------

function TemplateSmartTokenHTML()
{

    ALL_ACCOUNTS=1;
    var ShowParams;
    window.addEventListener('Event',function(e)
    {
        var Data=e.detail;
        var Description=Data.Description;
        if(Data.Error)
        {
            SetError(Description);
        }
        else
        {
            console.log("Event:",JSON.stringify(Description));
            SetStatus(Description);
        }
    });

    window.addEventListener('Init',Init);
    window.addEventListener('UpdateInfo',UpdateFillUser);

    async function Init()
    {

        if(OPEN_PATH && OPEN_PATH.substr(0,1)==="{")
        {
            ShowParams=JSON.parse(OPEN_PATH);
            ShowParams.AccObj=await AReadAccount(ShowParams.Account);
            if(ShowParams.AccObj)
            {
                ShowToken();
            }

            SetVisibleBlock("idShow",1);
        }
        else
        {
            SetVisibleBlock("idPage",1);
            await UpdateFillUser();
        }
    }

    async function ShowToken()
    {
        var ID=ShowParams.ID;
        var AccObj=ShowParams.AccObj;
        idTokenTitle.innerText=SMART.Name;
        if(ID)
        {
            idTotal.innerText=FLOAT_FROM_COIN(await AGetBalance(0,SMART.Num,ID))+" ID:"+ID;

        }
        else
        {
            idTotal.innerText=FLOAT_FROM_COIN(await AGetBalance(0,SMART.Num,""))+" "+SMART.ShortName;
        }

        idImgHolder.innerHTML=GetImgStr(ID,"IconImg");
        ConvertTokenImages();
    }
    function GetImgStr(ID,classname)
    {
        if(!classname)
            classname="";
        if(!ID)
        {
            var SrcPath=GetURLPath("/file/" + SMART.IconBlockNum + "/" + SMART.IconTrNum);
            if(!SMART.IconBlockNum)
                return "";
            return `<img class="${classname}" src="${SrcPath}">`;
        }
        return GetTokenImage(ID,classname);
    }

    function UpdateFillUser()
    {
        if(ShowParams)
            return;

        var Arr=AccToListArr(USER_ACCOUNT);
        FillSelect("idAccount",Arr);
    }


    async function DoMint()
    {
        var Ret=await ASendCall(0,"DoMint",{Account:+idAccount.value,Amount:+idAmount.value,ID:idID.value},[],SMART.Owner);
        console.log("Ret:",Ret);
    }
    async function DoBurn()
    {
        var Ret=await ASendCall(0,"DoBurn",{Account:+idAccount.value,Amount:+idAmount.value,ID:idID.value},[],SMART.Owner);
        console.log("Ret:",Ret);
    }

    async function DoGetBalance(ID)
    {
        idSettings.value="";



        var Value=await ACall(0,"DoGetBalance",{Account:+idAccount.value,Currency:idCurrency.value?+idCurrency.value:SMART.Num,ID:ID});
        if(Value)
        {
            idSettings.value=JSON.stringify(Value,"",4);
        }

    }


    //------------------------ insert

    document.write(`

<style>
    body
    {
      color:white;
      background-color:#2B4050;
      padding: 0;
      margin: 0;
    }


   .page
   {
        width: 320px;
        height: 100%;
        min-height: 550px;
   }


    .row
    {
        display: flex;
        margin: 10px;
        margin-left: 30px;
        padding:0;
        line-height: 24px;
    }
    

    .row_acc
    {
        display: flex;
        align-items: center;
        justify-content: center;
        width:310px;
        height: 32px;
        line-height: 32px;
        margin: 10px 0px 10px 0px;
        padding:0;
    }
    .row_acc select
    {
        height: 26px;
        max-width:230px;
    }
    .btn_acc
    {
        cursor:pointer;
        width:26px;
        min-width:26px;
        height:26px; 
        margin:0px 5px; 
        padding:0px;
        border: 0;
        border-radius:5px;
        fill:#000;
    }

    .btn_acc:hover
    {
        cursor: pointer;
        fill: #cb763a;
    }

    .title
    {
        width:70px;
    }
    
    button
    {
        margin:5px;
    }
    
    .IconImg
    {
        max-height:50vh;
        max-width:50vh;
    }

</style>

<DIV align='center' id="idShow" style="display:none">
    <h3 id="idTokenTitle"></h3>
    <div id="idImgHolder"></div>
    <h4>Total Supply: <b id="idTotal"></b></h4>
</DIV>

 
<DIV align='center' id="idPage" style="display:none">
    <DIV class="page">
        <div class="row_acc">
            <p>Account:</p>
            <select size="1" id="idAccount" onchange="">
                <option value="0">Loading...</option>
            </select>
            <button class="btn_acc" onclick="CreateNewAccount()">
            <svg viewBox="0 0 16 16" style="height:16px"><path d="M0 7h16v2H0V7z"></path><path d="M9 0v16H7V0h2z"></path></svg>
            </button>
        </div>
        

       
        <DIV class="row">
            <DIV class="title">Amount:</DIV><input type="number" id="idAmount" value="100000">
        </DIV>
        <DIV class="row">
            <DIV class="title">Token ID:</DIV><input type="number" id="idID" value="">
        </DIV>

        <button onclick="DoMint()">Mint</button><button onclick="DoBurn()">Burn</button>
        
        
        <BR><button onclick="DoGetBalance()">Get balance</button>
        <TEXTAREA id="idSettings" rows="20" cols="40" style="width:95%"></TEXTAREA>        
        
        <DIV class="row">
            <DIV class="title">Currency:</DIV><input type="number" id="idCurrency" value="">
        </DIV>
        
    </DIV>
</div>


    `);


}
//---------------------------------------------------------------

function TemplateProxy()
{


function OnProxy(Method,Params,ParamsArr,PublicMode)
{
    Method=Method.trim();
    if(Method==="OnTransfer" && PublicMode)
        throw "Error mode call OnTransfer";

    return CallLib(Method,Params,ParamsArr);
}




function CallLib(Method,Params,ParamsArr)
{
    var Item=GetProxy();
    var SmartNum=Item[Method];
    if(!SmartNum)
        SmartNum=Item.CommonNum;

    var lib=require(SmartNum);
    var F=lib[Method];
    if(F)
        return F(Params,ParamsArr);

}




//Owner mode

"public"
function SetProxy(Params)
{
    if(context.FromNum!==context.Smart.Owner)
        throw "Access is only allowed from Owner account";

    WriteValue("PROXY",Params);
}

//static mode


"public"
function GetProxy()
{
    var Item=ReadValue("PROXY");
    if(!Item)
        Item={CommonNum: 0};

    return Item;
}


}

//---------------------------------------------------------------

function TemplateProxyHTML()
{
    //--------------------------------------------------------------------------- Owner mode
    var OwnerParamArr=
        [
            {MethodSet:"SetProxy", MethodGet:"GetProxy", Empty:{CommonNum:0}},
        ]

    async function DoSetOwner(Num)
    {
        if(!idSettings.value)
            return SetError("Need set params");

        var Params=JSON.parse(idSettings.value);
        var Item=OwnerParamArr[Num];
        return ASendCall(0,Item.MethodSet,Params,[],SMART.Owner);
    }

    async function DoGetOwner(Num)
    {
        idSettings.value="";



        var Item=OwnerParamArr[Num];

        var Value=await ACall(0,Item.MethodGet,{});
        if(Value)
        {
            idSettings.value=JSON.stringify(Value,"",4);
        }
        return Value;
    }


    //------------------------ insert
    document.write(`
    
<br>
<TEXTAREA id="idSettings" rows="20" cols="40" style="width:95%"></TEXTAREA>
<br>
<button onclick="DoGetOwner(0)">Get Proxy</button>
<button onclick="DoSetOwner(0)">Set Proxy</button>

    
    `);


}

//---------------------------------------------------------------
