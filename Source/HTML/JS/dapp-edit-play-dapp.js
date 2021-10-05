function CloseDapp()
{
    console.log("CloseDapp");
    idFrame.srcdoc="";
    SetVisibleBlock("idFrame", 0);
}

function DoGetData(Name,Params,Func)
{
    var SetData = {result:0};
    switch(Name)
    {
        case "DappWalletList":
            SetData.result = 1;
            SetData.arr = VM_VALUE.ArrWallet;
            break;
        case "DappSmartHTMLFile":
            SetData.result = 1;
            SetData.Body = GetHTMLCode();
            break;
        case "DappBlockFile":
            SetData.Body = VM_BLOCKS[Params.BlockNum];
            SetData.result = !!SetData.Body;
            break;
        case "DappGetBalance":
            SetData.result = 1;
            SetData.Value=ACCOUNTS.GetBalance(Params.AccountID,Params.Currency,Params.ID);
            break;
        case "DappAccountList":
            SetData.result = 1;
            //SetData.arr = VM_ACCOUNTS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            SetData.arr=[];
            for(var num=Params.StartNum;num<Params.StartNum + Params.CountNum;num++)
                SetData.arr.push(ACCOUNTS.ReadStateTR(num));

            break;
        case "DappSmartList":
            SetData.result = 1;
            SetData.arr = VM_SMARTS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappBlockList":
            SetData.result = 1;
            SetData.arr = VM_BLOCKS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappTransactionList":
            break;
        case "DappStaticCall":
            //if(Params.Account >= VM_ACCOUNTS.length)
            if(Params.Account >= 200)
            {
                if(!Params.Account)
                    Params.Account = BASE_ACCOUNT.Num;

                GetData("DappStaticCall", Params,Func);
                return;

            }
            else
            {
                SetData.RetValue = SendCallMethod(Params.Account, Params.MethodName, Params.Params, Params.ParamsArr, 0, glSmart, 0,0,0,0,1);
            }
            SetData.result = 1;
            break;

        default:
            ToLog("Error method name: " + Name);
    }
    ToLogDebug("GetData:\n" + JSON.stringify(Params));
    ToLogDebug("RESULT:\n" + JSON.stringify(SetData));

    Func(SetData);
}

function DoDappInfo(Data)
{
    var Network_Name = CONFIG_DATA.NETWORK;
    if(!Network_Name)
        Network_Name = "VIRTUAL-NET";

    ToLogDebug("DoDappInfo");
    Data.EmulateMode = 1;
    Data.CanReloadDapp = 0;
    Data.result = 1;
    Data.DELTA_CURRENT_TIME = 0;
    Data.FIRST_TIME_BLOCK = VM_VALUE.FIRST_TIME_BLOCK;
    Data.CONSENSUS_PERIOD_TIME = VM_VALUE.CONSENSUS_PERIOD_TIME;
    Data.PRICE_DAO = {NewAccount:10, NewSmart:100, NewTokenSmart:10000, Storage:0.01};
    Data.NEW_SIGN_TIME = 0;
    Data.NETWORK = Network_Name;
    Data.SHARD_NAME = "TERA";

    Data.PubKey = DefPubKeyArr;
    Data.WalletIsOpen = 1;
    Data.WalletCanSign = 1;

    Data.Smart = SMART;

    Data.Account = BASE_ACCOUNT;

    Data.NumDappInfo = 0;
    Data.CurTime = Date.now();
    Data.CurBlockNum = VM_VALUE.CurBlockNum;
    Data.MaxAccID = VM_ACCOUNTS.length - 1;
    Data.MaxDappsID = VM_VALUE.MaxDappsID;
    Data.OPEN_PATH = OPEN_PATH;

    Data.ArrWallet = VM_VALUE.ArrWallet;
    Data.ArrEvent = [];
    Data.ArrLog = [];

    SendMessage(Data);
}


