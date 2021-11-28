/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

(function ()
{
    function $(id)
    {
        return document.getElementById(id);
    }
    if(!window.web3)
        window.web3 = {};
    web3.tera = {Login:function (SmartNum,UrlPath,Forse)
        {
            if(!$("idTeraWallet"))
            {
                return InjectHTML(UrlPath, SmartNum, Forse);
            }
            
            return SendMessage({cmd:"login", smart:SmartNum, Forse:Forse});
        }, Logout:function ()
        {
            SetVisibleBlock("idTeraWallet", 0);
            return SendMessage({cmd:"logout"});
        }, Send:function (Tx)
        {
            SetVisibleBlock("idTeraWallet", 1);
            return SendMessage({cmd:"send", Item:Tx});
        }, SendCall:function (Item,F)
        {
            return SendMessage({cmd:"sendcall", Item:Item}, F);
        }, StaticCall:function (Item,F)
        {
            return SendMessage({cmd:"staticcall", Item:Item}, F);
        }, CreateAccount:function (Item,F)
        {
            return SendMessage({cmd:"sendcreate", Item:Item}, F);
        }, OnLogin:function (F)
        {
            web3.tera._OnLogin = F;
        }, OnInfo:function (F)
        {
            web3.tera._OnInfo = F;
        }, OnEvent:function (F)
        {
            web3.tera._OnEvent = F;
        }, InjectHTML:InjectHTML, _CounterId:0, _MapId:{}, GetPubKey:function (F)
        {
            return SendMessage({cmd:"GetPubKey"}, F);
        }, GetAccountList:function (Params,F)
        {
            var Data = {cmd:"DappAccountList", Params:Params};
            return SendMessage(Data, F);
        }, GetSmartList:function (Params,F)
        {
            var Data = {cmd:"DappSmartList", Params:Params};
            return SendMessage(Data, F);
        }, GetBlockList:function (Params,F)
        {
            var Data = {cmd:"DappBlockList", Params:Params};
            return SendMessage(Data, F);
        }, GetTransactionList:function (Params,F)
        {
            var Data = {cmd:"DappTransactionList", Params:Params};
            return SendMessage(Data, F);
        }, GetBlockFile:function (Params,F)
        {
            var Data = {cmd:"DappBlockFile", Params:Params};
            return SendMessage(Data, F);
        }, ComputeSecret:function (Params,F)
        {
            return SendMessage({cmd:"ComputeSecret", Params:Params}, F);
        }, };
    function SetVisibleBlock(name,b)
    {
        var id = $(name);
        if(id)
            id.style.display = b ? 'block' : "none";
    };
    
    function SendMessage(Data,F)
    {
        if(F)
        {
            web3.tera._CounterId++;
            web3.tera._MapId[web3.tera._CounterId] = F;
            Data.id = web3.tera._CounterId;
        }
        
        var win = window.frames.terawallet;
        if(!win)
            return 0;
        win.postMessage(Data, "*");
        return 1;
    };
    
    function OnMessage(event)
    {
        var Data = event.data;
        if(Data.type !== "web3-tera")
            return;
        
        switch(Data.cmd)
        {
            case "onlogin":
                
                SetVisibleBlock("idTeraWallet", 0);
                if(web3.tera._OnLogin)
                    web3.tera._OnLogin(Data.result);
                
                break;
                
            case "onvisible":
                SetVisibleBlock("idTeraWallet", 1);
                break;
            case "unvisible":
                SetVisibleBlock("idTeraWallet", 0);
                break;
                
            case "oninfo":
                web3.tera.INFO = Data;
                if(web3.tera._OnInfo)
                    web3.tera._OnInfo();
                break;
            case "onevent":
                if(web3.tera._OnEvent)
                    web3.tera._OnEvent(Data);
                break;
                
            default:
                if(Data.id)
                {
                    var F = web3.tera._MapId[Data.id];
                    delete web3.tera._MapId[Data.id];
                    if(F)
                    {
                        F(Data);
                    }
                }
        }
    };
    function InjectHTML(UrlPath,SmartNum,Forse)
    {
        if(!UrlPath)
            UrlPath = "https://terawallet.org/web3-wallet.html";
        
        if($("idTeraWallet"))
            return console.log("Was created tera-HTML tags");
        
        var Bodys = document.getElementsByTagName('body');
        if(!Bodys || !Bodys.length)
            return console.log("Not find tag <BODY>");
        
        var iframe = document.createElement('iframe');
        iframe.name = 'terawallet';
        iframe.sandbox = "allow-scripts allow-popups allow-same-origin";
        iframe.src = UrlPath;
        iframe.style = "display: none; width:320px; height: 320px; padding: 0; margin: 10px;  " + "border: 1px solid gray; border-radius:5px; box-shadow: 0 0 5px rgb(0 0 0); " + "position:absolute; top:50px; left: calc(50% - 160px);";
        
        iframe.id = "idTeraWallet";
        Bodys[0].appendChild(iframe);
        
        if(SmartNum)
            iframe.onload = function ()
            {
                SendMessage({cmd:"login", smart:SmartNum, Forse:Forse});
            };
    };
    
    window.addEventListener("message", OnMessage);
}
)();

