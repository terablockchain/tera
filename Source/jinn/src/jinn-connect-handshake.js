/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Handshake
 * Getting the main characteristics of the node with which the connection occurs
 *
**/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Handshake"});

//Engine context

function InitClass(Engine)
{
    Engine.RndHash = GetRandomBytes(32);
    Engine.RndHashStr = GetHexFromArr(Engine.RndHash);
    Engine.ArrNodeName = [];
    Engine.StartHandShake = function (Child)
    {
        
        Child.ToLogNet("StartHandShake");
        
        var Data = {Network:JINN_CONST.NETWORK_NAME, DepricatedShard:JINN_CONST.SHARD_NAME, ip:Engine.ip, port:Engine.port, DirectIP:Engine.DirectIP,
            RndHash:Engine.RndHash, RunVersionNum:global.UPDATE_CODE_VERSION_NUM, CodeVersionNum:CODE_VERSION.VersionNum, FindSelfIP:Child.FindSelfIP,
            RemoteIP:Child.ip, NameArr:Engine.ArrNodeName, Shard:JINN_CONST.SHARD_NAME, CurTime:Engine.GetTransferTime(Child), };
        Engine.Send("HANDSHAKE", Child, Data, Engine.OnHandShakeReturn);
    };
    Engine.HANDSHAKE_SEND = {Network:"str20", DepricatedShard:"str5", RemoteIP:"str30", port:"uint16", DirectIP:"byte", RndHash:"hash",
        RunVersionNum:"uint", CodeVersionNum:"uint", FindSelfIP:"byte", NameArr:"arr40", Shard:SHARD_STR_TYPE, CurTime:"uint32", };
    Engine.HANDSHAKE_RET = {result:"byte", RndHash:"hash", RemoteIP:"str30", RunVersionNum:"uint", CodeVersionNum:"uint", text:"str",
        NetConstVer:"uint", NameArr:"arr40", Network:"str20", Shard:SHARD_STR_TYPE, CurTime:"uint32", };
    Engine.HANDSHAKE = function (Child,Data)
    {
        if(!Data)
        {
            Child.ToLog("Error HANDSHAKE data", 2);
            return;
        }
        
        Child.ToLogNet("HANDSHAKE Level=" + Child.Level + " port:" + Data.port);
        
        Engine.ProcessNewVersionNum(Child, Data.CodeVersionNum);
        
        var Ret = {result:0, RndHash:Engine.RndHash, RemoteIP:Child.ip, RunVersionNum:global.UPDATE_CODE_VERSION_NUM, CodeVersionNum:CODE_VERSION.VersionNum,
            NetConstVer:JINN_NET_CONSTANT.NetConstVer, NameArr:Engine.ArrNodeName, Network:JINN_CONST.NETWORK_NAME, Shard:JINN_CONST.SHARD_NAME,
            CurTime:Engine.GetTransferTime(Child), };
        var AddrChild = {ip:Child.ip, port:Data.port, BlockNum:0, Nonce:0, RndHash:Data.RndHash, ShardName:Data.Shard};
        
        var StrError;
        if(Data.Network !== JINN_CONST.NETWORK_NAME)
        {
            StrError = "ERROR NETWORK_NAME=" + Data.Network;
            Engine.OnDeleteConnect(Child, StrError);
        }
        else
            if(IsEqArr(Engine.RndHash, Data.RndHash))
            {
                if(Data.RemoteIP && Engine.ip === "0.0.0.0" && !IsLocalIP(Data.RemoteIP))
                {
                    Child.ToLogNet("Set self IP: " + Data.RemoteIP, 3);
                    Engine.SetOwnIP(Data.RemoteIP);
                }
                
                Engine.SetItemSelf(AddrChild);
                StrError = "ERROR: SELF ADDRESS";
            }
            else
                if(!Engine.CanConnect(Child))
                {
                    StrError = "ERROR: NOT CAN CONNECT";
                    Engine.OnDeleteConnect(Child, StrError);
                }
                else
                    if(Engine.FindConnectByHash(Data.RndHash))
                        StrError = "ERROR: FIND IN CONNECT";
        
        Engine.SetChildRndHash(Child, Data.RndHash);
        Engine.SetChildName(Child, Data.NameArr);
        if(!Engine.CanShardConnect(Child, Data.Shard))
        {
            StrError = "ERROR SHARD_NAME=" + Data.Shard;
        }
        
        if(StrError)
        {
            Child.ToLogNet(StrError, 4);
            Ret.text = StrError;
            return Ret;
        }
        
        Engine.SetAddrItemForChild(AddrChild, Child, Data.DirectIP);
        
        Engine.SetShardName(Child, Data.Shard);
        Engine.SetTransferTime(Child, Data.CurTime);
        
        Engine.DoMyAddres(Child, Data.RemoteIP);
        Engine.SetItemRndHash(Child.AddrItem, Data.RndHash);
        
        Engine.SetIPPort(Child, AddrChild.ip, AddrChild.port);
        
        Engine.OnAddConnect(Child);
        
        Engine.StartSpeedTransfer(Child);
        
        Ret.result = 1;
        return Ret;
    };
    
    Engine.SetChildRndHash = function (Child,RndHash)
    {
        Child.RndHash = RndHash;
    };
    Engine.SetChildName = function (Child,NameArr)
    {
        Child.IsCluster = 0;
    };
    
    Engine.OnHandShakeReturn = function (Child,Data)
    {
        if(!Data)
            return;
        
        Engine.SetChildRndHash(Child, Data.RndHash);
        Engine.SetChildName(Child, Data.NameArr);
        Engine.SetShardName(Child, Data.Shard);
        Engine.SetTransferTime(Child, Data.CurTime);
        Engine.DoMyAddres(Child, Data.RemoteIP);
        Engine.SetItemRndHash(Child, Data.RndHash);
        
        Engine.ProcessNetConstant(Child, Data.NetConstVer);
        Engine.ProcessNewVersionNum(Child, Data.CodeVersionNum);
        
        if(!Data.result)
        {
            Child.ToLogNet("OnHandShakeReturn : result=" + Data.result + " text:" + Data.text, 5);
            
            Engine.OnDeleteConnect(Child, "OnHandShakeReturn");
            return;
        }
        if(!Engine.CanConnect(Child))
        {
            Child.ToLogNet("Not can connect to " + Child.Name(), 4);
            Engine.OnDeleteConnect(Child, "NotCanConnect");
            return;
        }
        
        Child.ToLogNet("Result HandShake OK Level = " + Child.Level);
        
        Engine.OnAddConnect(Child);
        
        if(Engine.InHotStart(Child))
            Engine.TryHotConnection(Child, 1);
        
        Engine.StartSpeedTransfer(Child);
    };
    
    Engine.DoMyAddres = function (Child,myip)
    {
        myip = GetNormalIP(myip);
        
        if(myip && Engine.ip === "0.0.0.0" && !IsLocalIP(myip))
        {
            
            Child.myip = myip;
            var AllSum = 0;
            var CurSum = 0;
            for(var i = 0; i < Engine.ConnectArray.length; i++)
            {
                var Child = Engine.ConnectArray[i];
                if(Child && Child.IsOpen())
                {
                    AllSum += Child.Score;
                    if(Child.myip === myip)
                    {
                        CurSum += Child.Score;
                    }
                }
            }
            
            if(AllSum > CurSum && CurSum > 10000 && 100 * CurSum / AllSum > 50)
            {
                Child.ToLogNet("Set self IP: " + myip + " Score: " + CurSum, 3);
                Engine.SetOwnIP(myip);
                return;
            }
            var Child2 = Engine.NewConnect(Engine.IDArr, myip, Engine.port);
            if(Child2)
            {
                Child2.FindSelfIP = 1;
                var Str = "Start set  my ip = " + myip + ":" + Engine.port;
                Child.ToLog(Str, 4);
                Child2.ToLogNet(Str);
                Engine.SendConnectReq(Child2);
            }
        }
    };
}
