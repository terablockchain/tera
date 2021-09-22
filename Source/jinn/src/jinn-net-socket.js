/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Working with network sockets, creating a network server
 *
**/

'use strict';

const net = require("net");

global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter, Name:"NetSocket"});


//Engine context

function InitClass(Engine)
{
    
    Engine.CreateServer = function ()
    {
        Engine.Server = net.createServer(function (Socket)
        {
            Engine.SetEventsOnError(Socket);
            
            if(global.StopNetwork)
                return;
            
            if(!Socket || !Socket.remoteAddress)
                return;
            if(Engine.WasBanIP({address:Socket.remoteAddress}))
            {
                Engine.CloseSocket(Socket, undefined, "WAS BAN", true);
                return;
            }
            
            var Child = Engine.RetNewConnectByIPPort(Socket.remoteAddress, Socket.remotePort, 1);
            if(Child)
            {
                Child.InComeConnect = 1;
                Child.ToLogNet("Connect from " + Socket.remoteAddress + ":" + Socket.remotePort);
                Engine.SetEventsProcessing(Socket, Child, "Client", 1);
            }
            else
            {
                Engine.CloseSocket(Socket, Child, "Error child");
            }
        });
        
        Engine.Server.on('close', function ()
        {
        });
        
        Engine.Server.on('error', function (err)
        {
            if(err.code === 'EADDRINUSE')
            {
                Engine.ToLog('Port ' + Engine.port + ' in use, retrying after 5 sec...');
                if(Engine.Server)
                    Engine.Server.close();
                setTimeout(function ()
                {
                    Engine.RunListenServer();
                }, 5000);
            }
        });
        
        Engine.RunListenServer();
    };
    
    Engine.RunListenServer = function ()
    {
        Engine.port = Engine.port >>> 0;
        if(!Engine.port)
        {
            Engine.port = global.STANDART_PORT_NUMBER;
            if(!Engine.port)
                Engine.port = 30000;
        }
        
        var LISTEN_IP;
        if(global.IP_VERSION === 6)
            LISTEN_IP = "::";
        else
            LISTEN_IP = "0.0.0.0";
        Engine.ToDebug("Prepare to run TCP server on " + LISTEN_IP + ":" + Engine.port);
        Engine.Server.listen(Engine.port, LISTEN_IP, function ()
        {
            var AddObj = Engine.Server.address();
            Engine.ToLog("Run JINN TCP server on " + AddObj.family + " " + AddObj.address + ":" + AddObj.port);
        });
    };
    
    Engine.SetEventsOnError = function (SOCKET,Child)
    {
        SOCKET.on('error', function (err)
        {
            if(Child)
                Engine.AddCheckErrCount(Child, 1, "ERRORS:" + err, 1);
            
            ToError("NET_ERROR:" + err, 4);
        });
    };
    
    Engine.SetEventsProcessing = function (SOCKET,Child,StrConnect,bAll)
    {
        if(bAll && !Engine.LinkSocketToChild(SOCKET, Child, StrConnect))
            return;
        
        SOCKET.on('close', function (err)
        {
            Engine.ClearSocket(SOCKET, Child);
        });
        
        SOCKET.on('end', function ()
        {
            if(Child.LogNetBuf && Child.AddrItem)
                Engine.GetLogNetBuf(Child);
        });
        
        if(!bAll)
            return;
        SOCKET.on('data', function (data)
        {
            if(global.StopNetwork)
                return;
            if(SOCKET.WasClose)
            {
                return;
            }
            else
                if(SOCKET.WasChild)
                {
                    var StatusNum = Engine.GetSocketStatus(Child);
                    if(StatusNum === 100)
                    {
                        Engine.ReceiveFromNetwork(Child, data);
                    }
                    else
                    {
                        Child.ToLog("SOCKET on data: Error GetSocketStatus=" + StatusNum, 4);
                    }
                }
        });
    };
    
    Engine.CloseSocket = function (Socket,Child,StrError,bSilently)
    {
        if(!Socket || Socket.WasClose)
            return;
        
        if(!bSilently && Socket.remoteAddress)
        {
            var Name;
            if(Child)
                Name = ChildName(Child);
            else
                Name = Socket.remoteAddress + ":" + Socket.remotePort;
            var Str = "CloseSocket: " + Name + " " + StrError;
            Engine.ToLog(Str, 4);
            if(Child)
                Engine.ToLogNet(Child, Str);
        }
        Engine.ClearSocket(Socket, Child);
        Socket.end();
    };
    
    Engine.ClearSocket = function (Socket,Child)
    {
        
        if(Child)
        {
            Child.Socket = undefined;
            Engine.OnDeleteConnect(Child, "ClearSocket");
        }
        
        Socket.WasClose = 1;
        SetSocketStatus(Socket, 0);
        Socket.WasChild = 0;
    };
    
    Engine.LinkSocketToChild = function (Socket,Child,ConnectType)
    {
        if(Socket.WasChild)
        {
            ToLogTrace("Error LinkSocketToChild was Linked - " + ChildName(Child), 4);
            return 0;
        }
        
        Child.ConnectType = ConnectType;
        Socket.WasChild = 1;
        Child.Socket = Socket;
        if(ConnectType === "Server")
            Child.DirectIP = 1;
        SetSocketStatus(Socket, 100);
        return 1;
    };
    
    Engine.OnDeleteConnectNext = function (Child,StrError)
    {
        if(Child.Socket)
            Engine.CloseSocket(Child.Socket, Child, StrError);
    };
}

function InitAfter(Engine)
{
    
    Engine.CreateConnectionToChild = function (Child,F)
    {
        if(global.StopNetwork)
            return;
        
        var State = Engine.GetSocketStatus(Child);
        if(State === 100)
        {
            F(1);
        }
        else
        {
            if(State === 0)
            {
                Child.Socket = net.createConnection(Child.port, Child.ip, function ()
                {
                    
                    if(Child.Socket)
                    {
                        Engine.SetEventsOnError(Child.Socket, Child);
                        Engine.SetEventsProcessing(Child.Socket, Child, "Server", 1);
                    }
                    F(!!Child.Socket);
                    return;
                });
                Engine.SetEventsOnError(Child.Socket, Child);
                SetSocketStatus(Child.Socket, 1);
                Engine.SetEventsProcessing(Child.Socket, Child, "Server", 0);
            }
            else
            {
                F(0);
            }
        }
    };
    
    Engine.CloseConnectionToChild = function (Child,StrError)
    {
        if(Child.Close)
        {
            Child.ToError("Socket was closed", "t");
            return;
        }
        if(!Child.IsOpen())
        {
            Child.ToError("Socket not was opened", "t");
            return;
        }
        
        if(Child.Socket)
            Child.ToLog("CloseSocket: " + Child.Socket.remoteAddress + ":" + Child.Socket.remotePort + " " + StrError, 5);
        else
            Child.ToLog(StrError, 4);
        
        Engine.CloseSocket(Child.Socket, Child, "", 1);
    };
    
    Engine.SENDTONETWORK = function (Child,Data)
    {
        if(global.StopNetwork)
            return;
        
        var State = Engine.GetSocketStatus(Child);
        if(State === 100)
        {
            Child.Socket.write(Buffer.from(Data));
        }
        else
        {
        }
    };
    
    Engine.GetSocketStatus = function (Child)
    {
        if(!Child)
            return 0;
        
        var Socket = Child.Socket;
        if(Socket && Socket.SocketStatus)
        {
            if(Socket.SocketStatus !== 100)
            {
                var Delta = Date.now() - Socket.TimeStatus;
                if(Delta > JINN_CONST.MAX_WAIT_PERIOD_FOR_STATUS)
                {
                    return 0;
                }
            }
            return Socket.SocketStatus;
        }
        else
        {
            return 0;
        }
    };
    if(global.CLIENT_MODE)
        return;
    
    Engine.CreateServer();
}

function SetSocketStatus(Socket,Status)
{
    if(Socket && Socket.SocketStatus !== Status)
    {
        
        Socket.SocketStatus = Status;
        Socket.TimeStatus = Date.now();
    }
}

