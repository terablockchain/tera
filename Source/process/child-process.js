/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/




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
    setInterval(function ()
    {
        process.send({cmd:"Alive"});
    }, 1000);
    process.send({cmd:"online", message:"OK"});
    
    setInterval(function ()
    {
        process.send({cmd:"Alive"});
    }, 1000);
    
    global.ToLogClient = function (Str,StrKey,bFinal)
    {
        if(typeof Str === "string")
            process.send({cmd:"ToLogClient", Str:"" + Str, StrKey:StrKey, bFinal:bFinal});
    };
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
            DELTA_CURRENT_TIME = msg.DELTA_CURRENT_TIME;
            break;
        case "Exit":
            Exit();
            break;
            
        case "call":
            var Err = 0;
            var Ret;
            try
            {
                Ret = global[msg.Name](msg.Params);
            }
            catch(e)
            {
                Err = 1;
                Ret = "" + e;
            }
            
            if(msg.id)
                process.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
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
            
        case "Eval":
            EvalCode(msg.Code);
            break;
            
        case "UpdateConst":
            {
                LOAD_CONST();
                break;
            }
    }
}
);

function Exit()
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
            process.send({cmd:"call", id:GlobalRunID, Name:Name, Params:Params});
            GlobalRunMap[GlobalRunID] = F;
        }
        catch(e)
        {
        }
    }
    else
    {
        process.send({cmd:"call", id:0, Name:Name, Params:Params});
    }
}

global.EvalCode = function (Code)
{
    var Result;
    try
    {
        var ret = eval(Code);
        Result = JSON.stringify(ret, "", 4);
    }
    catch(e)
    {
        Result = "" + e;
    }
    return Result;
}


process.on('uncaughtException', function (err)
{
    ToError(err.stack);
    ToLog(err.stack);
    TO_ERROR_LOG(global.PROCESS_NAME, 777, err);
    ToLog("-----------------" + global.PROCESS_NAME + " EXIT------------------");
    process.exit();
}
);

process.on('error', function (err)
{
    ToError(global.PROCESS_NAME + ":\n" + err.stack);
    ToLog(err.stack);
}
);
