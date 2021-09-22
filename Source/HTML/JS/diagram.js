/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var DiagramMap = {};
var DiagramMapId = {};
var LMouseOn = false;
if(!window.toStaticHTML)
    toStaticHTML = function (Str)
    {
        return Str;
    };
function DrawDiagram(Item)
{
    if(Item.Delete)
        return;
    DiagramMapId[Item.id] = Item;

    if(Item.F1)//additional presetup
        Item.F1(Item);

    var arr = Item.arr;
    if(!arr)
        arr = Item.ArrList;
    
    var GreenValue = Item.value;
    var StepTime = Item.steptime;
    var StartNumber = Item.startnumber;
    var StartServer = Item.starttime;
    var mouseX = Item.mouseX;
    var KPrecision = Item.KPrecision;
    var CountNameX = Item.CountNameX;
    if(!CountNameX)
        CountNameX = 10;
    var arrX = Item.arrX;
    
    if(!KPrecision)
        KPrecision = 1;
    
    if(!arr)
        return;
    
    var obj = document.getElementById(Item.id);
    var ctx = obj.getContext('2d');
    var Left = Item.left?Item.left:50;
    var Top = 11;
    var Button = 15;
    var Right = Item.right?Item.right:50;
    if(Item.fillStyle)
        ctx.fillStyle = Item.fillStyle;
    else
        ctx.fillStyle = "#FFF";
    ctx.fillRect(0, 0, obj.width, obj.height);
    
    var MaxWidth = obj.width - Left - Right;

    if(arr.length > MaxWidth)
    {
        //console.log("************MaxWidth",MaxWidth);
        var K = arr.length / MaxWidth;
        var arr2 = [];
        for(var i = 0; i < MaxWidth; i++)
        {
            var i2 = Math.floor(i * K);
            arr2[i] = arr[i2];
        }
        arr = arr2;
    }
    
    if(arr.length <= 0)
        return;
    
    var Pow2 = 0;
    if(Item.name.substr(Item.name.length - 2) === "**")
        Pow2 = 1;
    
    var MaxValue = arr[0];
    var MinValue = arr[0];
    var AvgValue = 0;

    for(var i = 0; i < arr.length; i++)
    {
        if(arr[i] > MaxValue)
            MaxValue = arr[i];
        if(arr[i] < MinValue)
            MinValue = arr[i];
        
        if(arr[i])
            AvgValue += arr[i];
    }
    if(Item.name.substr(0, 4) !== "MAX:" || !Item.AvgValue)
        AvgValue = AvgValue / arr.length;
    else
        AvgValue = Item.AvgValue;

    if(Pow2 && AvgValue)
        AvgValue = Math.pow(2, AvgValue) / 1000000;

    if(AvgValue < 50)
        AvgValue = AvgValue.toFixed(2);
    else
        AvgValue = Math.floor(AvgValue);

    if(Item.MaxValue !== undefined)
        MaxValue = Item.MaxValue;

    
    if(Pow2 && MaxValue)
        MaxValue = Math.pow(2, MaxValue) / 1000000;
    
    var HValue = MaxValue;
    
    if(HValue <= 0)
        HValue = 1;
    
    var KX = (MaxWidth) / arr.length;
    var KY = (obj.height - Top - Button) / HValue;
    
    var DeltaY = 0;
    var bLine = Item.line;
    if(Item.zero)
    {
        bLine = 1;
        DeltaY -= Item.zero * KY;
        MaxValue -= Item.zero;
        AvgValue -= Item.zero;
    }
    
    MaxValue = Math.floor(MaxValue + 0.5);
    
    if(bLine)
        ctx.lineWidth = 3;
    else
        if(KX > 1)
            ctx.lineWidth = KX;
        else
            ctx.lineWidth = 1;
    
    var StartX = Left;
    var StartY = obj.height - Button;
    var mouseValueX = 0;
    var mouseValueI = 0;
    var mouseValue = undefined;
    var mouseColor = undefined;
    function DrawLines(arr,mode,color)
    {
        var WasMove0 = 0;
        ctx.beginPath();
        ctx.moveTo(Left, obj.height - Button);
        ctx.strokeStyle = color;
        var PrevX = undefined;
        for(var i = 0; i < arr.length; i++)
        {
            var Value = arr[i];
            if(!Value)
                Value = 0;
            if(Value)
            {
                if(Pow2)
                    Value = Math.pow(2, Value) / 1000000;
            }
            var x = StartX + (i+0.5)* KX;
            
            if(mouseX)
            {
                var deltaCur = Math.abs(x - mouseX);
                var deltaWas = Math.abs(mouseValueX - mouseX);
                if(deltaCur < deltaWas)
                {
                    mouseValueI=i;
                    mouseValueX = x;
                    mouseValue = Value;
                    
                    if(Item.zero)
                        mouseValue -= Item.zero;
                    mouseColor = color;
                }
            }
            
            if(mode === "green")
            {
                if(Value > GreenValue)
                    continue;
            }
            else
                if(mode === "red")
                {
                    if(Value <= GreenValue)
                        continue;
                }
            
            var Value1 = Value;
            if(Value1 > GreenValue)
                Value1 = GreenValue;
            
            var VX1 = Math.floor(Value1 * KY);
            var VX2 = Math.floor(Value * KY);
            if(VX1 === VX2)
                VX1 -= 2;
            
            if(bLine)
            {
                if(!WasMove0)
                {
                    WasMove0 = 1;
                    ctx.moveTo(x, StartY - VX2);
                }
                else
                {
                    ctx.lineTo(x, StartY - VX2);
                }
            }
            else
            {
                ctx.moveTo(x, StartY - VX1);
                ctx.lineTo(x, StartY - VX2);
            }
        }
        ctx.stroke();
    };
    if(!Item.red)
        Item.red = "#A00";
    if(bLine)
    {
        DrawLines(arr, "line", Item.red);
    }
    else
    {
        DrawLines(arr, "red", Item.red);
        if(GreenValue > 0)
            DrawLines(arr, "green", "#0A0");
    }
    
    var MaxValueText = GetValueByItemProperty(MaxValue, Item);
    var AvgValueText = GetValueByItemProperty(AvgValue, Item);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    Left--;
    StartX--;
    StartY += 2;
    ctx.moveTo(Left, Top);
    ctx.lineTo(StartX, StartY);
    ctx.moveTo(StartX, StartY + DeltaY);
    ctx.lineTo(obj.width - 10, StartY + DeltaY);
    ctx.stroke();
    if(mouseX !== undefined)
    {
        ctx.beginPath();
        ctx.strokeStyle = "#00F";
        ctx.moveTo(mouseX, Top);
        ctx.lineTo(mouseX, StartY);
        ctx.stroke();
        
        if(mouseValue !== undefined)
        {
            ctx.fillStyle = mouseColor;
            
            var Val = GetValueByItemProperty(mouseValue, Item);
            if(arrX && arrX[mouseValueI])
                Val=String(arrX[mouseValueI])+" = "+Val;


            var mouseTextX = mouseX;
            Val=""+(Item.MouseTextPref?Item.MouseTextPref:"") + Val + (Item.MouseText?Item.MouseText:"");
            mouseTextX -= 5 * Val.length/2;
            ctx.fillText(Val, mouseTextX, Top - 2);
        }
    }
    var tlength=Math.floor(Left/6);
    ctx.fillStyle = "#000";
    if(!Item.NoTextMax)
        ctx.fillText(Rigth("          " + MaxValueText, tlength), 0, Top - 3);
    if(MaxValue > 0 && AvgValue > 0 && !Item.NoAvgValue)
    {
        
        var heigh = StartY - Top;
        var KKY = AvgValue / MaxValue;
        var y = (heigh - Math.floor(KKY * heigh));
        var yT = y;
        if(yT < 10)
        {
            yT = 10;
        }
        
        ctx.beginPath();
        ctx.moveTo(Left - 2, y + Top);
        ctx.lineTo(Left + 2, y + Top);
        ctx.stroke();
        ctx.strokeStyle = "#00F";
        ctx.fillText(Rigth("          " + AvgValueText, tlength), 0, yT + Top);
    }
    
    if(arr.length < CountNameX)
        CountNameX = arr.length;
    var KX3 = MaxWidth / CountNameX;
    
    var KDelitel = 1;
    var Step = arr.length / CountNameX;


    var StartTime, bNumber;
    if(arrX)
    {
    }
    else
    if(StartNumber !== undefined)
    {
        bNumber = 1;
        StartTime = StartNumber;
    }
    else
    if(StartServer)
    {
        bNumber = 1;
        StartTime = Math.floor(((Date.now() - StartServer) - StepTime * arr.length * 1000) / 1000);
        if(StartTime < 0)
            StartTime = 0;

        KDelitel = Math.floor(Step / 10) * 10;
        if(KDelitel == 0)
            KDelitel = 1;
    }
    else
    {
        bNumber = 0;
        StartTime = Date.now() - StepTime * arr.length * 1000;
        StartX = StartX - 16;
    }

    for(i = 0; i <= CountNameX; i++)
    {
        var x = StartX + (i + 0.5) * KX3;
        var y = StartY + 10;
        if(x-10 >= MaxWidth)
            continue;

        var Val;
        if(i === CountNameX)
        {
            Val = arr.length * StepTime;
            KDelitel = 1;
        }
        else
        if(i === 0)
            Val = 0;
        else
            Val = i * Step * StepTime;

        var Str;
        if(arrX)
        {
            Val = Math.floor(Val);
            x = 1+StartX + (Val+0.5) * KX;
            Str = arrX[Val];
            if(Str === undefined)
                Str = "";
        }
        else
        if(bNumber)
        {
            Val = Math.floor((StartTime + Val) / KDelitel) * KDelitel;
            Str = Val;
        }
        else
        {
            var Time = new Date(StartTime + Val * 1000);
            Str = "" + Time.getHours();
            Str += ":" + Rigth("0" + Time.getMinutes(), 2);
            Str += ":" + Rigth("0" + Time.getSeconds(), 2);
        }
        if(!Str)
            continue;


        ctx.strokeStyle = "#bbb";
        ctx.lineWidth = KX;
        ctx.beginPath();
        ctx.moveTo(x, StartY-2);
        ctx.lineTo(x, StartY+2);
        ctx.stroke();
        ctx.lineWidth = 0.5;
        FillTextAvg(ctx, x, y, Str);
    }

    if(Item.F2)//additional draw process
        Item.F2(Item,ctx);
}

function FillTextAvg(context,x,y,Str)
{
    Str=String(Str).trim();
    x-=5*Str.length/2;


    context.fillText(Str, x, y);
}


function Rigth(Str,Count)
{
    if(Str.length < Count)
        return Str;
    else
        return Str.substr(Str.length - Count);
}

function SetHTMLDiagramItem(Item,width,Param)
{
    Item.mouseX = width - 50;
    
    if(Item.Extern || Item.Delete)
        return;
    
    var MinHeight = 80;
    
    if(!Item.id)
        Item.id = "DgrmId" + Item.num;
    
    DiagramMap[Item.name] = Item;
    DiagramMapId[Item.id] = Item;
    
    var Str;
    if(Item.isLine)
    {
        if(Item.text)
            Str = "<BR>" + GetDiagramHeadHTML(Item, Param);
        else
            Str = "<HR>";
    }
    else
    {
        Str = '<BR><DIV>' + GetDiagramHeadHTML(Item, Param) + '<BR><canvas  class="DIAGRAM" width="' + width + '" height="' + MinHeight + '" id="' + Item.id + '"></canvas>';
    }
    
    var ElBlock = document.getElementById("B" + Item.id);
    if(ElBlock)
    {
        ElBlock.innerHTML = toStaticHTML(Str);
    }
    else
    {
        var diargams = document.getElementById("diargams");
        if(diargams)
            diargams.innerHTML = toStaticHTML(diargams.innerHTML + "<DIV id='B" + Item.id + "'>" + Str + "</DIV>");
    }
}

function GetDiagramHeadHTML(Item,Param)
{
    var Str = "";
    if(Item.isLine)
        Str += "<B>";
    Str += Item.text;
    if(Item.isLine)
        Str += '</B>';
    if(Param)
    {
        Str += '<INPUT type="button" class="move" onclick="MoveDiagram(\'' + Item.id + '\',1)" value="↓">';
        Str += '<INPUT type="button" class="move" onclick="MoveDiagram(\'' + Item.id + '\',-1)" value="↑">';
        Str += '<INPUT type="button" class="move" onclick="DeleteDiagram(\'' + Item.id + '\')" value="X">';
    }
    
    return Str;
}

function SetDiagramMouseX(event,mode)
{
    if(event.srcElement && event.srcElement.className && event.srcElement.className.indexOf && event.srcElement.className.indexOf("DIAGRAM") >= 0)
    {
        if(mode === "down")
            LMouseOn = true;
        else
            if(mode === "up")
                LMouseOn = false;
        
        event.preventDefault();
        if(LMouseOn === true)
        {
            var obj = event.srcElement;
            var mouse = getMouse(obj, event);
            
            if(event.ctrlKey === true)
            {
                for(var key in DiagramMapId)
                {
                    var Item = DiagramMapId[key];
                    Item.mouseX = mouse.x;
                    DrawDiagram(Item);
                }
            }
            else
            {
                var Item = DiagramMapId[obj.id];
                if(Item)
                {
                    Item.mouseX = mouse.x;
                    DrawDiagram(Item);
                }
            }
        }
    }
}

function GetValueByItemProperty(Value,Item)
{
    if(Item.MathPow && Item.MathDiv)
    {
        Value = Math.pow(Item.MathPow, Value) / Item.MathDiv;
    }
    
    var KPrecision = Item.KPrecision;
    if(!Item.KPrecision)
        KPrecision = 1;
    var RetValue = Math.floor(Value * KPrecision + 0.5) / KPrecision;
    if(RetValue === 0)
    {
        if(typeof Value === "number")
            RetValue = Value.toPrecision(3);
    }
    
    return RetValue;
}

function InitDiagramByArr(Arr,width,Param)
{
    for(var i = 0; i < Arr.length; i++)
    {
        var Item = Arr[i];
        Item.num = i + 1;
        if(!Item.id || !Item.Extern)
            Item.id = "DgrmId" + Item.num;
    }
    
    for(var i = 0; i < Arr.length; i++)
    {
        SetHTMLDiagramItem(Arr[i], width, Param);
    }
    
    window.addEventListener('mousedown', function (event)
    {
        SetDiagramMouseX(event, "down");
    }, false);
    window.addEventListener('mouseup', function (event)
    {
        SetDiagramMouseX(event, "up");
    }, false);
    window.addEventListener('onmousemove', function (event)
    {
        SetDiagramMouseX(event, "move");
    }, false);
}


function getMouse(canvas,e)
{
    
    var x = e.clientX - getTrueOffsetLeft(canvas);
    if(window.pageXOffset)
        x = x + window.pageXOffset;
    
    var y = e.clientY - getTrueOffsetTop(canvas);
    if(window.pageYOffset)
        y = y + window.pageYOffset;
    var coord = {x:x, y:y};
    return coord;
}
function getTrueOffsetLeft(ele)
{
    var n = 0;
    while(ele)
    {
        n += ele.offsetLeft || 0;
        ele = ele.offsetParent;
    }
    return n;
}

function getTrueOffsetTop(ele)
{
    var n = 0;
    while(ele)
    {
        n += ele.offsetTop || 0;
        ele = ele.offsetParent;
    }
    return n;
}
