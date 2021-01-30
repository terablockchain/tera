//Smart-contract: CoinWalletLib


function OnGet()//getting coins
{
    DoGet();
}


"public"
function DoGet()
{
    if(context.SmartMode)
        return;

    //проверка на спец. счета
    var KeyAcc="ACC:"+context.Account.Num;
    var bBaseAcc;
    if(context.Account.Num===context.Smart.Account)
        bBaseAcc=1;
    else
        bBaseAcc=ReadValue(KeyAcc,"byte");
    if(!bBaseAcc)
        return 0;


    var ObjWallet=GetObjWallet(context.FromNum,context.FromNum);
    if(ObjWallet.AccWallet!==context.Account.Num)
        throw "Error current Account = "+context.Account.Num+" need = "+ObjWallet.AccWallet;



    if(!ISZERO(context.Value))//deposit
    {
        if(context.Description!=="init")
            Deposit(ObjWallet);

        return 1;
    }
    else
    if(context.Description)//withdraw
    {
        Withdraw(ObjWallet);
        return 1;

    }
    else
    {
        var Amount=FLOAT_FROM_COIN(ReadCoin(ObjWallet));
        Event("Amount: "+Amount);
        return 0;
    }
}


function GetObjWallet(OwnerNum,ToNum)
{
    var AccObj=ReadAccount(ToNum);
    var AccWallet;
    if(!AccObj.Currency)
    {
        AccWallet=context.Smart.Account;
    }
    else
    {
        var Key="CUR:"+AccObj.Currency;
        var Value=ReadValue(Key,GetFormatCurrency());
        if(!Value)
            throw "Not was set Wallet Account for currency: "+AccObj.Currency;

        AccWallet=Value.Account;
    }

    var AccFromObj;
    if(OwnerNum===ToNum)
        AccFromObj=AccObj;
    else
        AccFromObj=ReadAccount(OwnerNum);


    return {PubKeyStr:AccFromObj.PubKeyStr, Currency:AccObj.Currency, AccWallet:AccWallet};
}


function Deposit(AccObj)
{
    AddCoin(AccObj,context.Value);
}

function Withdraw(ObjWallet)
{
    WithdrawSum(context.FromNum,parseFloat(context.Description),ObjWallet);
}

"public"
function DepositSum(FromNum,fSum)
{
    if(fSum<1e-9)
        return;

    var ObjWallet=GetObjWallet(FromNum,FromNum);
    var CurAmount=COIN_FROM_FLOAT2(fSum);

    Move(FromNum,ObjWallet.AccWallet,CurAmount,"Deposit");
    AddCoin(ObjWallet,CurAmount);
}


"public"
function WithdrawSum(ToNum,fSum,ObjWallet)
{
    if(fSum<1e-9)
        return;

    if(!ObjWallet)
        ObjWallet=GetObjWallet(context.FromNum,ToNum);

    var CurAmount=COIN_FROM_FLOAT2(fSum);
    SubCoin(ObjWallet,CurAmount);

    Move(ObjWallet.AccWallet,ToNum,CurAmount,"Withdraw");
}


"public"
function GetFormatCoin()
{
    return {SumCOIN:"uint", SumCENT:"uint32", Flag:"uint"};
}

function GetFormatCurrency()
{
    return {Account:"uint"};
}




//processing
function COIN_FROM_FLOAT2(Sum)
{
    var MAX_SUM_CENT = 1e9;
    var SumCOIN=Math.floor(Sum);
    var SumCENT = Math.floor(Sum * MAX_SUM_CENT - SumCOIN * MAX_SUM_CENT);
    var Coin={SumCOIN:SumCOIN,SumCENT:SumCENT};
    return Coin;
}

"public"
function GetKey(AccObj)
{
    return "AMOUNT:"+AccObj.PubKeyStr+":"+AccObj.Currency;
}



"public"
function ReadCoin(AccObj)
{
    var KeyAmount=GetKey(AccObj);
    var AmountWas=ReadValue(KeyAmount,GetFormatCoin());
    if(!AmountWas)
        AmountWas={SumCOIN:0, SumCENT:0};

    return AmountWas;
}
"public"
function AddCoin(AccObj,Value)
{
    var KeyAmount=GetKey(AccObj);
    var AmountWas=ReadCoin(AccObj);
    ADD(AmountWas,Value);
    WriteValue(KeyAmount,AmountWas,GetFormatCoin());
}
"public"
function SubCoin(AccObj,Value)
{
    var KeyAmount=GetKey(AccObj);
    var AmountWas=ReadCoin(AccObj);
    var WasFloat=FLOAT_FROM_COIN(AmountWas);
    if(!SUB(AmountWas,Value))
        throw "Error current amount = "+FLOAT_FROM_COIN(Value)+" Can amount = "+WasFloat;

    WriteValue(KeyAmount,AmountWas,GetFormatCoin());
}


//for static call

"public"
function GetKeyValue(Params)
{
    return ReadValue(Params.Key,Params.Format);
}



"public"
function SetWalletAccount(Params)
{
    var AccObj=ReadAccount(Params.Account);
    if(AccObj.Value.Smart!==context.Smart.Num)
        throw "Account "+Params.Account+" must have smart = "+context.Smart.Num;

    if(!AccObj.Currency)
        throw "Account "+Params.Account+" must have currency";


    var SmartObj=ReadSmart(AccObj.Currency);
    if(!SmartObj)
        throw "Account must have valid currency";


    if(AccObj.PubKey[0]!==0)//check nobody access to account
        throw "Account must have zero public key";

    var Key="CUR:"+AccObj.Currency;
    var Value=ReadValue(Key,GetFormatCurrency());
    if(Value)
        throw "Account was set = "+JSON.stringify(Value);


    WriteValue(Key,Params,GetFormatCurrency());


    var KeyAcc="ACC:"+AccObj.Num;
    WriteValue(KeyAcc,1,"byte");

    Params.cmd="Set";
    Event(Params);
}





