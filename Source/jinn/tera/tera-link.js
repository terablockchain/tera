/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
module.exports.Init = Init;

function Init(Engine)
{
    
    Engine.GetTxSenderNum = function (Tx,BlockNum)
    {
        
        var type = Tx.body[0];
        var App = DAppByType[type];
        var Ret;
        if(App)
            Ret = App.GetSenderNum(BlockNum, Tx.body);
        else
            Ret = 0;
        return Ret;
    };
    
    Engine.GetTxSenderOperationID = function (Tx,BlockNum)
    {
        var OperationID;
        var type = Tx.body[0];
        var App = DAppByType[type];
        if(App)
            OperationID = App.GetSenderOperationID(BlockNum, Tx.body);
        else
            OperationID = 0;
        return OperationID;
    };
    
    Engine.GetAccountBaseValue = function (AccNum,BlockNum)
    {
        if(!AccNum)
            return 0;
        
        var Value = ACCOUNTS.GetPrevAccountValue(AccNum, BlockNum);
        if(Value)
        {
            return Value.SumCOIN * 1e9 + Value.SumCENT;
        }
        else
        {
            return 0;
        }
    };
    
    Engine.GetAccountOperationID = function (SenderNum,BlockNum)
    {
        if(!SenderNum)
            return 0;
        
        var AccData = ACCOUNTS.ReadState(SenderNum);
        if(AccData)
            return AccData.Value.OperationID;
        else
            return 0;
    };
    
    Engine.CheckSignTx = function (Tx,BlockNum)
    {
        var type = Tx.body[0];
        var App = DAppByType[type];
        if(App)
            return App.CheckSignTransferTx(BlockNum, Tx.body);
        else
            return 0;
    };
    
    global.ON_USE_CONST = function ()
    {
        global.JINN_WARNING =  + global.LOG_LEVEL;
        
        if(global.WEB_PROCESS)
            global.WEB_PROCESS.UpdateConst = 1;
        
        if(global.COMMON_KEY && Engine.OnSeNodeName)
            Engine.OnSeNodeName();
        else
        {
            Engine.ArrCommonSecret = [];
            Engine.ArrNodeName = [];
        }
    };
    SERVER.DO_CONSTANT = function ()
    {
        ON_USE_CONST();
    };
    Engine.ChildIDCounter = 10000;
    Engine.SetChildID = function (Child)
    {
        Engine.ChildIDCounter++;
        Child.ID = Engine.ChildIDCounter;
    };
    Engine.SetChildRndHash = function (Child,RndHash)
    {
        Child.RndHash = RndHash;
        Child.ArrCommonSecret = sha3(global.COMMON_KEY + ":" + GetHexFromArr(RndHash));
    };
    Engine.SetChildName = function (Child,NameArr)
    {
        var Str = Engine.ValueFromEncrypt(Child, NameArr);
        if(Str.substr(0, 8) === "CLUSTER:")
        {
            Child.IsCluster = 1;
            Child.Name = Str.substr(8);
            if(Child.AddrItem && Child.AddrItem.Score < 5 * 1e6)
                Child.AddrItem.Score = 10 * 1e6;
        }
        else
        {
            Child.IsCluster = 0;
            Child.Name = "";
        }
    };
    
    Engine.OnSeNodeName = function ()
    {
        var Name = global.NODES_NAME;
        if(!Name)
        {
            if(Engine.ip === "0.0.0.0")
                Name = "-";
            else
                Name = Engine.ip;
        }
        Engine.ArrCommonSecret = sha3(global.COMMON_KEY + ":" + Engine.RndHashStr);
        Engine.ArrNodeName = Engine.ValueToEncrypt("CLUSTER:" + Name, 40);
    };
    
    SERVER.GetNodesArrWithAlive = function ()
    {
        var Arr = [];
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            var Power = Engine.GetAddrPower(Item.AddrHashPOW, Item.BlockNum);
            if(Item.System)
                Power += global.MIN_POW_ADDRES;
            if(Power > 0)
            {
                Arr.push({ip:Item.ip, port:Item.ip, portweb:Item.portweb});
            }
        }
        return Arr;
    };
    SERVER.ConnectToAll = function ()
    {
        var Count = 0;
        
        var Map = {};
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(Child)
            {
                Map[Child.ID] = 1;
            }
        }
        
        var it = Engine.NodesTree.iterator(), AddrItem;
        while((AddrItem = it.next()) !== null)
        {
            if(Map[AddrItem.ID])
                continue;
            
            Engine.InitAddrItem(AddrItem);
            
            var Power = Engine.GetAddrPower(AddrItem.AddrHashPOW, AddrItem.BlockNum);
            if(AddrItem.System || global.MODELING)
                Power += MIN_POW_ADDRES;
            
            if(Power < global.MIN_POW_ADDRES / 2)
                continue;
            
            var Child = Engine.RetNewConnectByAddr(AddrItem);
            
            if(Engine.SendConnectReq(Child))
                Count++;
        }
        var Str = "Connect to " + Count + " nodes";
        ToLog(Str);
        return Str;
    };
    
    Object.defineProperty(SERVER, "ip", {get:function ()
        {
            return Engine.ip;
        }});
    Object.defineProperty(SERVER, "port", {get:function ()
        {
            return Engine.port;
        }});
    Engine.OnSetTimeDelta = function (DeltaTime)
    {
        SAVE_CONST(0);
    };
    Engine.OnSetOwnIP = function (ip)
    {
        global.JINN_IP = ip;
        SAVE_CONST(1);
    };
}
