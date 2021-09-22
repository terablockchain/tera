/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


"use strict";





global.GlobalRunID = 0;
global.GlobalRunMap = {};

var LastAlive = Date.now();
setTimeout(function ()
{
    setInterval(CheckAlive, 1000);
}
, 20000);

if(process.send)
{
    process.send({cmd:"online", message:"OK"}, function ()
    {
    });
    setInterval(function ()
    {
        process.send({cmd:"Alive"}, function ()
        {
        });
    }, 1000);
}

function CheckAlive()
{
    if(global.NOALIVE)
        return;
    
    var Delta = Date.now() - LastAlive;
    if(Delta > CHECK_STOP_CHILD_PROCESS)
    {
        ToLog("ALIVE TIMEOUT. Stop and exit: " + Delta + "/" + global.CHECK_STOP_CHILD_PROCESS);
        Exit();
        return;
    }
}

process.on('message', function (msg)
{
    
    LastAlive = Date.now();
    switch(msg.cmd)
    {
        case "Alive":
            //ToLog("Got alive: "+FIRST_TIME_BLOCK);
            global.FIRST_TIME_BLOCK=msg.FIRST_TIME_BLOCK;
            global.DELTA_CURRENT_TIME = msg.DELTA_CURRENT_TIME;
            break;
        case "Exit":
            Exit();
            break;
            
        case "call":
            var Err = 0, Stack;
            var Ret;
            try
            {

                if(typeof msg.Params === "object" && msg.Params.F)//возврат через обратный вызов
                {
                    global[msg.Name](msg.Params, function (Err,Ret)
                    {
                        process.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
                    });
                    break;
                }
                else
                {
                    Ret = global[msg.Name](msg.Params);
                }

            }
            catch(e)
            {
                Err = 1;
                Ret = "" + e;
                Stack = e.stack;
            }
            
            if(msg.id)
            {
                if(Err)
                    Ret += "\n" + Stack;
                process.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
            }
            else
                if(Err)
                {
                    ToLogStack(Ret, "\n" + Stack, 1);
                }
            break;
            
        case "retcall":
            var F = GlobalRunMap[msg.id];
            if(F)
            {
                delete GlobalRunMap[msg.id];
                F(msg.Err, msg.Params);
            }
            break;
            
        case "ToLogClient":
            {
                ToLogClient0(msg.Str, msg.StrKey, msg.bFinal);
                break;
            }
            
        case "UpdateConst":
            {
                LOAD_CONST();
                break;
            }
    }
}
);

global.Exit = function ()
{
    if(global.OnExit)
        global.OnExit();
    
    process.exit(0);
}



process.RunRPC = function (Name,Params,F)
{
    if(F)
    {
        GlobalRunID++;
        
        try
        {
            GlobalRunMap[GlobalRunID] = F;
            process.send({cmd:"call", id:GlobalRunID, Name:Name, Params:Params});
        }
        catch(e)
        {
            delete GlobalRunMap[GlobalRunID];
        }
    }
    else
    {
        process.send({cmd:"call", id:0, Name:Name, Params:Params});
    }
};

global.EvalCode = function (Code)
{
    return eval(Code);
};


global.WasEnterChildProcessErr = 0;

process.on('uncaughtException', function (err)
{
    var stack = err.stack;
    if(!stack)
        stack = "" + err;
    if(global.WasEnterChildProcessErr)
    {
        console.log("===============WasEnterChildProcessErr===============");
        console.log(stack);
        Exit();
        return;
    }
    global.WasEnterChildProcessErr = 1;
    
    console.log("===============child uncaughtException===============");
    
    ToLog(stack);
    ToError(stack);
    
    TO_ERROR_LOG(global.PROCESS_NAME, 777, err);
    ToLog("-----------------" + global.PROCESS_NAME + " EXIT------------------");
    process.exit();
    global.WasEnterChildProcessErr = 0;
}
);

global.WasEnterChildProcessErr2 = 0;
process.on('error', function (err)
{
    var stack = err.stack;
    if(!stack)
        stack = "" + err;
    
    if(err.code === 'ERR_IPC_CHANNEL_CLOSED')
    {
        console.log("===============ERR_IPC_CHANNEL_CLOSED===============");
        console.log(stack);
        Exit();
        return;
    }
    
    if(global.WasEnterChildProcessErr2)
    {
        console.log("===============child WasEnterChildProcessErr2===============");
        console.log(stack);
        Exit();
        return;
    }
    global.WasEnterChildProcessErr2 = 1;
    
    console.log("===============code: " + err.code + "===============");
    
    ToLog(stack);
    ToError(global.PROCESS_NAME + ":\n" + stack);
    global.WasEnterChildProcessErr2 = 0;
}
);

process.on('unhandledRejection', function (reason,p)
{
    console.log("===============child unhandledRejection===============");
    ToLog('Unhandled Rejection at:' + p + 'reason:' + reason);
    ToError('Unhandled Rejection at:' + p + 'reason:' + reason);
}
);
