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
    
    global.SERVER = {};
    SERVER.CheckOnStartComplete = 1;
    SERVER.BlockNumDBMin = 0;
    Object.defineProperty(SERVER, "BlockNumDB", {set:function (x)
        {
        }, get:function (x)
        {
            return Engine.GetMaxNumBlockDB();
        }, });
    
    function GetBlockNumTx(arr)
    {
        
        var BlockNum = GetCurrentBlockNumByTime(0);
        if(arr[0] === TYPE_TRANSACTION_CREATE && JINN_CONST.BLOCK_CREATE_INTERVAL > 1)
        {
            var BlockNum2 = Math.floor(BlockNum / JINN_CONST.BLOCK_CREATE_INTERVAL) * JINN_CONST.BLOCK_CREATE_INTERVAL;
            if(BlockNum2 < BlockNum)
                BlockNum2 = BlockNum2 + JINN_CONST.BLOCK_CREATE_INTERVAL;
            BlockNum = BlockNum2;
        }
        
        return BlockNum;
    };
    
    SERVER.AddTransactionInner = function (Tx0)
    {
        Engine.OnAddTransactionInner(Tx0);
        
        if(!global.USE_MINING && !SERVER.GetHotNodesCount())
            return TX_RESULT_NOCONNECT;
        var Body = Tx0.body;
        var BlockNum = GetBlockNumTx(Body);
        
        var Tx = Engine.GetTx(Body, BlockNum, undefined, 6);
        
        if(JINN_CONST.TX_CHECK_OPERATION_ID)
        {
            Engine.DoCheckTxOperationID(Tx, BlockNum);
            if(Tx.ErrOperationID)
                return TX_RESULT_OPERATION_ID;
        }
        
        if(JINN_CONST.TX_CHECK_SIGN_ON_ADD)
        {
            Engine.DoCheckTxSign(Tx, BlockNum);
            if(Tx.ErrSign)
                return TX_RESULT_SIGN;
        }
        
        if(!Engine.IsValidateTx(Tx, "ERROR SERVER.AddTransaction", BlockNum))
            return TX_RESULT_BAD_TYPE;
        
        Tx0._TxID = GetStrTxIDFromHash(Tx.HASH, BlockNum);
        Tx0._BlockNum = BlockNum;
        
        var Ret;
        var TxArr = [Tx];
        var CountSend = Engine.AddCurrentProcessingTx(BlockNum, TxArr);
        if(CountSend === 1)
            Ret = 1;
        else
            Ret = TX_RESULT_WAS_SEND;
        
        return Ret;
    };
    
    SERVER.CheckCreateTransactionObject = function (Tr,SetTxID,BlockNum)
    {
        var Body = Tr.body;
        Tr.IsTx = 1;
        if(SetTxID)
            Tr.TxID = GetHexFromArr(GetTxID(BlockNum, Body));
        Tr.power = 0;
        Tr.TimePow = 0;
    };
    
    SERVER.ClearDataBase = function ()
    {
        
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ClearDataBase", {});
        
        Engine.ClearDataBase();
    };
    
    SERVER.WriteBlockDB = function (Block)
    {
        Engine.ConvertFromTera(Block, 1);
        return Engine.SaveToDB(Block);
    };
    SERVER.WriteBlockHeaderDB = function (Block,bPreSave)
    {
        Engine.ConvertFromTera(Block);
        return Engine.SaveToDB(Block);
    };
    
    SERVER.ReadBlockDB = function (BlockNum,ChainMode)
    {
        var Block = SERVER.ReadBlockHeaderDB(BlockNum, ChainMode);
        Engine.CheckLoadBody(Block);
        
        Engine.ConvertToTera(Block, 1);
        return Block;
    };
    
    SERVER.CheckLoadBody = function (Block)
    {
        Engine.CheckLoadBody(Block);
        Engine.ConvertToTera(Block, 1);
    };
    
    SERVER.ReadBlockHeaderDB = function (BlockNum,ChainMode)
    {
        var Block;
        if(ChainMode)
        {
            var ArrChain = Engine.DB.GetChainArrByNum(BlockNum);
            Block = ArrChain[ChainMode - 1];
        }
        else
        {
            Block = Engine.GetBlockHeaderDB(BlockNum);
        }
        
        Engine.ConvertToTera(Block, 0);
        return Block;
    };
    
    SERVER.TruncateBlockDB = function (LastNum)
    {
        var MaxNum = Engine.GetMaxNumBlockDB();
        var Result = Engine.TruncateChain(LastNum);
        
        var MaxNum2 = Engine.GetMaxNumBlockDB();
        REWRITE_DAPP_TRANSACTIONS(MaxNum - MaxNum2);
        
        return Result;
    };
    
    SERVER.GetMaxNumBlockDB = function ()
    {
        return Engine.GetMaxNumBlockDB();
    };
    
    function ErrorAPICall()
    {
        ToLogTrace("Error API call");
        return 0;
    };
    
    function ErrorTODO()
    {
        ToLogTrace("TODO");
        return 0;
    };
    
    SERVER.WriteBlockDBFinaly = ErrorAPICall;
    SERVER.WriteBodyDB = ErrorAPICall;
    
    SERVER.WriteBodyResultDB = ErrorTODO;
    
    SERVER.CreateGenesisBlocks = function ()
    {
    };
    SERVER.CheckStartedBlocks = function ()
    {
        var CurNumTime = GetCurrentBlockNumByTime();
        if(SERVER.BlockNumDB > CurNumTime)
        {
            SERVER.TruncateBlockDB(CurNumTime);
        }
        var BlockNum = SERVER.CheckBlocksOnStartReverse(SERVER.BlockNumDB);
        BlockNum = BlockNum - 5000;
        if(BlockNum < 0)
            BlockNum = 0;
        ToLog("CheckStartedBlocks at " + BlockNum);
        BlockNum = SERVER.CheckBlocksOnStartFoward(BlockNum, 1, 0);
        BlockNum = SERVER.CheckBlocksOnStartFoward(BlockNum - 100, 1, 1);
        
        if(BlockNum < SERVER.BlockNumDB)
        {
            BlockNum--;
            ToLog("******************************** SET NEW BlockNumDB = " + BlockNum + "/" + SERVER.BlockNumDB);
            
            if(0 && global.DEV_MODE)
            {
                StopAndExit("SET NEW BlockNumDB");
            }
            
            SERVER.TruncateBlockDB(BlockNum);
        }
        global.glStartStat = 1;
    };
    
    SERVER.GetLinkHash = ErrorAPICall;
    SERVER.GetLinkHashDB = ErrorAPICall;
    
    SERVER.RewriteAllTransactions = function ()
    {
        if(global.TX_PROCESS.Worker)
        {
            if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            {
                global.TX_PROCESS.RunRPC("RewriteAllTransactions", {});
                return 1;
            }
        }
        
        SERVER.RefreshAllDB();
        
        return 0;
    };
    SERVER.GetRows = function (start,count,Filter,bMinerName,ChainMode)
    {
        if(Filter)
        {
            Filter = Filter.trim();
            Filter = Filter.toUpperCase();
        }
        
        var MaxAccount = ACCOUNTS.GetMaxAccount();
        var WasError = 0;
        var arr = [];
        
        for(var num = start; true; num++)
        {
            var Block = SERVER.ReadBlockHeaderDB(num, ChainMode);
            if(!Block)
                break;
            
            Block.Num = Block.BlockNum;
            if(Block.AddrHash)
            {
                Block.Miner = ReadUintFromArr(Block.AddrHash, 0);
                if(Block.BlockNum < 16 || (Block.Miner > MaxAccount && Block.BlockNum < global.UPDATE_CODE_5))
                    Block.Miner = 0;
                if(bMinerName)
                {
                    Block.MinerName = "";
                    
                    if(Block.BlockNum >= global.UPDATE_CODE_5 && Block.Miner >= 1e9)
                    {
                        var CurMiner = ACCOUNTS.GetIDByAMID(Block.Miner);
                        if(CurMiner)
                            Block.Miner = CurMiner;
                    }
                    
                    if(Block.Miner)
                    {
                        var Item = ACCOUNTS.ReadState(Block.Miner);
                        if(Item && Item.Name && typeof Item.Name === "string")
                            Block.MinerName = Item.Name.substr(0, 8);
                    }
                }
                
                var Value = GetHashFromSeqAddr(Block.SeqHash, Block.AddrHash, Block.BlockNum, Block.PrevHash);
                Block.Hash1 = Value.Hash1;
                Block.Hash2 = Value.Hash2;
            }
            
            if(Filter)
            {
                var Num = Block.BlockNum;
                var Count = Block.TrDataLen;
                var Pow = Block.Power;
                var Miner = Block.Miner;
                var Date = DateFromBlock(Block.BlockNum);
                try
                {
                    if(!eval(Filter))
                        continue;
                }
                catch(e)
                {
                    if(!WasError)
                        ToLog(e);
                    WasError = 1;
                }
            }
            
            arr.push(Block);
            count--;
            if(count < 1)
                break;
        }
        return arr;
    };
    
    SERVER.GetTrRows = function (BlockNum,start,count,ChainMode,FilterTxId)
    {
        var arr = [];
        var Block = SERVER.ReadBlockDB(BlockNum, ChainMode);
        
        if(typeof FilterTxId === "string" && FilterTxId.length >= TX_ID_HASH_LENGTH * 2)
            FilterTxId = FilterTxId.substr(0, TX_ID_HASH_LENGTH * 2);
        
        if(Block && Block.arrContent)
        {
            for(var num = start; num < start + count; num++)
            {
                if(num < 0)
                    continue;
                if(num >= Block.arrContent.length)
                    break;
                
                var Tr = {body:Block.arrContent[num]};
                SERVER.CheckCreateTransactionObject(Tr, 1, BlockNum);
                if(typeof FilterTxId === "string" && FilterTxId.length === TX_ID_HASH_LENGTH * 2 && Tr.TxID.substr(0, TX_ID_HASH_LENGTH * 2) !== FilterTxId)
                    continue;
                
                Tr.Num = num;
                Tr.Type = Tr.body[0];
                Tr.Length = Tr.body.length;
                Tr.Body = [];
                for(var j = 0; j < Tr.body.length; j++)
                    Tr.Body[j] = Tr.body[j];
                
                var App = DAppByType[Tr.Type];
                if(App)
                {
                    Tr.Script = App.GetScriptTransaction(Tr.body, BlockNum, Tr.Num);
                    Tr.Verify = GetVerifyTransaction(Block, Tr.Num);
                    
                    if(Tr.Verify > 0)
                    {
                        Tr.VerifyHTML = "<B style='color:green'>✔</B>";
                        if(Tr.Verify > 1)
                        {
                            Tr.VerifyHTML += "(" + Tr.Verify + ")";
                        }
                    }
                    else
                        if(Tr.Verify === 0)
                            Tr.VerifyHTML = "<B style='color:red'>✘</B>";
                        else
                            Tr.VerifyHTML = "";
                }
                else
                {
                    Tr.Script = "";
                    Tr.VerifyHTML = "";
                }
                
                arr.push(Tr);
            }
        }
        return arr;
    };
    SERVER.ClearStat = function ()
    {
        var MAX_ARR_PERIOD = MAX_STAT_PERIOD * 2 + 10;
        
        SERVER.StatMap = {StartPos:0, StartBlockNum:0, Length:0, "ArrPower":new Float64Array(MAX_ARR_PERIOD), "ArrPowerMy":new Float64Array(MAX_ARR_PERIOD),
        };
    };
    SERVER.TruncateStat = function (LastBlockNum)
    {
        if(SERVER.StatMap)
        {
            var LastNumStat = SERVER.StatMap.StartBlockNum + SERVER.StatMap.Length;
            var Delta = LastNumStat - LastBlockNum;
            if(Delta > 0)
            {
                SERVER.StatMap.Length -= Delta;
                if(SERVER.StatMap.Length < 0)
                    SERVER.StatMap.Length = 0;
            }
            SERVER.StatMap.CaclBlockNum = 0;
        }
    };
    
    SERVER.GetStatBlockchainPeriod = function (Param)
    {
        var StartNum = Param.BlockNum;
        if(!Param.Count || Param.Count < 0)
            Param.Count = 1000;
        if(!Param.Miner)
            Param.Miner = 0;
        
        var Map = {};
        var ArrList = new Array(Param.Count);
        var i = 0;
        for(var num = StartNum; num < StartNum + Param.Count; num++)
        {
            var Power = 0, PowerMy = 0, Nonce = 0;
            if(num <= SERVER.BlockNumDB)
            {
                var Block = SERVER.ReadBlockHeaderDB(num);
                if(Block)
                {
                    Power = GetPowPower(Block.PowHash);
                    var Miner = ReadUintFromArr(Block.AddrHash, 0);
                    var Nonce = ReadUintFromArr(Block.AddrHash, 6);
                    if(Param.Miner < 0)
                    {
                        PowerMy = Power;
                    }
                    else
                        if(Miner === Param.Miner)
                        {
                            PowerMy = Power;
                        }
                }
            }
            
            ArrList[i] = PowerMy;
            
            i++;
        }
        var AvgValue = 0;
        for(var j = 0; j < ArrList.length; j++)
        {
            if(ArrList[j])
                AvgValue += ArrList[j];
        }
        if(ArrList.length > 0)
            AvgValue = AvgValue / ArrList.length;
        
        const MaxSizeArr = 1000;
        var StepTime = 1;
        while(ArrList.length >= MaxSizeArr)
        {
            if(Param.bNonce)
                ArrList = ResizeArrMax(ArrList);
            else
                ArrList = ResizeArrAvg(ArrList);
            StepTime = StepTime * 2;
        }
        
        return {ArrList:ArrList, AvgValue:AvgValue, steptime:StepTime};
    };
    
    SERVER.GetStatBlockchain = function (name,MinLength)
    {
        
        if(!MinLength)
            return [];
        
        var MAX_ARR_PERIOD = MAX_STAT_PERIOD * 2 + 10;
        
        if(!SERVER.StatMap)
        {
            SERVER.ClearStat();
        }
        
        var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
        
        if(SERVER.StatMap.CaclBlockNum !== MaxNumBlockDB || SERVER.StatMap.CalcMinLength !== MinLength)
        {
            SERVER.StatMap.CaclBlockNum = MaxNumBlockDB;
            SERVER.StatMap.CalcMinLength = MinLength;
            var start = MaxNumBlockDB - MinLength + 1;
            var finish = MaxNumBlockDB + 1;
            
            var StartPos = SERVER.StatMap.StartPos;
            var ArrPower = SERVER.StatMap.ArrPower;
            var ArrPowerMy = SERVER.StatMap.ArrPowerMy;
            var StartNumStat = SERVER.StatMap.StartBlockNum;
            var FinishNumStat = SERVER.StatMap.StartBlockNum + SERVER.StatMap.Length - 1;
            
            var CountReadDB = 0;
            var arr = new Array(MinLength);
            var arrmy = new Array(MinLength);
            for(var num = start; num < finish; num++)
            {
                var i = num - start;
                var i2 = (StartPos + i) % MAX_ARR_PERIOD;
                if(num >= StartNumStat && num <= FinishNumStat && (num < finish - 10))
                {
                    arr[i] = ArrPower[i2];
                    arrmy[i] = ArrPowerMy[i2];
                }
                else
                {
                    CountReadDB++;
                    var Power = 0, PowerMy = 0;
                    if(num <= MaxNumBlockDB)
                    {
                        var Block = SERVER.ReadBlockHeaderDB(num);
                        if(Block)
                        {
                            Power = GetPowPower(Block.PowHash);
                            var Miner = ReadUintFromArr(Block.AddrHash, 0);
                            if(Miner === GetMiningAccount())
                            {
                                PowerMy = Power;
                            }
                        }
                    }
                    arr[i] = Power;
                    arrmy[i] = PowerMy;
                    
                    ArrPower[i2] = arr[i];
                    ArrPowerMy[i2] = arrmy[i];
                    
                    if(num > FinishNumStat)
                    {
                        SERVER.StatMap.StartBlockNum = num - SERVER.StatMap.Length;
                        SERVER.StatMap.Length++;
                        if(SERVER.StatMap.Length > MAX_ARR_PERIOD)
                        {
                            SERVER.StatMap.Length = MAX_ARR_PERIOD;
                            SERVER.StatMap.StartBlockNum++;
                            SERVER.StatMap.StartPos++;
                        }
                    }
                }
            }
            
            SERVER.StatMap["POWER_BLOCKCHAIN"] = arr;
            SERVER.StatMap["POWER_MY_WIN"] = arrmy;
        }
        
        var arr = SERVER.StatMap[name];
        if(!arr)
            arr = [];
        var arrT = SERVER.StatMap["POWER_BLOCKCHAIN"];
        for(var i = 0; i < arrT.length; i++)
            if(!arrT[i])
            {
                SERVER.StatMap = undefined;
                break;
            }
        
        return arr;
    };
    
    SERVER.CheckBlocksOnStartReverse = function (StartNum)
    {
        var delta = 1;
        var Count = 0;
        var PrevBlock;
        for(var num = StartNum; num >= SERVER.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2; num -= delta)
        {
            var Block = SERVER.ReadBlockHeaderDB(num);
            if(!Block || IsZeroArr(Block.SumHash))
            {
                delta++;
                Count = 0;
                continue;
            }
            var PrevBlock = SERVER.ReadBlockHeaderDB(num - 1);
            if(!PrevBlock || IsZeroArr(PrevBlock.SumHash))
            {
                Count = 0;
                continue;
            }
            
            var SumHash = CalcSumHash(PrevBlock.SumHash, Block.Hash, Block.BlockNum, Block.SumPow);
            if(CompareArr(SumHash, Block.SumHash) === 0)
            {
                delta = 1;
                Count++;
                if(Count > 100)
                    return num;
            }
            else
            {
                delta++;
                Count = 0;
            }
        }
        return 0;
    };
    
    SERVER.CheckBlocksOnStartFoward = function (StartNum,bCheckHash,bCheckBody)
    {
        var PrevBlock;
        if(StartNum < SERVER.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2 - 1)
            StartNum = SERVER.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2 - 1;
        
        var MaxNum = SERVER.GetMaxNumBlockDB();
        var BlockNumTime = GetCurrentBlockNumByTime();
        if(BlockNumTime < MaxNum)
            MaxNum = BlockNumTime;
        
        for(var num = StartNum; num <= MaxNum; num++)
        {
            
            var Block;
            if(bCheckBody)
                Block = SERVER.ReadBlockDB(num);
            else
                Block = SERVER.ReadBlockHeaderDB(num);
            if(!Block)
                return num > 0 ? num - 1 : 0;
            if(num % 100000 === 0)
                ToLog("CheckBlocksOnStartFoward: " + num);
            
            if(bCheckBody)
            {
                var TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
                if(CompareArr(Block.TreeHash, TreeHash) !== 0)
                {
                    ToLog("BAD TreeHash block=" + Block.BlockNum);
                    return num > 0 ? num - 1 : 0;
                }
            }
            
            if(PrevBlock)
            {
                if(Block.BlockNum < global.UPDATE_CODE_JINN)
                    return num;
                
                if(Block.BlockNum > 16 && CompareArr(Block.PrevHash, PrevBlock.Hash) !== 0)
                {
                    ToLog("=================== FIND ERR PrevHash in " + Block.BlockNum + "  bCheckBody=" + bCheckBody + " WAS=" + GetHexFromArr(Block.PrevHash) + " NEED=" + GetHexFromArr(PrevBlock.Hash));
                    return num > 0 ? num - 1 : 0;
                }
                
                if(bCheckHash)
                {
                    var SeqHash = GetSeqHash(Block.BlockNum, Block.PrevHash, Block.TreeHash, PrevBlock.SumPow);
                    var Value = GetHashFromSeqAddr(SeqHash, Block.AddrHash, Block.BlockNum, Block.PrevHash);
                    if(CompareArr(Value.Hash, Block.Hash) !== 0)
                    {
                        ToLog("PrevHash=" + GetHexFromArr(Block.PrevHash));
                        ToLog("TreeHash=" + GetHexFromArr(Block.TreeHash));
                        ToLog("AddrHash=" + GetHexFromArr(Block.AddrHash));
                        ToLog("=================== FIND ERR Hash in " + Block.BlockNum + "  bCheckBody=" + bCheckBody + " WAS=" + GetHexFromArr(Block.Hash) + " NEED=" + GetHexFromArr(Value.Hash));
                        return num > 0 ? num - 1 : 0;
                    }
                    
                    var SumHash = CalcSumHash(PrevBlock.SumHash, Block.Hash, Block.BlockNum, Block.SumPow);
                    if(CompareArr(SumHash, Block.SumHash) !== 0)
                    {
                        ToLog("=================== FIND ERR SumHash in " + Block.BlockNum);
                        return num > 0 ? num - 1 : 0;
                    }
                }
            }
            PrevBlock = Block;
        }
        return num > 0 ? num - 1 : 0;
    };
    SERVER.GenesisBlockHeaderDB = function (Num)
    {
        if(Num < 0)
            return undefined;
        
        var Block = {BlockNum:Num, TreeHash:ZERO_ARR_32, PrevHash:ZERO_ARR_32, PrevSumHash:ZERO_ARR_32, SumHash:ZERO_ARR_32, TrCount:0,
            TrDataLen:0, };
        
        if(Block.BlockNum < global.UPDATE_CODE_JINN)
            Block.AddrHash = DEVELOP_PUB_KEY0;
        // rudiment from old code
        else
            Block.AddrHash = ZERO_ARR_32;
        
        Block.SeqHash = GetSeqHash(Block.BlockNum, Block.PrevHash, Block.TreeHash);
        
        Block.SumPow = 0;
        
        return Block;
    };
    SERVER.BlockChainToBuf = function (WriteNum,StartNum,EndBlockNum)
    {
        
        var Arr = [];
        for(var num = StartNum; num <= EndBlockNum; num++)
        {
            var Block = SERVER.ReadBlockHeaderDB(num);
            if(!Block)
                break;
            Arr.push(Block);
        }
        
        var ArrBuf = GetBufferFromBlockArr(Arr);
        return ArrBuf;
    };
    
    SERVER.ResetNextPingAllNode = function ()
    {
    };
    
    SERVER.StopServer = function ()
    {
        if(Engine.Server)
            Engine.Server.close();
    };
    
    SERVER.StopNode = function ()
    {
        global.StopNetwork = true;
    };
    
    SERVER.GetTXDelta = function ()
    {
        var BlockNum = GetCurrentBlockNumByTime();
        var BlockNumTX = COMMON_ACTS.GetLastBlockNumActWithReopen();
        return BlockNum - BlockNumTX;
    };
    
    SERVER.RefreshAllDB = function ()
    {
        if(global.PROCESS_NAME !== "TX")
        {
            if(global.COMMON_ACTS)
            {
                COMMON_ACTS.Close();
            }
        }
        
        if(global.PROCESS_NAME !== "MAIN")
        {
            Engine.Close();
        }
    };
}
