/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";


global.VIRTUAL_TYPE_TX_START = 200;


global.TYPE_TRANSACTION_SYS_TX_BUNDLE = 200;
global.FORMAT_SYS_TX_BUNDLE = {Type:"byte", TxData:[{body:"tr"}], };
global.WorkStructSysTxBundle = {};

module.exports.Init = Init;
function Init(Engine)
{
    Engine.SysTreeBundleTx = new CBlockCache(function (a,b)
    {
        return CompareArr(a.Hash, b.Hash);
    });
    Engine.SysTreeTx = new CBlockCache(function (a,b)
    {
        return CompareArr(a.HashTicket, b.HashTicket);
    });
    
    Engine.IsVirtualTypeTx = function (Type)
    {
        if(Type >= VIRTUAL_TYPE_TX_START)
            return 1;
        
        return 0;
    };
    
    Engine.RunVTX = function (Tx,BlockNum,bInner)
    {
        if(Tx.IsTx)
        {
            var Type = Tx.body[0];
            switch(Type)
            {
                case TYPE_TRANSACTION_SYS_TX_BUNDLE:
                    Engine.RunSysTxBundle(Tx, BlockNum, bInner);
                    break;
            }
        }
    };
    
    Engine.PrepareAndSendSysTx = function ()
    {
        var BlockNum = Engine.CurrentBlockNum - 1;
        if(Engine.WasPrepareAndSendSysTx === BlockNum)
            return;
        
        var Arr = Engine.DoSendingCrossArr(BlockNum);
        if(typeof Arr !== "object")
        {
            return;
        }
        
        var TxAcc = ACCOUNTS.GetAccountHashTx(BlockNum);
        if(TxAcc)
        {
            Arr.push(TxAcc);
        }
        Engine.WasPrepareAndSendSysTx = BlockNum;
        
        if(Arr.length)
        {
            var Bundle = Engine.CreateSysBundle(BlockNum, Arr);
            var ItemTx = Engine.GetTx(Bundle._Body, BlockNum);
            
            var TxArr = [];
            
            var Find = Engine.SysTreeBundleTx.FindItemInCache(Bundle);
            if(Find)
            {
                var FreashBlockNum = Engine.CurrentBlockNum - JINN_CONST.STEP_CLEAR_MEM + 5;
                if(Find.BlockNum > FreashBlockNum)
                {
                    ItemTx = undefined;
                }
            }
            
            if(ItemTx)
            {
                TxArr.push(ItemTx);
            }
            
            Engine.AddCurrentProcessingTx(BlockNum, TxArr, 1);
        }
    };
    
    Engine.CalcSysBundleHash = function (Bundle)
    {
        for(var i = 0; i < Bundle.TxData.length; i++)
            Bundle.TxData[i] = Engine.GetTx(Bundle.TxData[i].body, Bundle.BlockNum);
        
        Bundle.Hash = Engine.CalcBaseSysTreeHash(Bundle.BlockNum, Bundle.TxData, 1);
    };
    
    Engine.CreateSysBundle = function (BlockNum,Arr)
    {
        var Bundle = {Type:TYPE_TRANSACTION_SYS_TX_BUNDLE, TxData:Arr, };
        Bundle._Body = SerializeLib.GetBufferFromObject(Bundle, FORMAT_SYS_TX_BUNDLE, WorkStructSysTxBundle);
        
        Bundle.BlockNum = BlockNum;
        Bundle.bInner = 1;
        Engine.CalcSysBundleHash(Bundle);
        return Bundle;
    };
    
    Engine.RunSysTxBundle = function (Tx,BlockNum,bInner)
    {
        
        var Bundle = SerializeLib.GetObjectFromBuffer(Tx.body, FORMAT_SYS_TX_BUNDLE, WorkStructSysTxBundle);
        Bundle.BlockNum = BlockNum;
        Bundle.bInner = bInner;
        Engine.CalcSysBundleHash(Bundle);
        
        Engine.SysTreeBundleTx.AddItemToCache(Bundle);
        for(var i = 0; i < Bundle.TxData.length; i++)
        {
            var Tx = Bundle.TxData[i];
            Tx.BlockNum = BlockNum;
            
            Engine.SysTreeTx.AddItemToCache(Tx);
        }
    };
    
    Engine.GetMaxBlockFromDBChain = function (BlockNew)
    {
        var BlockNum = BlockNew.BlockNum;
        var MaxBlock = undefined;
        var ArrBlock = Engine.DB.GetChainArrByNum(BlockNum);
        ArrBlock.sort(function (a,b)
        {
            if(b.SumPow !== a.SumPow)
                return b.SumPow - a.SumPow;
            return CompareArr(b.PowHash, a.PowHash);
        });
        for(var n = 0; n < ArrBlock.length; n++)
        {
            var CurBlock = ArrBlock[n];
            
            if(!MaxBlock || (MaxBlock.SumPow < CurBlock.SumPow || (MaxBlock.SumPow === CurBlock.SumPow && CompareArr(CurBlock.PowHash,
            MaxBlock.PowHash) < 0)))
            {
                if(Engine.IsFullLoadedBlock(CurBlock, MAX_BLOCK_RECALC_DEPTH))
                {
                    MaxBlock = CurBlock;
                    continue;
                }
                if(IsEqArr(CurBlock.PrevSumHash, BlockNew.PrevSumHash))
                {
                    if(IsEqArr(CurBlock.TreeHash, BlockNew.TreeHash))
                    {
                        MaxBlock = CurBlock;
                        continue;
                    }
                    
                    var Bundle = undefined;
                    if(CurBlock.SysTreeHash && !IsZeroArr(CurBlock.SysTreeHash))
                    {
                        Bundle = Engine.SysTreeBundleTx.FindItemInCache({Hash:CurBlock.SysTreeHash});
                        if(!Bundle)
                        {
                            ToLogOne("Not find bundle: " + GetHexFromArr8(CurBlock.SysTreeHash) + " Block:" + BlockInfo(CurBlock), "", 3);
                            continue;
                        }
                    }
                    else
                    {
                    }
                    var CurBlock2 = Engine.CreateBlockTxDataFromBundle(BlockNew, Bundle);
                    if(IsEqArr(CurBlock.TreeHash, CurBlock2.TreeHash))
                    {
                        Engine.CopyBodyTx(CurBlock, CurBlock2);
                        
                        MaxBlock = CurBlock;
                        continue;
                    }
                    else
                    {
                        if(!IsZeroArr(CurBlock.SysTreeHash))
                            ToLog("Got not correct SysTreeHash=" + GetHexFromArr8(CurBlock.SysTreeHash) + " TreeHash=" + GetHexFromArr8(CurBlock2.TreeHash) + " need=" + GetHexFromArr8(CurBlock.TreeHash) + " Block:" + BlockInfo(CurBlock),
                            3);
                    }
                }
            }
        }
        return MaxBlock;
    };
    
    Engine.CreateBlockTxDataFromBundle = function (BaseBlock,Bundle)
    {
        var Block = {BlockNum:BaseBlock.BlockNum};
        
        Block.TxData = [];
        if(Bundle)
        {
            
            for(var i = 0; i < Bundle.TxData.length; i++)
            {
                var Tx = Bundle.TxData[i];
                Block.TxData.push(Tx);
            }
        }
        
        for(var i = 0; i < BaseBlock.TxData.length; i++)
        {
            var Tx = BaseBlock.TxData[i];
            if(Engine.IsVirtualTypeTx(Tx.body[0]))
                continue;
            
            Block.TxData.push(Tx);
        }
        Block.TxCount = Block.TxData.length;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        
        return Block;
    };
}
