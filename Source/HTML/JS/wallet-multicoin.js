//wallet-multicoin


//---------------------------------------------------------------------------
//Promise semaphore support
//---------------------------------------------------------------------------
var PROMISE_MAP={};
function InitPromiseMap()
{
    PROMISE_MAP={};
}
function FirstPromise(ID)
{
    var Item=PROMISE_MAP[ID];
    if(Item && Date.now() - Item.Time < 10*1000)
        return 0;

    Item={Time:Date.now()};
    PROMISE_MAP[ID]=Item;

    return 1;
}
function LeavePromise(ID)
{
    delete PROMISE_MAP[ID];
}


//---------------------------------------------------------------------------
//NFT fetch support
//---------------------------------------------------------------------------
var MAP_NFT_ATTR={};
var MAP_NFT_WORK={};
var MAP_NFT_WORK_NEW={};
setInterval(StartWorkNftImg(),1*1000);

function AddWorkNftImg(Addr,Num)
{
    MAP_NFT_WORK_NEW[Addr]=Num;
}
function RestartWorkNftImg()
{
    //console.log("RestartWorkNftImg")
    MAP_NFT_WORK=MAP_NFT_WORK_NEW;
    MAP_NFT_WORK_NEW={};
    StartWorkNftImg();
}
function StartWorkNftImg()
{
    var Count=0;
    for(var Addr in MAP_NFT_WORK)
    {
        var Attr=MAP_NFT_ATTR[Addr];
        if(Attr)
        {
            DoImgWork(Addr);
        }
        else
        {
            Count++;
            if(Count>100)
                break;

            SetNftAttrMap(Addr);
        }
    }
}
function DoImgWork(Addr)
{
    var Attr=MAP_NFT_ATTR[Addr];
    var Num=MAP_NFT_WORK[Addr];
    var Element=$("idImg"+Num);
    if(Element)
    {
        Element.src = GetURLPath(Attr.image);
    }

    delete MAP_NFT_WORK[Addr];
}

function SetNftAttrMap(Addr)
{
    var Addr2=GetURLPath(Addr);

    fetch(Addr2, {method:'get', cache:'default', mode:'cors', credentials2:'include', headers:this.Headers}).then(function (response)
    {
        response.text().then(function (text)
        {
            if(text.substr(0,1)==="{")
            {
                var Attr=JSON.parse(text);
                MAP_NFT_ATTR[Addr]=Attr;
                DoImgWork(Addr);
            }
        });
    }).catch(function (err)
    {
        MAP_NFT_ATTR[Addr]={};
        delete MAP_NFT_WORK[Addr];
        //console.log(err);
    });
}


//--------------------------------------------------------------------------- NFT cards
async function FillListNFT(IDList,TokensArr,PrefixNum,TokenName,bView,TokenOnly,Account)
{
    if(!FirstPromise("FillListNFT"))
        return;
    //console.log("FillListNFT Tokens=",TokensArr);

    FillListNFTNext(IDList,TokensArr,PrefixNum,TokenName,"",bView,TokenOnly,Account);
    LeavePromise("FillListNFT");
}

function GetCoinStoreNum()
{
    if(!CONFIG_DATA || !CONFIG_DATA.COIN_STORE_NUM)
        return 0;

    return  CONFIG_DATA.COIN_STORE_NUM;
}


async function FillListNFTNext(IDList, TokensArr,PrefixNum,TokenName,TokenID,bView,TokenOnly,Account)
{
    if(!PrefixNum)
        PrefixNum=0;
    var bNFT=0;
    var Str="";


    if(bView && TokensArr)
    {
        var Num=PrefixNum+1;
        IDList.FirstSelect="idNFT"+Num;

        var Arr=TokensArr;
        for(var t=0;t<Arr.length;t++)
        {
            bNFT=1;

            var Item=Arr[t];
            if(TokenName && Item.Token!=TokenName)
                continue;
            if(TokenOnly && Item.Inner)
                continue;

            for(var i=0;i<Item.Arr.length;i++)
            {
                var Value=Item.Arr[i];
                if(TokenID && Value.ID!=TokenID)
                    continue;

                var Sum=FLOAT_FROM_COIN(Value);
                if(!Sum)// && !Item.Inner)
                    continue;

                Item.TokenName = Item.Token;
                if(Item.Currency)
                {
                    Item.TokenName = await ACurrencyName(Item.Currency,Item.Token);
                }


                // if(!Value.URI && Value.ID && +Value.ID>1000000)
                // {
                //     Value.URI="/nft/"+Value.ID;
                // }

                if(Item.IconBlockNum && !Value.URI && !Value.IMG)
                {
                    Value.IMG = "/file/" + Item.IconBlockNum + "/" + Item.IconTrNum;
                }

                if(Value.IMG)
                    Value.IMG = GetURLPath(Value.IMG);


                if(Value.IMG)
                {
                    // if(Item.Currency)
                    // {
                    //     Item.TokenName = "" + Item.Currency + "." + Item.Token;
                    // }
                    Str+=GetNFTCard(IDList.id,Item,Value,Sum,Num,Account);
                    Num++;
                }
                else
                {
                    var Addr=Value.URI;
                    if(!Addr && Value.ID && +Value.ID>1000000)
                    {
                        Addr="/nft/"+Value.ID;
                    }

                    if(Addr)
                    {
                        AddWorkNftImg(Addr,Num);
                    }
                    Str+=GetNFTCard(IDList.id,Item,Value,Sum,Num,Account);
                    Num++;
                }

            }
        }
    }


    if(IDList.strJSON !== Str)
    {
        IDList.strJSON = Str;
        IDList.innerHTML=Str;
        //IDList.CurSelect="";
    }

    SelectNFTItem(IDList.id);

    RestartWorkNftImg();

    // if(window.idListNFT===IDList)
    //     SetVisibleBlock("idTokenNFT",bNFT);
    if(!bNFT)
         IDList.CurSelect="";

}

function GetNFTCard(ListId,Token,Value,Sum,Num,Account)
{
    var ID=GetShortTokenID(Value.ID);
    if(ID=="0")
        ID="";

    var Str= `
    <item_nft id="idNFT${Num}" data-token="${Token.Token}" data-currency="${Token.Currency}" data-amount="${Sum}" data-id="${Value.ID}" data-account="${Account}" onclick="NFTClick('${ListId}',this)">
    <DIV class="tokenname">${Token.TokenName}<BR>${ID}</DIV>
    <img class="img_nft" id="idImg${Num}" ${Value.IMG?'src="'+Value.IMG+'"':''}>`;

    if(ID)
        Str+=`Amount:<b>${Sum}</b></item_nft>`;
    else
        Str+=`<DIV>Amount:</DIV><b>${Sum}</b></item_nft>`;

    return Str;

}

function GetCopyNFTCard(IdSrc,Token,ID,Count)
{
    var Img=$(IdSrc.replace("idNFT","idImg"));
    ID=GetShortTokenID(ID);
    if(!Count)
        Count="0";

    return `
    <div>${Token}<BR>${ID}
    <img class="img_nft" src="${Img.src}">
    Amount:<b>${Count}</b>
    </div>`;
}




function GetShortTokenID(ID)
{
    ID=String(ID);
    if(ID.length>11)
    {
        ID=ID.substr(0,5)+".."+ID.substr(ID.length-5);
    }
    return ID;
}

var clickTimer = null;
var clickElement=null;
function NFTClick(List,element)
{
    SelectNFTItem(List,element);
    //console.log(List)
    if(List==="idListShow")
    {
        return OpenToken(List,element)
    }

    if(clickTimer && clickElement && clickElement.id!==element.id)
    {
        clearTimeout(clickTimer);
        clickTimer = null;
    }
    clickElement=element;

    if (clickTimer == null)
    {
        clickTimer = setTimeout(function ()
        {
            clickTimer = null;
        }, 500)
    } else
    {
        clearTimeout(clickTimer);
        clickTimer = null;

        OpenToken(List,element)

    }
}

function SelectNFTItem(List,element)
{
    var IDList=$(List);

    if(element && window.OnSelectNFTItem)
        if(window.OnSelectNFTItem(IDList,element)===0)
            return;

    if(element)
        IDList.CurSelect=element.id;

    var arr = document.querySelectorAll("item_nft");
    for (var n = 0; n < arr.length; n++)
    {
        let Item=arr[n];
        if(Item.id==IDList.CurSelect)
            Item.className="selected";
        else
            Item.className="";
    }

    if(window.SetCurCurrencyName)
        SetCurCurrencyName();
}

//---------------------------------------------------------------------------

async function OpenToken(List,element)
{
    //open dapp

    if(!element || !element.dataset)
        return;
    var dataset = element.dataset;

    var Params =
        {
            Account: +dataset.account,
            ID: dataset.id,
        };
    var Currency = +dataset.currency;
    if(!Currency)
        return;

    var SmallMode = 0;
    var SmartObj = await AReadSmart(Currency, ["Account"]);
    if(SmartObj)
    {
        try
        {
            SmallMode = await ACall(SmartObj.Account, "InPlaceShow");
        }
        catch(e)
        {
        }
    }


    var StrParams=JSON.stringify(Params);
    if(SmallMode)
    {
        var StrPath = '/dapp/' + Currency+"?nostatus#" + StrParams;
        if(IsLocalClient())
        {
            StrPath = "./dapp-frame.html?dapp="  + Currency+"?nostatus#" + StrParams;
        }


        openModal('idShowPage', 'idCloseShow');

        idShowContent.innerHTML = "";
        var iframe = document.createElement('iframe');
        iframe.id = "idShowFrame";
        iframe.name = 'dapp';
        iframe.sandbox = "allow-scripts allow-same-origin allow-popups";
        iframe.src = StrPath;
        iframe.setAttribute('allowfullscreen', '')
        iframe.setAttribute('oallowfullscreen', '')
        iframe.setAttribute('mozallowfullscreen', '')
        iframe.setAttribute('webkitallowfullscreen', '')
        idShowContent.appendChild(iframe);
        //idShowContent.innerHTML = `<iframe id="idShowFrame" src="${StrPath}" type="text/html" sandbox="allow-scripts allow-same-origin allow-popups"   allowfullscreen/>`;
        return;
    }


    OpenDapps(Currency, StrParams, 1);
    //console.log(List,StrParams);
}
function OpenLinkInSandbox(Path)
{
    idShowFrame.src=Path;
    //idShowContent.innerHTML = `<iframe id="idShowFrame" src="${Path}" type="text/html" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"   allowfullscreen frameborder="0"/>`;
}

function closeShowPage()
{
    closeIFrame();
}
function closeIFrame()
{
    closeModal();
    if(window.OnSelectTab)
        OnSelectTab("TabSend");

    idShowContent.innerHTML = "";
}


//---------------------------------------------------------------------------
function RetCountERC(Item,DopStr)
{
    var BalanceArr=Item.BalanceArr;
    if(!BalanceArr)
        return "";
    var Count=0;
    for(var t=0;t<BalanceArr.length;t++)
    {
        var Tokens=BalanceArr[t];
        if(Tokens.Inner)
            continue;
        for(var i=0;i<Tokens.Arr.length;i++)
        {
            var Coin = Tokens.Arr[i];
            if(!FLOAT_FROM_COIN(Coin))
                continue;
            Count ++;
        }
    }

    if(Count<=0)
        return "";
    if(DopStr)
        Count = DopStr+Count;
    return "<a class='olink' target='_blank' onclick='OpenTokensPage(" + Item.Num + ")'>" + Count + "</a>";
}

async function CalcTotalAmountERC(Item,ListTotal,bInner)
{
    var StrListTokens = "";
    var CountTokens = 0;
    var ImgTokens="";
    var ImgNFTs="";
    var CountImgTokens = 0;
    var CountNFT = 0;
    for(var n=0;Item.BalanceArr && n<Item.BalanceArr.length;n++)
    {
        var Token=Item.BalanceArr[n];

        var TokenName=await ACurrencyName(Token.Currency,Token.Token);
        var CurrencyPath = RetIconPath(Token,1,1);
        //console.log("TokenName=",TokenName,"=",CurrencyPath);

        for(var j=0;j<Token.Arr.length;j++)
        {
            var Value2=Token.Arr[j];
            //console.log("Value2=",Value2)
            if(Value2 && FLOAT_FROM_COIN(Value2))
            {
                if(bInner || !Token.Inner)
                {
                    if(!Value2.ID || Value2.ID == "" || Value2.ID == "0")
                    {
                        CountTokens++;
                        var StrImg="";
                        if(CurrencyPath)
                        {
                            StrImg = `<img src="${CurrencyPath}" class="token_img">`;
                            if(CountImgTokens<3)
                                ImgTokens+=StrImg;
                            CountImgTokens++;
                        }
                        StrListTokens += `<div class="token_row"><div class="token_name">${TokenName}</div><div class="token_value">${STRING_FROM_COIN(Value2)}</div>${StrImg}</div>`;
                    }
                    else
                    {


                        if(CountNFT<3)
                            ImgNFTs+=GetTokenImage(Value2.ID,"token_nft");

                        CountNFT++;
                    }
                }


                var Total = ListTotal[TokenName];
                if(!Total)
                {
                    Total = {SumCOIN: 0, SumCENT: 0, Name: TokenName};
                    ListTotal[TokenName] = Total;
                }

                ADD(Total, Value2);
                //console.log("ADD ",TokenName,Value2)

            }
        }
    }

    return {
                ListTokens:StrListTokens,
                CountTokens:CountTokens,
                CountNFT:CountNFT,
                ImgTokens:ImgTokens,
                ImgNFTs:ImgNFTs,
            }
}


async function OpenTokensPage(Account)
{
    var Item=await AReadAccount(Account);
    //console.log("OpenTokensPage: Account=",Account,Item);

    if(Item && Item.BalanceArr)
    {

        var Str = `
    <div>
        <div class="row-head">Token list:</div>
        <BR>
        <grid_nft id="idListShow">
            <item_nft>Loading...</item_nft>
        </grid_nft>
    </div>
        `;

        openModal('idShowPage', 'idCloseShow');
        $("idShowContent").innerHTML = Str;


        FillListNFT(idListShow, Item.BalanceArr, Account * 10000 + 5000, "", 1, 1, Account);
    }
}




