/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var CodeTemplate = ["/*\n\
        global context:\n\
        context.BlockNum - Block num\n\
        context.Account - current account {Num,Currency,Smart,Value:{SumCOIN,SumCENT}}\n\
        context.Smart - current smart {Num,Name,Account,Owner}\n\
        context.FromNum - sender account num\n\
        context.ToNum - payee account num\n\
        context.Description - text\n\
        context.Value - {SumCOIN,SumCENT};\n\
        context.SmartMode - 1 if run from smartcontract\n\
        context.Tx - tx (not present in events)\n\
        */",
function GetLib()
{
    return require(8);
}
, function CheckPermission()
{
    if(context.Account.Num !== context.FromNum)
        throw "Access is allowed only from your own account.";
}
, function OnCreate()
{
}
, function OnSetSmart()
{
}
, function OnDeleteSmart()
{
}
, function OnGet()
{
    var lib = GetLib();
    if(lib.OnGet())
        return;
    
    Event("OnGet " + context.FromNum + "->" + context.ToNum + " Value:" + context.Value.SumCOIN);
}
, function OnSend()
{
    Event("OnSend " + context.FromNum + "->" + context.ToNum + " Value:" + context.Value.SumCOIN);
}
, "\"public\"", function Method1(Params,ParamsArr)
{
    CheckPermission();
    Event(context.Smart.Name + " Run Method1 - OK");
    
    Send(context.Smart.Account, Params.Sum, "Sample");
}
];

function HTMLTemplate()
{
    
    window.addEventListener('Init', function ()
    {
    });
    window.addEventListener('History', function (e)
    {
        var Data = e.detail;
        ToLog("History: " + Data.OPEN_PATH);
    });
    
    window.addEventListener('Event', function (e)
    {
        var Data = e.detail;
        var Description = Data.Description;
        if(Data.Error)
        {
            SetError(Description);
        }
        else
        {
            ToLog("Event:" + JSON.stringify(Description));
            SetStatus(Description);
        }
    });
    
    window.addEventListener('UpdateInfo', function ()
    {
        UpdateFillUser();
    });
    function UpdateFillUser()
    {
        var Arr = [];
        for(var i = 0; i < USER_ACCOUNT.length; i++)
        {
            var Item = USER_ACCOUNT[i];
            var Value = {value:Item.Num, text:Item.Num + "." + Item.Name + "  " + SUM_TO_STRING(Item.Value, Item.Currency, 1)};
            Arr.push(Value);
        }
        FillSelect("idTestAccount", Arr);
    };
    
    function SendMethod(Name)
    {
        if(!USER_ACCOUNT.length)
        {
            SetError("Not have user accounts");
            return;
        }
        var UserAcc =  + $("idTestAccount").value;
        var Params = {Sum:10};
        SendCall(UserAcc, Name, Params, [], UserAcc);
    };
}

function ShowSyntax(idStr)
{
    $("idSyntaxText").innerHTML = $(idStr).innerHTML;
    openModal("idSyntaxDlg");
}
