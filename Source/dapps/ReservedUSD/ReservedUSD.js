


//wallet deposit mode
function OnGet()
{
    if(!context.SmartMode)
    {

        if(SetHTML())
            return;

        var Storage=ReadStorage();
        if(Storage.WalletLib)
        {
            var wlib=require(Storage.WalletLib);
            if(wlib.DoGet())
                return;
        }

    }
}
"public"
function SetWalletAccount(Params)
{
    var Storage=ReadStorage();

    if(!Storage.WalletLib || !Storage.DAONum || !Storage.USDNum)
        throw "Not correct conf set";

    var wlib=require(Storage.WalletLib);
    wlib.SetWalletAccount(Params);

    var AccObj=ReadAccount(Params.Account);
    if(AccObj.Currency===Storage.DAONum)
        Storage.DAOAcc=AccObj.Num;
    else
    if(AccObj.Currency===Storage.USDNum)
        Storage.USDAcc=AccObj.Num;

    WriteStorage(Storage);

}




function GetFormatPool()
{
    var Format=
        {
            TeraReservePool:{SumCOIN:"uint", SumCENT:"uint32"},
            TeraPool:{SumCOIN:"uint", SumCENT:"uint32"},
            USDPool: {SumCOIN:"uint", SumCENT:"uint32"},
            USDAll:{SumCOIN:"uint", SumCENT:"uint32"},
            DAOAll:{SumCOIN:"uint", SumCENT:"uint32"},

            //stat
            TeraSwapFlow:"double",
            USDSwapFlow:"double",
            TeraFeeFlow:"double",
            USDFeeFlow:"double",

            TWPrice:{Price:"double",TimeStamp:"uint"},

            //conf
            CanSwap:"byte",
            VoteLib:"uint32",
            WalletLib:"uint32",
            DAONum:"uint32",
            USDNum:"uint32",
            KReserveNew:"double",
            KFee:"double",

            HTMLBlock:"uint",
            HTMLTr:"uint16",

            //info
            DAOAcc:"uint32",
            USDAcc:"uint32",

        };

    return Format;
}


function ReadStorage()
{
    var Storage=ReadValue("Pools",GetFormatPool());
    if(!Storage)
    {
        Storage=GetFormatPool();
        for(var key in Storage)
            Storage[key]={SumCOIN:0, SumCENT:0};

        Storage.TeraSwapFlow=0;
        Storage.USDSwapFlow=0;
        Storage.TeraFeeFlow=0;
        Storage.USDFeeFlow=0;

        Storage.TWPrice={Price:0,TimeStamp:0};

        //conf
        Storage.CanSwap=1;
        Storage.VoteLib=0;
        Storage.WalletLib=0;
        Storage.DAONum=0;
        Storage.USDNum=0;
        Storage.KReserveNew=0;
        Storage.KFee=0.002;

        Storage.HTMLBlock=0;
        Storage.HTMLTr=0;

        //info
        Storage.DAOAcc=0;
        Storage.USDAcc=0;

    }
    return Storage;
}

function WriteStorage(Storage)
{
    WriteValue("Pools",Storage,GetFormatPool());
}


function StorageToState(Storage)
{
    var State={Num:context.Smart.Account};

    State.KFee=Storage.KFee;
    State.TWPrice=Storage.TWPrice;
    State.TeraPool=FLOAT_FROM_COIN(Storage.TeraPool);
    State.USDPool=FLOAT_FROM_COIN(Storage.USDPool);

    State.HTMLBlock=Storage.HTMLBlock;
    State.HTMLTr=Storage.HTMLTr;

    WriteState(State);
}

function CheckPermission()
{
    if(!context.FromNum)
        throw "You need to specify the account number.";
}

function SetHTML()
{
    if(context.Account.Num===context.Smart.Account
        && context.FromNum===context.Smart.Owner
        && context.Description.substr(0,1)==="{")
    {
        var Data=JSON.parse(context.Description);
        if(Data.HTMLBlock!==undefined)
        {
            var Storage=ReadStorage();
            Storage.HTMLBlock=Data.HTMLBlock;
            Storage.HTMLTr=Data.HTMLTr;
            if(!ISZERO(context.Account.Value))
                WriteStorage(Storage);
            StorageToState(Storage);
            Event("New set HTMLBlock: "+Storage.HTMLBlock+"/"+Storage.HTMLTr);
            return 1;
        }
    }
    return 0;
}

//math
function Round(Sum)
{
    return Math.floor(Sum*1e9)/1e9;
}

function COIN_FROM_FLOAT2(Sum)
{
    var MAX_SUM_CENT = 1e9;
    var SumCOIN=Math.floor(Sum);
    var SumCENT = Math.floor(Sum * MAX_SUM_CENT - SumCOIN * MAX_SUM_CENT);
    var Coin={SumCOIN:SumCOIN,SumCENT:SumCENT};
    return Coin;
}
function ADDF(Coin,fSum)
{
    if(fSum>1e12)
        throw "Too much value when adding numbers, fSum="+fSum;
    if(fSum<0)
        throw "Negative value when adding numbers, fSum="+fSum;

    ADD(Coin,COIN_FROM_FLOAT2(fSum));
}

function SUBF(Coin,fSum)
{
    if(fSum>1e12)
        throw "Too much value when subtracting numbers, fSum="+fSum;
    if(fSum<0)
        throw "Negative value when subtracting numbers, fSum="+fSum;

    if(!SUB(Coin,COIN_FROM_FLOAT2(fSum)))
        throw "Error sum operation, fSum="+fSum;
}

function StorageToFloat(Storage)
{
    Storage.fTeraReservePool=FLOAT_FROM_COIN(Storage.TeraReservePool);
    Storage.fTeraPool=FLOAT_FROM_COIN(Storage.TeraPool);
    Storage.fUSDPool=FLOAT_FROM_COIN(Storage.USDPool);
    Storage.fUSDAll=FLOAT_FROM_COIN(Storage.USDAll);
    Storage.fDAOAll=FLOAT_FROM_COIN(Storage.DAOAll);
}


function CalcK(Storage)
{

    var Ret={};
    if(Storage.fUSDAll && Storage.fTeraReservePool)
    {
        Ret.KReserve=Storage.fUSDAll / Storage.fTeraReservePool;
    }
    else
    {
        Ret.KReserve=0.001;
    }

    if(Storage.fUSDPool && Storage.fTeraPool)
    {
        Ret.KSwap=Storage.fUSDPool / Storage.fTeraPool;
    }
    else
    {
        Ret.KSwap=0.003;
    }

    if(Storage.fDAOAll && Storage.fTeraReservePool && Storage.fTeraPool)
    {
        Ret.KDAO=Storage.fDAOAll/(Storage.fTeraReservePool+Storage.fTeraPool);
    }
    else
    {
        Ret.KDAO=1;
    }

    return Ret;
}

function AddTWPrice(Storage)
{
    var fTeraPool=FLOAT_FROM_COIN(Storage.TeraPool);
    var fUSDPool=FLOAT_FROM_COIN(Storage.USDPool);
    if(fUSDPool<1e-9)
        return;

    var Price=fUSDPool/fTeraPool;


    var TimeStamp=context.BlockNum*10000+context.TrNum;
    if(!Storage.TWPrice.TimeStamp)
        Storage.TWPrice={Price:Price,TimeStamp:TimeStamp};
    else
    {
        Storage.TWPrice.Price+=Price*(TimeStamp-Storage.TWPrice.TimeStamp);
        Storage.TWPrice.TimeStamp=TimeStamp;
    }

}

function GetSum(Params)
{
    var Amount=Params.Sum;
    if(typeof Amount!=="number" || !Amount || Amount<1e-9)
        return 0;
    if(Amount>1e12)
        throw "Err amount = "+Amount;

    return Amount;
}


//processing




"public"
function AddLiq(Params)
{
    CheckPermission();

    var TDeposit=GetSum(Params);
    if(!TDeposit)
        return;

    //Load
    var Storage=ReadStorage();
    StorageToFloat(Storage);
    var KRes=CalcK(Storage);

    if(!Storage.DAONum)
        throw "Not set DAONum";

    //calc tokens
    var TeraToReserve;
    if(Params.Mode===1)
        TeraToReserve=0;
    else
    if(Params.Mode===2)
        TeraToReserve=Round(TDeposit);
    else
        TeraToReserve=Round(TDeposit/(KRes.KReserve/KRes.KSwap+1));


    var TeraToPool=TDeposit-TeraToReserve;
    var USDToPool =Round(TeraToReserve*KReserve);
    var DAO=Round(TDeposit*KRes.KDAO);

    if(!DAO)
        return;

    //move tokens

    var AccObj=ReadAccount(context.FromNum);
    var DAOObj={Currency:Storage.DAONum,PubKeyStr:AccObj.PubKeyStr};
    var TeraObj={Currency:0,PubKeyStr:AccObj.PubKeyStr};

    var wlib=require(Storage.WalletLib);
    wlib.SubCoin(TeraObj,COIN_FROM_FLOAT2(TDeposit));
    wlib.AddCoin(DAOObj,COIN_FROM_FLOAT2(DAO));


    //New pools
    ADDF(Storage.TeraReservePool,TeraToReserve);
    ADDF(Storage.TeraPool,TeraToPool);
    ADDF(Storage.USDPool,USDToPool);
    ADDF(Storage.USDAll,USDToPool);
    ADDF(Storage.DAOAll,DAO);

    WriteStorage(Storage);

    StorageToState(Storage);
}



"public"
function RemoveLiq(Params)
{
    CheckPermission();

    var DAOBurned=GetSum(Params);
    if(!DAOBurned)
        return;


    //Load
    var Storage=ReadStorage();
    StorageToFloat(Storage);
    var KRes=CalcK(Storage);

    if(!Storage.DAONum)
        throw "Not set DAONum";


    //calc tokens
    var TeraWithdrawn = Round(DAOBurned/KRes.KDAO);
    var TeraFromReserve = Round(TeraWithdrawn/(KRes.KReserve/KRes.KSwap+1));
    var TeraFromPool  = TeraWithdrawn  - TeraFromReserve;
    var USDFromPool = Round(TeraFromPool*KRes.KSwap);

    if(!TeraWithdrawn || !TeraFromPool || !USDFromPool || !TeraFromReserve)
        return;




    if(Storage.fTeraPool<TeraFromPool)
        throw "Error amount pool Tera, TeraFromPool="+TeraFromPool;
    if(Storage.fUSDPool<USDFromPool)
        throw "Error amount pool USD, USDFromPool="+USDFromPool;
    if(Storage.fTeraReservePool<TeraFromReserve)
        throw "Error amount reserve Tera, TeraFromReserve="+TeraFromReserve;


    //move tokens

    var AccObj=ReadAccount(context.FromNum);
    var DAOObj={Currency:Storage.DAONum,PubKeyStr:AccObj.PubKeyStr};
    var TeraObj={Currency:0,PubKeyStr:AccObj.PubKeyStr};

    var wlib=require(Storage.WalletLib);
    wlib.SubCoin(DAOObj,COIN_FROM_FLOAT2(DAOBurned));
    wlib.AddCoin(TeraObj,COIN_FROM_FLOAT2(TeraWithdrawn));


    //New pools
    SUBF(Storage.TeraReservePool,TeraFromReserve);
    SUBF(Storage.TeraPool,TeraFromPool);
    SUBF(Storage.USDPool,USDFromPool);
    SUBF(Storage.USDAll,USDFromPool);
    SUBF(Storage.DAOAll,DAOBurned);

    WriteStorage(Storage);

    StorageToState(Storage);
}



"public"
function Rebalance(Params)
{

    var Storage=ReadStorage();
    if(!Storage.KReserveNew)
        return;


    //Load
    StorageToFloat(Storage);
    var KRes=CalcK(Storage);

    if(Math.abs(KRes.KReserve-Storage.KReserveNew)<1e-6)
        return;

    if(Storage.KReserveNew<1e-6)
        throw "Error KReserveNew="+Storage.KReserveNew;


    //calc tokens
    var DeltaTera=(Storage.fTeraReservePool-Storage.fUSDAll/Storage.KReserveNew)/(1+KRes.KSwap/Storage.KReserveNew);
    var DeltaUSD = DeltaTera*KRes.KSwap;
    DeltaTera=Round(DeltaTera);
    DeltaUSD=Round(DeltaUSD);

    //New pools

    if(DeltaTera>0)//increase swap pool
    {
        if(Storage.fTeraReservePool<=DeltaTera)
            throw "Error amount reserve Tera";


        SUBF(Storage.TeraReservePool,DeltaTera);
        ADDF(Storage.TeraPool,DeltaTera);
        ADDF(Storage.USDPool,DeltaUSD);
        ADDF(Storage.USDAll,DeltaUSD);


    }
    else//decrease swap pool
    {
        DeltaTera=-DeltaTera;
        DeltaUSD=-DeltaUSD;

        if(Storage.fTeraPool<=DeltaTera)
            throw "Error amount pool Tera";
        if(Storage.fUSDPool<=DeltaUSD)
            throw "Error amount pool USD";

        ADDF(Storage.TeraReservePool,DeltaTera);
        SUBF(Storage.TeraPool,DeltaTera);
        SUBF(Storage.USDPool,DeltaUSD);
        SUBF(Storage.USDAll,DeltaUSD);

    }

    WriteStorage(Storage);

    StorageToState(Storage);
}

"public"
function SwapTeraToUSD(Params)
{
    CheckPermission();

    var AmountTera=GetSum(Params);
    if(!AmountTera)
        return;


    var Storage=ReadStorage();
    StorageToFloat(Storage);

    if(!Storage.CanSwap)
        throw "Can't Swap";

    if(!Storage.USDNum)
        throw "Not set USDNum";


    //calc
    var AmountFee=AmountTera*Storage.KFee;
    var Invariant=Storage.fTeraPool * Storage.fUSDPool;
    var TeraPoolNew = Storage.fTeraPool + AmountTera;
    var USDPoolNew = Invariant/(TeraPoolNew - AmountFee);
    var USDOut = Storage.fUSDPool - USDPoolNew;
    var USDFee = USDPoolNew - Invariant/TeraPoolNew;

    if(TeraPoolNew<=0)
        throw "Error amount new pool Tera: "+TeraPoolNew;
    if(USDPoolNew<=0)
        throw "Error amount new pool USD: "+USDPoolNew;
    if(USDOut<=0)
        throw "Error amount out USD: "+USDOut;


    //move tokens

    var AccObj=ReadAccount(context.FromNum);
    var USDObj={Currency:Storage.USDNum,PubKeyStr:AccObj.PubKeyStr};
    var TeraObj={Currency:0,PubKeyStr:AccObj.PubKeyStr};

    var wlib=require(Storage.WalletLib);
    wlib.SubCoin(TeraObj,COIN_FROM_FLOAT2(AmountTera));
    wlib.AddCoin(USDObj,COIN_FROM_FLOAT2(USDOut));


    //New pools
    Storage.TeraPool = COIN_FROM_FLOAT2(TeraPoolNew);
    Storage.USDPool =  COIN_FROM_FLOAT2(USDPoolNew);

    //stat
    Storage.TeraSwapFlow+=AmountTera;
    Storage.USDSwapFlow+=USDOut;
    Storage.TeraFeeFlow += AmountFee;
    Storage.USDFeeFlow+=USDFee;

    AddTWPrice(Storage);
    WriteStorage(Storage);

    StorageToState(Storage);
}



"public"
function SwapUSDToTera(Params)
{
    CheckPermission();

    var AmountUSD=GetSum(Params);
    if(!AmountUSD)
        return;

    var Storage=ReadStorage();
    StorageToFloat(Storage);

    if(!Storage.CanSwap)
        throw "Can't Swap";

    if(!Storage.USDNum)
        throw "Not set USDNum";

    //calc
    var AmountFee=AmountUSD*Storage.KFee;
    var Invariant=Storage.fTeraPool * Storage.fUSDPool;
    var USDPoolNew = Storage.fUSDPool + AmountUSD;
    var TeraPoolNew = Invariant / (USDPoolNew - AmountFee);
    var TeraFee = TeraPoolNew - Invariant / USDPoolNew;
    var TeraOut = Storage.fTeraPool - TeraPoolNew;


    if(TeraPoolNew<=0)
        throw "Error amount new pool Tera: "+TeraPoolNew;
    if(USDPoolNew<=0)
        throw "Error amount new pool USD: "+USDPoolNew;
    if(TeraOut<=0)
        throw "Error amount out Tera: "+TeraOut;


    //move tokens

    var AccObj=ReadAccount(context.FromNum);
    var USDObj={Currency:Storage.USDNum,PubKeyStr:AccObj.PubKeyStr};
    var TeraObj={Currency:0,PubKeyStr:AccObj.PubKeyStr};

    var wlib=require(Storage.WalletLib);
    wlib.SubCoin(USDObj,COIN_FROM_FLOAT2(AmountUSD));
    wlib.AddCoin(TeraObj,COIN_FROM_FLOAT2(TeraOut));


    //New pools
    Storage.TeraPool = COIN_FROM_FLOAT2(TeraPoolNew);
    Storage.USDPool = COIN_FROM_FLOAT2(USDPoolNew);

    //stat
    Storage.TeraSwapFlow+=TeraOut;
    Storage.USDSwapFlow+=AmountUSD;
    Storage.TeraFeeFlow += TeraFee;
    Storage.USDFeeFlow+=AmountFee;

    AddTWPrice(Storage);
    WriteStorage(Storage);

    StorageToState(Storage);
}




//manage

"public"
function SetConf(Data)
{
    if(context.FromNum!==context.Smart.Owner)
        return 0;

    var Storage=ReadStorage();
    for(var key in Data)
        Storage[key]=Data[key];

    WriteStorage(Storage);
    StorageToState(Storage);
    return 1;
}

//Vote

"public"
function Vote(Params)
{
    var Storage=ReadStorage();
    if(!Storage.VoteLib)
        return;

    var lib=require(Storage.VoteLib);
    lib.Vote(Params);
}



"public"
function Withdraw(Params)
{
    CheckPermission();

    var Amount=GetSum(Params);
    if(!Amount)
        return;

    var Storage=ReadStorage();
    var wlib=require(Storage.WalletLib);
    wlib.WithdrawSum(Params.ToNum,Amount);
}

"public"
function Deposit(Params)
{
    if(context.Account.Num!==context.FromNum)
        throw "Access is allowed only from your own account.";


    var Amount=GetSum(Params);
    if(!Amount)
        return;

    var Storage=ReadStorage();
    var wlib=require(Storage.WalletLib);
    wlib.DepositSum(context.FromNum,Amount);
}


//for static call

"public"
function GetKeyValueArr(Params)
{
    var Storage=ReadStorage();
    var RetArr=[];
    for(var i=0;i<Params.Keys.length;i++)
    {
        var Key=Params.Keys[i];
        var Value={};
        if(Key==="Pools")
            Value=Storage;
        else
        if(Key.substr(0,7)==="AMOUNT:")
        {
            if(Storage.WalletLib)
                Value=ReadValue(Key,require(Storage.WalletLib).GetFormatCoin());
        }
        else
        {
            Value=ReadValue(Key,Params.Frms[i]);
        }

        RetArr.push(Value);

    }

    return RetArr;
}







