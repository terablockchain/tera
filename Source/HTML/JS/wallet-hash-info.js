/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var ArrInfo;
var MapInfo = {};
function InitArrInfo()
{
    MapInfo = {};
    ArrInfo = [{Name:"Hashrate from the beginning of the chain", Delta:1000000000, DX:310}, {Name:"month", Delta:30.5 * 24 * 3600,
        DX:190, Mult:10000}, {Name:"day", Delta:24 * 3600, DX:140, Mult:1000}, {Name:"hour", Delta:3600, DX:100, Mult:100}, {Name:"minute",
        Delta:60, DX:60, Mult:1}, ];
    
    for(var i = 0; i < ArrInfo.length; i++)
    {
        var Item = ArrInfo[i];
        MapInfo[Item.Name] = Item;
    }
}
InitArrInfo();
function StartDrawBlockInfo()
{
    var TimeBlockNum = GetCurrentBlockNumByTime();
    var CurBlockNum = TimeBlockNum;
    
    var WasArr = 0;
    var Arr = [];
    for(var i = ArrInfo.length - 1; i >= 0; i--)
    {
        var Item = ArrInfo[i];
        Item.BlockNum2 = CurBlockNum;
        Item.BlockNum1 = Item.BlockNum2 - Item.Delta;
        if(Item.BlockNum1 < 0)
            Item.BlockNum1 = 0;
        
        CurBlockNum = Math.floor(Item.BlockNum1 / Item.Mult) * Item.Mult;
        
        var MustUpdate = (Item.Name === "minute");
        if(!MustUpdate && Item.PowerArr)
        {
            for(var n = 0; n < Item.PowerArr.length; n++)
            {
                if(!Item.PowerArr[n])
                {
                    MustUpdate = 1;
                    break;
                }
            }
        }
        if(Item.TimeBlockNum)
        {
            var DeltaTime = Math.abs(Item.TimeBlockNum - TimeBlockNum);
            if(DeltaTime > Item.Delta / 20)
            {
                MustUpdate = 1;
            }
        }
        
        if(!Item.PowerArr || Item.PowerArr.length === 0 || MustUpdate || i === ArrInfo.length - 1)
        {
            WasArr = 1;
            Arr[i] = {BlockNum1:Item.BlockNum1, BlockNum2:Item.BlockNum2};
        }
    }
    
    if(!WasArr)
        return;
    GetData("GetHashRate", Arr, function (Data)
    {
        var TimeBlockNum = GetCurrentBlockNumByTime();
        if(Data && Data.result)
        {
            for(var i = 0; i < Data.ItervalArr.length; i++)
            {
                var Item = ArrInfo[i];
                if(Data.ItervalArr[i])
                {
                    Item.TimeBlockNum = TimeBlockNum;
                    Item.PowerArr = Data.ItervalArr[i];
                    Item.AvgPow = CalcAvg(Item.PowerArr);
                }
            }
            
            var AvgTotal = InitBlockInfo();
            
            var ArrMax = NormalizeMaxArr(Data.MaxHashStatArr, TimeBlockNum);
            var CountErrMax = DrawBlockMaxArr(ArrMax, AvgTotal);
            DrawBlockInfoByArr(ArrMax, AvgTotal, TimeBlockNum, CountErrMax);
        }
    });
}

function ValueToY(obj,AvgTotal,Value)
{
    var Y = Value - 3 * AvgTotal / 4;
    if(Y < 0)
    {
        if(Value >= 2)
            Y = 1;
        else
            Y = 0;
    }
    
    Y = obj.height - Y * 2;
    
    if(Y < 0)
        Y = 0;
    return Y;
}

function CalcAvg(Arr)
{
    var Sum = 0;
    var Count = 0;
    for(var i = 0; i < Arr.length; i++)
    {
        if(Arr[i])
        {
            Sum += Arr[i];
            Count++;
        }
    }
    if(!Count)
        return 0;
    return Math.floor((Sum / Count) * 10) / 10;
}

function InitBlockInfo()
{
    var obj = document.getElementById("idBlockInfo");
    var ctx = obj.getContext('2d');
    
    var bodystyles = window.getComputedStyle(document.body, null);
    ctx.fillStyle = bodystyles.backgroundColor;
    ctx.fillRect(0, 0, obj.width, obj.height);
    
    var AvgTotal = 0;
    for(var i = 0; i < ArrInfo.length; i++)
    {
        var Item = ArrInfo[i];
        AvgTotal += Item.AvgPow;
    }
    AvgTotal = AvgTotal / ArrInfo.length;
    return AvgTotal;
}

function NormalizeMaxArr(Arr,TimeBlockNum)
{
    if(!Arr)
        return;
    var Arr2 = [];
    for(var i = 0; i < Arr.length / 2; i++)
    {
        var Index = i * 2;
        
        var Power = Arr[Index];
        
        var BlockNum = Arr[Index + 1];
        var Delta = TimeBlockNum - BlockNum - 1;
        if(Delta > 60)
            continue;
        
        if(!Arr2[Delta] || Arr2[Delta] < Power)
            Arr2[Delta] = Power;
    }
    return Arr2;
}
function DrawBlockMaxArr(ArrMax,AvgTotal)
{
    if(!ArrMax)
        return 0;
    
    var obj = document.getElementById("idBlockInfo");
    var ctx = obj.getContext('2d');
    
    var Minute = MapInfo["minute"];
    if(!Minute)
        return 0;
    
    var Arr = Minute.PowerArr;
    
    var CountErrMax = 0;
    for(var i = 0; i < ArrMax.length; i++)
    {
        if(!ArrMax[i])
            continue;
        
        var PowerMax = ArrMax[i];
        var Delta = i;
        
        var x = obj.width - Delta;
        var y = ValueToY(obj, AvgTotal, PowerMax);
        
        var PowerBlock = Arr[i];
        if(!PowerBlock)
            PowerBlock = 0;
        var DeltaPow = PowerMax - PowerBlock;
        if(DeltaPow > 0)
        {
            CountErrMax++;
            ctx.beginPath();
            if(DeltaPow >= 8)
                ctx.fillStyle = "#ff0f00";
            else
                if(DeltaPow >= 6)
                    ctx.fillStyle = "#ff9f44";
                else
                    if(DeltaPow >= 2)
                        ctx.fillStyle = "#ffe843";
                    else
                        ctx.fillStyle = "#d5ff50";
            
            ctx.strokeStyle = ctx.fillStyle;
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
    
    return CountErrMax;
}

function DrawBlockInfoByArr(ArrMax,AvgTotal,TimeBlockNum,CountErrMax)
{
    var obj = document.getElementById("idBlockInfo");
    var ctx = obj.getContext('2d');
    
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#040";
    ctx.lineWidth = 0.5;
    
    var Month = MapInfo["month"];
    if(!Month)
        return;
    
    var x = 0;
    var lastvalue = 0;
    var WasRed = 0;
    for(var i = 0; i < ArrInfo.length; i++)
    {
        var firstx = x;
        var Item = ArrInfo[i];
        Item.x = firstx;
        
        var bMinutes = 0;
        if(i === ArrInfo.length - 1)
            bMinutes = 1;
        
        ctx.beginPath();
        var path = new Path2D();
        path.moveTo(firstx, obj.height);
        path.lineTo(firstx, ValueToY(obj, AvgTotal, lastvalue));
        
        var Arr = Item.PowerArr;
        var DeltaX = Item.DX / (Arr.length ? Arr.length : 1);
        
        var CurX = firstx;
        for(var n = 0; n < Arr.length; n++)
        {
            CurX += DeltaX;
            var Y = Arr[n];
            path.lineTo(CurX, ValueToY(obj, AvgTotal, Y));
        }
        x += Item.DX;
        
        path.lineTo(CurX, obj.height);
        path.lineTo(firstx, obj.height);
        ctx.stroke(path);
        
        var Delta = Month.AvgPow - Item.AvgPow;
        
        if(i > 1 && Delta >= 1)
        {
            WasRed = 1;
            ctx.fillStyle = "#ff9b35";
        }
        else
            if(i > 1 && Delta >= 2)
            {
                WasRed = 1;
                ctx.fillStyle = "#e22317";
            }
            else
            {
                ctx.fillStyle = "#080";
            }
        
        if(0 && bMinutes)
        {
            if(CountErrMax >= 40)
                ctx.fillStyle = "#e22317";
            else
                if(CountErrMax >= 30)
                    ctx.fillStyle = "#ff9b35";
                else
                    if(CountErrMax >= 20)
                        ctx.fillStyle = "#76911b";
        }
        
        ctx.fill(path);
    }
    
    ctx.lineWidth = 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(obj.width, 0);
    ctx.lineTo(obj.width, obj.height);
    var Y = obj.height - 5;
    for(var i = 0; i < ArrInfo.length; i++)
    {
        var Item = ArrInfo[i];
        ctx.fillText("" + Item.Name + (WasRed ? "-" + Item.AvgPow : ""), Item.x + Item.DX / 2 - 4 * Item.Name.length / 2 - 16, Y);
    }
    ctx.stroke();
}
