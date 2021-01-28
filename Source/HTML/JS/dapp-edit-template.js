
function ShowSyntax(idStr)
{
    $("idSyntaxText").innerHTML=$(idStr).innerHTML;
    openModal("idSyntaxDlg");
}



var CodeTemplateSmart=
[

"/*\n\
global context:\n\
context.BlockNum - Block num\n\
context.TrNum - Tx num\n\
context.Account - current account {Num,Currency,Smart,Value:{SumCOIN,SumCENT}}\n\
context.Smart - current smart {Num,Name,Account,Owner}\n\
context.FromNum - sender account num\n\
context.ToNum - payee account num\n\
context.Description - text\n\
context.Value - {SumCOIN,SumCENT};\n\
context.SmartMode - 1 if run from smartcontract\n\
context.Tx - tx (not present in events)\n\
*/",

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



];


var CodeTemplateSmart2=
    [
function OnGet()//getting coins
{
    Event("Account: "+context.Account.Num+" OnGet form: "+context.FromNum+" value: "+context.Value.SumCOIN);
},

function OnSend()//sending coins
{
    Event("Account: "+context.Account.Num+" OnSend to:  "+context.ToNum+" value: "+context.Value.SumCOIN);
},
    ];


var CodeTemplateDapp=
    [
function OnGet()//getting coins
{
    var lib=GetLib();
    if(lib.OnGet())
        return;
},


function GetLib()
{
    return require(8);//List-lib
},
function CheckPermission()
{
    if(context.Account.Num!==context.FromNum)
        throw "Access is allowed only from your own account.";
},
"\"public\"",
function Method1(Params,ParamsArr)
{
    CheckPermission();
    Event(context.Smart.Name+" Run Method1 - OK");

    Send(context.Smart.Account,Params.Sum,"Sample");
}
    ];



function DappTemplate()
{

//-------------
//Events
//-------------
//ALL_ACCOUNTS=1;
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
    //ToLog("USER_ACCOUNT:\n"+JSON.stringify(USER_ACCOUNT));
    UpdateFillUser();
});
function UpdateFillUser()
{
    var Arr=[];
    for(var i=0;i<USER_ACCOUNT.length;i++)
    {
        var Item=USER_ACCOUNT[i];
        var Value={value:Item.Num, text:Item.Num+"."+Item.Name+"  "+SUM_TO_STRING(Item.Value,Item.Currency,1)};
        Arr.push(Value);
    }
    FillSelect("idTestAccount",Arr);
}

//-------------
//Users methods
//-------------

function SendMethod(Name)
{
    if(!USER_ACCOUNT.length)
    {
        SetError("Not have user accounts");
        return;
    }
    var UserAcc=+$("idTestAccount").value;
    var Params={Sum:10};
    SendCall(UserAcc,Name,Params,[],UserAcc);
}

}

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

function DappTemplate1()
{
function SendKey()
{
    SendCall(0,"SetKey",{Key:"Name",Value:"Ilon Mask"},[],0);
}
function SendDel()
{
    SendCall(0,"RemoveKey",{Key:"Name"},[],0);
}

function GotKeyValue()
{
    Call(0,"GetKey",{Key:"Name"},[],function (Err,Value)
    {
        if(Err)
            return;
        DoConfirm("Got value:",JSON.stringify(Value));
    });

}
}

