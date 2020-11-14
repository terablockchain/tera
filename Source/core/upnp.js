/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var natUpnp;

try
{
    natUpnp = require('nat-upnp');
}
catch(e)
{
}

if(global.LOCAL_RUN)
{
    global.StartPortMapping = function (ip,port,F)
    {
        F(ip);
    };
}
else
    if(natUpnp)
    {
        var ClientUPNP = natUpnp.createClient();
        global.StartPortMapping = StartUseUPNP;
    }
    else
    {
        global.StartPortMapping = StartUseStun;
    }

var PortMappingOK = 0;
function StartUseUPNP(ip,port,F)
{
    if(PortMappingOK === port)
        return;
    
    if(F)
        ToLog("USE UPNP");
    
    ClientUPNP.portMapping({public:port, private:port, ttl:0}, function (err,results)
    {
        if(!err)
        {
            PortMappingOK = port;
            ToLog("OK port mapping");
        }
        else
        {
            ToLog("----------- Cannt port mapping: " + port);
            StartUseStun(ip, port, F);
            return;
        }
        
        if(F)
            CheckMapping();
        
        if(ip)
        {
            if(F)
                F(ip);
            return;
        }
        
        ClientUPNP.externalIp(function (err,ip2)
        {
            if(err)
            {
                ToLog("***********Error get externalIp");
            }
            ToLog("UPNP INTERNET IP:" + ip2);
            if(F)
                F(ip2);
        });
    });
}

function StartUseStun(ip,port,F)
{
    ToLog("NOT USE UPNP");
    
    if(ip)
    {
        if(F)
            F(ip);
        return;
    }
    
    let Stun = require('stun');
    let server = Stun.createServer();
    const request = Stun.createMessage(Stun.constants.STUN_BINDING_REQUEST);
    
    server.on('error', function (err)
    {
        ToLog("Error work stun server #2");
        if(F)
            F();
    });
    server.once('bindingResponse', function (stunMsg)
    {
        var value = stunMsg.getAttribute(Stun.constants.STUN_ATTR_XOR_MAPPED_ADDRESS).value;
        var ip2 = value.address;
        ToLog("STUN INTERNET IP:" + ip2);
        
        if(server)
            server.close();
        
        if(F)
            F(ip2);
    });
    
    var StrStunAddr = 'stun.l.google.com';
    const dns = require('dns');
    dns.lookup(StrStunAddr, function (err,address,family)
    {
        if(!err)
            server.send(request, 19302, StrStunAddr);
        else
            ToLog("Error work stun server #1");
    });
}

function CheckMapping()
{
    
    ClientUPNP.getMappings({local:true}, function (err,arr)
    {
        var WasFind = 0;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var Item = arr[i];
                if(Item && Item.public && Item.public.port == SERVER.port)
                {
                    WasFind = 1;
                    break;
                }
            }
        }
        
        if(!WasFind)
        {
            ToLog("Start UPNP on port: " + SERVER.port);
            StartUseUPNP(SERVER.ip, SERVER.port);
        }
        
        setTimeout(CheckMapping, 600 * 1000);
    });
}
