
function SetStateFromOwner()
{
    if(context.FromNum===context.Smart.Owner
        && context.Description.substr(0,1)==="{")
    {

        var State=ReadState(context.Smart.Account);
        var Data=JSON.parse(context.Description);
        for(var key in Data)
            State[key]=Data[key];

        WriteState(State);
        Event(State);
        return 1;
    }
    return 0;
}

function OnGet()//on getting coins
{
    if(SetStateFromOwner())
        return;

}


"public"
function CheckSum(Params)
{
    var MinBalance=1e9;
    var State=ReadState(context.Smart.Account);
    if(!State.Account)
        throw "Not set Account";

    var AccObj=ReadAccount(State.Account);
    var Delta=MinBalance-AccObj.Value.SumCOIN;
    if(Delta>0)
    {
        State.TotalSum+=Delta;
        WriteState(State);

        var CoinDelta={SumCOIN:Delta};
        SetValue(context.Smart.Account,CoinDelta);
        Move(context.Smart.Account,State.Account,CoinDelta,"Emission");
        Event("Add new value: "+Delta);
    }
}


"public"
function SetAccount(Params)
{
    if(context.FromNum!==context.Smart.Owner)
        return 0;

    var State=ReadState(context.Smart.Account);
    State.Account=Params.Account;
    WriteState(State);
    Event("Set account="+State.Account);
}


