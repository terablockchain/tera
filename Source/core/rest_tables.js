/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/



function DoRest(RestData,Data,BlockNum)
{
    var Prev = RestData.Arr[0];
    
    var BlockNum0 = Math.floor(BlockNum / REST_BLOCK_SCALE);
    
    if(BlockNum0 !== Math.floor((Prev.BlockNum - 1) / REST_BLOCK_SCALE))
    {
        var arr = GetRestArr(BlockNum0);
        var arr2 = [];
        for(var i = arr.length - 2; i >= 0; i--)
        {
            arr2.push(arr[i] * REST_BLOCK_SCALE);
        }
        RestPush(RestData, arr2, BlockNum, 1);
    }
    
    RestData.Arr[0] = {BlockNum:BlockNum, Value:Data.Value};
}
function RestPush(RestData,ArrRest,BlockNum,Index)
{
    
    var Prev = RestData.Arr[Index - 1];
    var Cur = RestData.Arr[Index];
    
    if(Index > 1)
    {
        var RestNum = ArrRest[Index - 2];
        if(Prev.BlockNum > RestNum)
            return;
    }
    
    if((Cur.BlockNum && Cur.BlockNum >= BlockNum) || Prev.BlockNum >= BlockNum)
    {
        Cur.BlockNum = 0;
        Cur.Value = {};
        return;
    }
    
    if(Cur.BlockNum)
    {
        if(Index < RestData.Arr.length - 1)
        {
            RestPush(RestData, ArrRest, BlockNum, Index + 1);
        }
    }
    
    RestData.Arr[Index] = Prev;
}

function GetRestArr(CurBlockNum)
{
    var Arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var ArrLength = Arr.length;
    var StartNum = 0;
    for(var num = StartNum; num <= CurBlockNum; num++)
    {
        var maska = 0;
        var CurNum = num;
        for(var i = ArrLength - 1; i >= 0; i--)
        {
            var PosNum = Arr[i];
            Arr[i] = CurNum;
            CurNum = PosNum;
            
            maska = (maska << 4) | 15;
            
            if((maska & num) === 0)
                break;
            if((maska & CurNum) !== 0)
                break;
        }
    }
    return Arr;
}

var RestArrMap = {};
function GetCurrentRestArr()
{
    var BlockNum = GetCurrentBlockNumByTime();
    var BlockNum0 = Math.floor(BlockNum / REST_BLOCK_SCALE);
    var arr = RestArrMap[BlockNum0];
    if(arr === undefined)
    {
        RestArrMap = {};
        
        arr = GetRestArr(BlockNum0);
        arr.length = arr.length - 1;
        
        for(var i = 0; i < arr.length; i++)
        {
            arr[i] = arr[i] * REST_BLOCK_SCALE;
        }
        RestArrMap[BlockNum0] = arr;
    }
    return arr;
}

function GetCurrentRestNum(NumDelta)
{
    var BlockNum = GetCurrentBlockNumByTime();
    var BlockNumMin = BlockNum - NumDelta;
    var arr = GetCurrentRestArr();
    for(var i = arr.length - 1; i >= 0; i--)
    {
        if(arr[i] <= BlockNumMin)
        {
            return arr[i];
        }
    }
    return 0;
}

global.DoRest = DoRest;
global.GetRestArr = GetRestArr;
global.GetCurrentRestArr = GetCurrentRestArr;
global.GetCurrentRestNum = GetCurrentRestNum;

