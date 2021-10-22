/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

const fs = require('fs');
const os = require('os');
var StartCheckMining = 0;
global.MiningPaused = 0;
var ProcessMemorySize = 0;
global.ArrMiningWrk = [];
var BlockMining;

function AllAlive()
{
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        if(ArrMiningWrk[i])
            ArrMiningWrk[i].send({cmd:"Alive", DELTA_CURRENT_TIME:DELTA_CURRENT_TIME});
    }
}

function ClearArrMining()
{
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        if(ArrMiningWrk[i])
            ArrMiningWrk[i].send({cmd:"Exit"});
    }
    
    ArrMiningWrk = [];
}
function RunStopPOWProcess(Mode)
{
    
    if(!GetCountMiningCPU() || GetCountMiningCPU() <= 0)
        return;
    if(!StartCheckMining)
    {
        StartCheckMining = 1;
        setInterval(RunStopPOWProcess, CHECK_RUN_MINING);
        setInterval(AllAlive, 1000);
    }
    
    if(global.NeedRestart)
        return;
    
    if(global.USE_MINING && global.MINING_START_TIME && global.MINING_PERIOD_TIME)
    {
        var Time = GetCurrentTime();
        var TimeCur = Time.getUTCHours() * 3600 + Time.getUTCMinutes() * 60 + Time.getUTCSeconds();
        
        var StartTime = GetSecFromStrTime(global.MINING_START_TIME);
        var RunPeriod = GetSecFromStrTime(global.MINING_PERIOD_TIME);
        
        var TimeEnd = StartTime + RunPeriod;
        
        global.MiningPaused = 1;
        if(TimeCur >= StartTime && TimeCur <= TimeEnd)
        {
            global.MiningPaused = 0;
        }
        else
        {
            StartTime -= 24 * 3600;
            TimeEnd -= 24 * 3600;
            if(TimeCur >= StartTime && TimeCur <= TimeEnd)
            {
                global.MiningPaused = 0;
            }
        }
        
        if(ArrMiningWrk.length && global.MiningPaused)
        {
            ToLog("------------ MINING MUST STOP ON TIME");
            ClearArrMining();
            return;
        }
        else
            if(!ArrMiningWrk.length && !global.MiningPaused)
            {
                ToLog("*********** MINING MUST START ON TIME");
            }
            else
            {
                return;
            }
    }
    else
    {
        global.MiningPaused = 0;
    }
    
    if(!global.USE_MINING || Mode === "STOP")
    {
        ClearArrMining();
        return;
    }
    
    if(global.USE_MINING && ArrMiningWrk.length)
        return;
    
    if(!GetMiningAccount())
        return;
    
    var PathMiner = GetCodePath("../miner.js");
    if(!fs.existsSync(PathMiner))
        PathMiner = "./process/pow-process.js";
    
    if(ArrMiningWrk.length >= GetCountMiningCPU())
        return;
    
    var Memory;
    if(global.TEST_MINING)
    {
        Memory = 90 * 1e6 * global.GetCountMiningCPU();
    }
    else
    {
        if(global.SIZE_MINING_MEMORY)
            Memory =  + global.SIZE_MINING_MEMORY;
        else
        {
            Memory = os.freemem() - (800 + GetCountMiningCPU() * 80) * 1024 * 1014;
            if(Memory < 0)
            {
                ToLog("Not enough memory to start processes.");
                return;
            }
        }
    }
    
    ProcessMemorySize = Math.floor(Memory / GetCountMiningCPU());
    var StrProcessMemorySize = Math.floor(ProcessMemorySize / 1024 / 1024 * 1000) / 1000;
    ToLog("START MINER PROCESS COUNT: " + GetCountMiningCPU() + " Memory: " + StrProcessMemorySize + " Mb for each process");
    
    for(var R = 0; R < GetCountMiningCPU(); R++)
    {
        
        let Worker = RunFork(PathMiner);
        if(!Worker)
            continue;
        ArrMiningWrk.push(Worker);
        Worker.Num = ArrMiningWrk.length;
        
        Worker.on('message', function (msg)
        {
            if(msg.cmd === "log")
            {
                ToLog(msg.message);
            }
            else
            if(msg.cmd === "online")
            {
                Worker.bOnline = true;
                ToLog("RUNNING PROCESS:" + Worker.Num + ":" + msg.message);
            }
            else
            if(msg.cmd === "POW")
            {
                SERVER.MiningProcess(msg);
            }
            else
            if(msg.cmd === "HASHRATE")
            {
                ADD_HASH_RATE(msg.CountNonce);
            }
        });
        
        Worker.on('error', function (err)
        {
            if(!ArrMiningWrk.length)
                return;
            ToError('ERROR IN PROCESS: ' + err);
        });
        
        Worker.on('close', function (code)
        {
            ToLog("STOP PROCESS: " + Worker.Num + " pid:" + Worker.pid);
            for(var i = 0; i < ArrMiningWrk.length; i++)
            {
                if(ArrMiningWrk[i].pid === Worker.pid)
                {
                    ToLog("Delete wrk from arr - pid:" + Worker.pid);
                    ArrMiningWrk.splice(i, 1);
                }
            }
        });
    }
}

var GlSendMiningCount = 0;
function SetCalcPOW(Block,cmd)
{
    //RPC Mining support
    if(global.USE_API_MINING && global.WEB_PROCESS && global.WEB_PROCESS.Worker)
    {
        global.WEB_PROCESS.sendAll({cmd:"MiningBlock", Value:{BlockNum:Block.BlockNum, PrevHash:GetHexFromArr(Block.PrevHash),
                SeqHash:GetHexFromArr(Block.SeqHash), Hash:GetHexFromArr(Block.Hash), Time:Date.now(), }});
    }
    
    if(!global.USE_MINING)
        return;
    
    if(!Block.Hash)
        ToLogTrace("!Block.Hash on Block=" + Block.BlockNum);
    if(!Block.PrevHash)
        ToLogTrace("!Block.PrevHash on Block=" + Block.BlockNum);
    if(!Block.SeqHash)
        ToLogTrace("!Block.SeqHash on Block=" + Block.BlockNum);
    
    if(ArrMiningWrk.length !== GetCountMiningCPU())
        return;
    if(global.POW_MAX_PERCENT > 100)
        global.POW_MAX_PERCENT = 100;
    if(global.POW_MAX_PERCENT < 0)
        global.POW_MAX_PERCENT = 0;
    
    BlockMining = Block;
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        var CurWorker = ArrMiningWrk[i];
        if(!CurWorker.bOnline)
            continue;
        
        GlSendMiningCount++;
        
        CurWorker.send({id:GlSendMiningCount, cmd:cmd, BlockNum:Block.BlockNum, Account:GetMiningAccount(), MinerID:GetMiningAccount(),
            SeqHash:Block.SeqHash, Hash:Block.Hash, PrevHash:Block.PrevHash, Time:Date.now(), Num:CurWorker.Num, RunPeriod:global.POWRunPeriod,
            RunCount:global.POW_RUN_COUNT, Percent:global.POW_MAX_PERCENT, CountMiningCPU:GetCountMiningCPU(), ProcessMemorySize:ProcessMemorySize,
            LastNonce0:0, Meta:Block.Meta, });
    }
}

global.SetCalcPOW = SetCalcPOW;
global.RunStopPOWProcess = RunStopPOWProcess;
