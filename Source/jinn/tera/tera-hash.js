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
    Engine.GetTx = function (body,BlockNum,HASH,TestNum)
    {
        JINN_STAT["GetTx" + TestNum]++;
        
        var Tx = {};
        Tx.IsTx = 1;
        
        if(HASH)
            Tx.HASH = HASH;
        else
            if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
            {
                Tx.HASH = sha3(body, 8);
            }
            else
            {
                Tx.HASH = shaarr(body);
            }
        
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TT_TICKET_HASH_LENGTH);
        Tx.KEY = GetHexFromArr(Tx.HashTicket);
        Tx.body = body;
        
        return Tx;
    };
    
    Engine.GetGenesisBlockInner = function (BlockNum)
    {
        var Block = SERVER.GenesisBlockHeaderDB(BlockNum);
        Engine.ConvertFromTera(Block, 1, 1);
        Engine.CalcBlockData(Block);
        return Block;
    };
    
    Engine.CalcBlockHash = function (Block)
    {
        if(!Block.PrevSumHash)
            ToLogTrace("Error No PrevSumHash on Block=" + Block.BlockNum);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.LinkSumHash = ZERO_ARR_32;
        }
        else
        {
            Block.LinkSumHash = Block.PrevSumHash;
        }
        
        if(!Block.TreeHash)
            ToLogTrace("No TreeHash on block " + Block.BlockNum);
        
        Block.DataHash = Engine.CalcDataHashInner(Block);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.Hash = ZERO_ARR_32.slice();
            Block.Hash[0] = 1 + Block.BlockNum;
            Block.Hash[31] = Block.Hash[0];
            Block.PowHash = Block.Hash;
            
            Block.Power = GetPowPowerBlock(Block.BlockNum, Block.Hash);
            Block.OldPrevHash8 = ZERO_ARR_32;
        }
        else
        {
            Block.Hash = Engine.CalcBlockHashInner(Block);
        }
        
        if(!Block.PowHash)
            ToLogTrace("Not found Block.PowHash in " + Block.BlockNum);
        
        Block.SumPow = Block.PrevSumPow + Block.Power;
    };
    
    Engine.CalcDataHashInner = function (Block)
    {
        var PrevHash;
        if(Block.BlockNum < global.UPDATE_CODE_JINN)
        {
            if(Block.OldPrevHash8 === undefined)
            {
                ToLogTrace("Error No Block.OldPrevHash8 on Block=" + Block.BlockNum);
                return ZERO_ARR_32;
            }
            
            PrevHash = Block.OldPrevHash8;
        }
        else
            PrevHash = Block.LinkSumHash;
        
        if(Block.PrevSumPow === undefined)
            ToLogTrace("Error No Block.PrevSumPow on Block=" + Block.BlockNum);
        
        return CalcDataHash(Block.BlockNum, PrevHash, Block.TreeHash, Block.PrevSumPow);
    };
    
    Engine.CalcBlockHashInner = function (Block)
    {
        var PrevHash;
        if(Block.BlockNum < global.UPDATE_CODE_JINN)
            PrevHash = Block.OldPrevHash8;
        else
            PrevHash = Block.LinkSumHash;
        
        if(PrevHash === undefined)
        {
            ToLogTrace("Error No PrevHash on Block=" + Block.BlockNum);
            process.exit();
        }
        
        CalcBlockHashJinn(Block, Block.DataHash, Block.MinerHash, Block.BlockNum, PrevHash);
        return Block.Hash;
    };
    
    Engine.CalcSumHash = function (Block)
    {
        
        if(Block.BlockNum >= global.UPDATE_CODE_JINN)
        {
            Block.SumHash = CalcSumHash(Block.PrevSumHash, Block.Hash, Block.BlockNum, Block.SumPow);
            return;
        }
        if(Block.BlockNum === 0)
            Block.SumHash = ZERO_ARR_32;
        else
        {
            if(!Block.PrevSumHash)
                ToLogTrace("Error No Block.PrevSumHash on Block=" + Block.BlockNum);
            
            Block.SumHash = CalcSumHash(Block.PrevSumHash, Block.Hash, Block.BlockNum, Block.SumPow);
        }
    };
    Engine.CalcTreeHash = function (BlockNum,TxArr)
    {
        if(!TxArr || !TxArr.length)
            return ZERO_ARR_32;
        
        if(BlockNum < global.UPDATE_CODE_JINN)
            return CalcTreeHashFromArrBody(BlockNum, TxArr);
        else
            if(BlockNum < global.UPDATE_CODE_SHARDING)
                return Engine.CalcTreeHashInner(BlockNum, TxArr);
            else
                return Engine.CalcBaseSysTreeHash(BlockNum, TxArr);
    };
    
    Engine.CalcBaseSysTreeHash = function (BlockNum,TxArr,bSysHashOnly)
    {
        
        var Buf;
        var SysBuf = [];
        var BaseBuf = [];
        var DoBase = 0;
        for(var n = 0; TxArr && n < TxArr.length; n++)
        {
            var Tx = TxArr[n];
            
            if(!CheckTx("=CalcTreeHash=", Tx, BlockNum, 0))
            {
                return ZERO_ARR_32;
            }
            
            if(!DoBase && !Engine.IsVirtualTypeTx(Tx.body[0]))
            {
                DoBase = 1;
                if(bSysHashOnly)
                    break;
            }
            
            if(DoBase)
                Buf = BaseBuf;
            else
                Buf = SysBuf;
            
            var Hash = Tx.HASH;
            for(var h = 0; h < Hash.length; h++)
                Buf.push(Hash[h]);
        }
        if(!SysBuf.length && !BaseBuf.length)
            return ZERO_ARR_32;
        
        var SysHash;
        if(SysBuf.length)
            SysHash = sha3(SysBuf);
        else
        {
            SysHash = ZERO_ARR_32;
        }
        if(bSysHashOnly)
            return SysHash;
        
        var BaseHash;
        if(BaseBuf.length)
            BaseHash = sha3(BaseBuf);
        else
            BaseHash = ZERO_ARR_32;
        if(!SysBuf.length)
            return BaseHash;
        if(!BaseBuf.length)
            return SysHash;
        var Buf2 = SysHash;
        for(var h = 0; h < BaseHash.length; h++)
            Buf2.push(BaseHash[h]);
        
        var arr = sha3(Buf2);
        return arr;
    };
    Engine.CalcHashMaxLiderInner = function (Data,BlockNum)
    {
        if(!Data.DataHash)
            ToLogTrace("NO DataHash on block:" + BlockNum);
        CalcBlockHashJinn(Data, Data.DataHash, Data.MinerHash, BlockNum, Data.LinkSumHash);
    };
    Engine.SetBlockDataFromDB = function (Block)
    {
        Block.PrevSumPow = Engine.GetPrevSumPowFromDBNum(Block.BlockNum);
        Block.PrevSumHash = Engine.GetPrevSumHashFromDBNum(Block.BlockNum);
        Block.LinkSumHash = Block.PrevSumHash;
    };
    
    Engine.GetPrevSumPowFromDBNum = function (BlockNum)
    {
        var PrevNum = BlockNum - 1;
        if(PrevNum < 0)
            return 0;
        else
        {
            var PrevBlock = Engine.GetBlockHeaderDB(PrevNum, 1);
            if(PrevBlock)
                return PrevBlock.SumPow;
            else
                return 0;
        }
    };
    
    Engine.GetPrevSumHashFromDBNum = function (BlockNum)
    {
        var PrevNum = BlockNum - 1;
        if(PrevNum <= 0)
            return ZERO_ARR_32;
        else
        {
            var PrevBlock = Engine.GetBlockHeaderDB(PrevNum, 1);
            if(PrevBlock)
                return PrevBlock.SumHash;
            else
                return ZERO_ARR_32;
        }
    };
    
    Engine.ConvertToTera = function (Block,bBody)
    {
        if(!Block)
            return;
        
        if(!Block.LinkSumHash)
            ToLogTrace("!Block.LinkSumHash on Block=" + Block.BlockNum);
        if(!Block.MinerHash)
            ToLogTrace("!Block.MinerHash on Block=" + Block.BlockNum);
        if(!Block.DataHash)
            ToLogTrace("!Block.DataHash on Block=" + Block.BlockNum);
        
        if(Block.BlockNum < global.UPDATE_CODE_JINN)
            Block.PrevHash = Block.OldPrevHash8;
        else
            Block.PrevHash = Block.LinkSumHash;
        
        Block.AddrHash = Block.MinerHash;
        Block.SeqHash = Block.DataHash;
        
        if(Block.TxData)
            Block.TrDataLen = Block.TxData.length;
        else
            if(Block.TxCount)
                Block.TrDataLen = Block.TxCount;
            else
                Block.TrDataLen = 0;
        
        if(bBody)
        {
            Engine.ConvertBodyToTera(Block);
        }
    };
    
    Engine.ConvertFromTera = function (Block,bBody,bCalc)
    {
        if(!Block)
            return;
        
        if(!Block.PrevHash)
            ToLogTrace("!Block.PrevHash on Block=" + Block.BlockNum);
        if(!Block.AddrHash)
            ToLogTrace("!Block.AddrHash on Block=" + Block.BlockNum);
        if(!Block.SeqHash)
            ToLogTrace("!Block.SeqHash on Block=" + Block.BlockNum);
        
        if(Block.BlockNum < global.UPDATE_CODE_JINN)
            Block.OldPrevHash8 = Block.PrevHash;
        else
            Block.OldPrevHash8 = ZERO_ARR_32;
        
        Block.LinkSumHash = Block.PrevHash;
        Block.MinerHash = Block.AddrHash;
        Block.DataHash = Block.SeqHash;
        
        if(bBody)
        {
            Engine.ConvertBodyFromTera(Block);
        }
        if(bCalc)
        {
            Engine.SetBlockDataFromDB(Block);
        }
        
        if(Block.BlockNum >= global.UPDATE_CODE_JINN)
        {
            Block.SumHash = Block.Hash;
        }
    };
    
    Engine.ConvertBodyToTera = function (Block)
    {
        var Arr = [];
        if(Block.TxData)
        {
            for(var i = 0; i < Block.TxData.length; i++)
            {
                Arr.push(Block.TxData[i].body);
            }
        }
        Block.arrContent = Arr;
    };
    
    Engine.ConvertBodyFromTera = function (Block)
    {
        if(Block.arrContent)
        {
            var Arr = [];
            for(var i = 0; i < Block.arrContent.length; i++)
            {
                var Tx = Engine.GetTx(Block.arrContent[i], Block.BlockNum, undefined, 7);
                Arr.push(Tx);
            }
        }
        Block.TxData = Arr;
    };
}
