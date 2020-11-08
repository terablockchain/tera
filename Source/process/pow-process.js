/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


global.PROCESS_NAME = "POW";
global.POWPROCESS = 1;

require("../core/library");
require("../core/crypto-library");
require("../core/terahashmining");

var PROCESS = process;
if(process.send && !global.DEBUGPROCESS)
{
    process.send({cmd:"online", message:"OK"});
}
else
{
    PROCESS = global.DEBUGPROCESS;
}

var LastAlive = Date.now();
setInterval(CheckAlive, 3000);

var StartModuleTime = Date.now();

PROCESS.on('message', function (msg)
{
    LastAlive = Date.now();
    
    if(msg.cmd === "FastCalcBlock")
    {
        var FastBlock = msg;
        StartHashPump(FastBlock);
        
        FastBlock.RunCount = 0;
        try
        {
            var Result = FindMiningPOW(FastBlock);
            if(Result === 1)
                process.send({cmd:"POW", BlockNum:FastBlock.BlockNum, SeqHash:FastBlock.SeqHash, Hash:FastBlock.Hash, PowHash:FastBlock.PowHash,
                    AddrHash:FastBlock.AddrHash, Num:FastBlock.Num, TotalCount:BlockPump.TotalCount, PrevHash:FastBlock.PrevHash, Meta:FastBlock.Meta,
                });
        }
        catch(e)
        {
            ToError(e);
        }
    }
    else
        if(msg.cmd === "Alive")
        {
        }
        else
            if(msg.cmd === "Exit")
            {
                PROCESS.exit(0);
            }
}
);

function CheckAlive()
{
    if(global.NOALIVE)
        return;
    
    var Delta = Date.now() - LastAlive;
    if(Math.abs(Delta) > CHECK_STOP_CHILD_PROCESS)
    {
        PROCESS.exit(0);
        return;
    }
}

global.BlockPump = {BlockNum:0, RunCount:0, MinerID:0, Percent:0, LastNonce:0, TotalCount:0, };

var idIntervalPump = undefined;
function StartHashPump(SetBlock)
{
    if(BlockPump.BlockNum < SetBlock.BlockNum || BlockPump.MinerID !== SetBlock.MinerID || BlockPump.Percent !== SetBlock.Percent || BlockPump.RunCount !== SetBlock.RunCount)
    {
        if(BlockPump.BlockNum !== SetBlock.BlockNum)
            BlockPump.LastNonce = 0;
        
        BlockPump.BlockNum = SetBlock.BlockNum;
        BlockPump.RunCount = SetBlock.RunCount;
        BlockPump.MinerID = SetBlock.MinerID;
        BlockPump.Percent = SetBlock.Percent;
    }
    
    if(!idIntervalPump)
    {
        idIntervalPump = setInterval(PumpHash, global.POWRunPeriod);
    }
}

var StateWork = 0;
var StartTime = 0;

function PumpHash()
{
    var CurTime = Date.now();
    var DeltaMustWork = BlockPump.Percent / 100;
    var DeltaMust = 0;
    if(StateWork)
        DeltaMust = DeltaMustWork;
    else
        DeltaMust = 1 - DeltaMustWork;
    
    var Delta = CurTime - StartTime;
    
    if(Delta >= DeltaMust * CONSENSUS_PERIOD_TIME)
    {
        StateWork = 1 - StateWork;
        StartTime = CurTime;
    }
    
    if(StateWork)
    {
        DoPumpMemoryHash(BlockPump);
    }
}
