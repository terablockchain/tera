/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

function SetDialogToSmart(Smart)
{
    
    if(!Smart.ID)
        Smart.ID = Date.now() * 1000 + random(1000);
    
    Smart.ShortName = $("idShortName").value;
    Smart.CentName = $("idCentName").value;
    Smart.Fixed = $("idFixed").value;
    Smart.ISIN = $("idISIN").value;
    
    Smart.Name = $("idName").value;
    Smart.Description = $("idDescription").value;
    Smart.TokenGenerate = $("idTokenGenerate").checked;
    Smart.AccountLength = $("idAccountLength").value;
    
    Smart.StateFormat = $("idStateFormat").value.trim();
    Smart.Category1 = $("idCategory1").value;
    Smart.Category2 = $("idCategory2").value;
    Smart.Category3 = $("idCategory3").value;
    
    var IconParam = ParseFileName($("idIcon").value);
    Smart.IconBlockNum = IconParam.BlockNum;
    Smart.IconTrNum = IconParam.TrNum;
    
    FillEditorsPos(Smart);
    
    Smart.Code = GetSmartCode();
    Smart.HTML = GetHTMLCode();
    
    Smart.StartValue = $("idStartValue").value;
    Smart.OwnerPubKey = $("idOwnerPubKey").checked;
    
    SetVisibleTokenMode();
}

function SetSmartToDialog(Smart,bSaveToArr,bNoSetPos)
{
    $("idName").value = Smart.Name;
    $("idShortName").value = Smart.ShortName;
    if(Smart.CentName)
        $("idCentName").value = Smart.CentName;
    else
        $("idCentName").value = "";
    
    if(Smart.Fixed)
        $("idFixed").value = Smart.Fixed;
    else
        $("idFixed").value = "";
    
    $("idISIN").value = Smart.ISIN;
    
    $("idDescription").value = Smart.Description;
    $("idTokenGenerate").checked = Smart.TokenGenerate;
    $("idAccountLength").value = Smart.AccountLength;
    
    $("idStateFormat").value = Smart.StateFormat;
    $("idCategory1").value = Smart.Category1;
    $("idCategory2").value = Smart.Category2;
    $("idCategory3").value = Smart.Category3;
    if(Smart.IconBlockNum)
    {
        $("idIcon").value = "/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum;
    }
    else
        $("idIcon").value = "";
    
    if(window.ace)
    {
        editCode.setValue(Smart.Code);
        editHTML.setValue(Smart.HTML);
        
        editCode.getSession().setUndoManager(new ace.UndoManager());
        editHTML.getSession().setUndoManager(new ace.UndoManager());
        
        editCode.WasReload = 1;
        editHTML.WasReload = 1;
    }
    else
    {
        $("idCode").value = Smart.Code;
        $("idHTML").value = Smart.HTML;
    }
    
    if(!Smart.StartValue)
        Smart.StartValue = 0;
    $("idStartValue").value = Smart.StartValue;
    $("idOwnerPubKey").checked = Smart.OwnerPubKey;
    
    SetSampleByName();
    
    var bEnable = SetDialogEnabled();
    
    if(bSaveToArr && bEnable)
    {
        ProjectArray[parseInt(CurProjectValue)] = Smart;
        FillProject();
    }
    
    if(window.ace)
    {
        editCode.setReadOnly(!bEnable);
        editHTML.setReadOnly(!bEnable);
        if(editHTML.WasSmart === Smart.ID && CurProjectValue)
            editHTML.NeedReplay = 0;
        editHTML.WasSmart = Smart.ID;
    }
    
    if(!bNoSetPos)
    {
        SetEditorsPos(Smart);
        SetVisibleTab();
    }
    
    CheckReplay();
}

function SetDialogEnabled()
{
    var bDisabled = (CurProjectValue != $("idProjectList").value);
    
    var Arr = ["idName", "idShortName", "idCentName", "idFixed", "idISIN", "idCode", "idHTML", "idDescription", "idTokenGenerate",
    "idStartValue", "idOwnerPubKey", "idAccountLength", "idStateFormat", "idCategory1", "idCategory2", "idCategory3", "idIcon",
    "idBtIcon", "idBtSendSmart", "idBtSendHTML", "!idStateHTML1", "!idStateHTML2"];
    for(var i = 0; i < Arr.length; i++)
    {
        var Name = Arr[i];
        var SetDisabled = bDisabled;
        if(Name.substr(0, 1) === "!")
        {
            Name = Name.substr(1);
            SetDisabled = !SetDisabled;
        }
        var item = $(Name);
        item.disabled = SetDisabled;
        if(Name !== "idCode" && Name !== "idHTML")
        {
            if(SetDisabled)
                item.classList.add("Disabled");
            else
                item.classList.remove("Disabled");
        }
    }
    
    if($("idSmartHTMLMode").value !== "1")
    {
        $("idStateHTML1").disabled = 1;
        $("idStateHTML2").disabled = 1;
    }
    
    SetVisibleBlock("idRefHTML", bDisabled);
    
    return !bDisabled;
}

var StrSmartPath = "";
var LastBaseState = undefined;
function LoadSmart(Path)
{
    LastBaseState = undefined;
    SetStatus("");
    if(!Path)
        Path = prompt("Enter smart number or string of blockchain file path (example: /file/12345/10)", StrSmartPath);
    if(Path !== null)
    {
        if(Path == "" + parseInt(Path))
        {
            StrSmartPath = Path;
            LastBaseState = undefined;
            
            GetData("DappSmartList", {StartNum:parseInt(Path), CountNum:1, GetAllData:1, AllRow:1}, function (SetData)
            {
                if(SetData && SetData.result && SetData.arr.length === 1)
                {
                    var Smart = SetData.arr[0];
                    $("idSmartOwner").value = Smart.Owner;
                    $("idSmartAccount").value = Smart.Account;
                    if(MapAccounts[Smart.Owner] && Smart.BaseState && Smart.BaseState.HTMLBlock !== undefined && Smart.BaseState.HTMLTr !== undefined)
                        $("idSmartHTMLMode").value = 1;
                    else
                        $("idSmartHTMLMode").value = 0;
                    
                    LoadSmart("/file/" + Smart.BlockNum + "/" + Smart.TrNum);
                    var Str = "";
                    var Url = "";
                    if(Smart.BaseState && Smart.BaseState.HTMLBlock)
                    {
                        LastBaseState = Smart.BaseState;
                        var Url = "/file/" + Smart.BaseState.HTMLBlock + "/" + Smart.BaseState.HTMLTr;
                        Str = "<a target='_blank' class='link' onclick='OpenExtLink(\"" + Url + "\"); return 0;'>" + Url + "</a>";
                    }
                    $("idRefHTML").innerHTML = Str;
                    $("idNewStateFile").value = Url;
                }
                else
                {
                    SetError("Error smart number: " + Path);
                }
                
                SetPrice();
            });
        }
        else
        {
            var Param = ParseFileName(Path);
            if(!Param.BlockNum)
            {
                SetError("Error file path: " + Path);
                return;
            }
            StrSmartPath = Path;
            GetData("DappBlockFile", Param, function (SetData)
            {
                if(SetData && SetData.result)
                {
                    if(SetData.Type === 111 && SetData.Body.Body.Type === 130)
                    {
                        var Smart = SetData.Body.Body;
                        SetSmartToDialog(Smart, 1);
                    }
                    else
                    {
                        SetError("Error type (" + SetData.Type + ") transaction in path: " + Path);
                    }
                }
                else
                {
                    SetError("Error data in path: " + Path);
                }
                SetPrice();
            });
        }
    }
}
function OpenExtLink(Path)
{
    if(Path)
        window.open(GetFilePath(Path));
}

var PrevSmartValue;
function SetCurrentSmart(nSet)
{
    SavePrevProject();
    CurProjectValue = undefined;
    
    var SmartValue =  + ($("idSmartList").value);
    
    if(nSet === 2 && SmartValue === PrevSmartValue)
        return;
    
    PrevSmartValue = SmartValue;
    
    if(SmartValue)
        LoadSmart(SmartValue);
    SetDialogEnabled();
    if(SmartValue > 8)
    {
        $("idSmartStart").value = SmartValue;
        
        for(var Num = 0; Num < 2; Num++)
        {
            if(!AllDappMap[SmartValue - Num])
            {
                FillSmart(SmartValue - Num - 9, 10);
                break;
            }
            if(!AllDappMap[SmartValue + Num])
            {
                FillSmart(SmartValue + Num + 1);
                break;
            }
        }
    }
}

var AllDappArr = [];
var AllDappMap = {};
function FillSmart(StartNum,Count)
{
    if(StartNum === undefined)
        StartNum = $("idSmartStart").value;
    if(!StartNum)
        StartNum = 1;
    if(NETWORK_ID === "MAIN-JINN.TERA" && (StartNum < 8))
        StartNum = 8;
    if(!Count)
        Count = 100;
    GetData("DappSmartList", {StartNum:StartNum, CountNum:Count, AllRow:1}, function (SetData)
    {
        if(SetData && SetData.result)
        {
            var Arr = AllDappArr;
            for(var i = 0; i < SetData.arr.length; i++)
            {
                var Smart = SetData.arr[i];
                if(AllDappMap[Smart.Num])
                    continue;
                AllDappMap[Smart.Num] = 1;
                
                var img = "";
                if(Smart.IconBlockNum)
                    img = "/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum;
                
                var Item = {text:"" + Smart.Num + ". " + Smart.Name, value:Smart.Num, img:img};
                Arr.push(Item);
            }
            Arr.sort(function (a,b)
            {
                return a.value - b.value;
            });
            FillSelect("idSmartList", Arr);
        }
    });
}

var ProjectArray = [];
var CurProjectValue = undefined;
function FillProject()
{
    var Arr = [];
    for(var i = 0; i < ProjectArray.length; i++)
    {
        var Smart = ProjectArray[i];
        var img = "";
        if(Smart.IconBlockNum)
            img = "/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum;
        
        Arr.push({text:"" + Smart.Name, value:i, img:img});
    }
    FillSelect("idProjectList", Arr);
    $("idProjectList").value = CurProjectValue;
}

function SavePrevProject()
{
    if(CurProjectValue)
    {
        SetDialogToSmart(ProjectArray[ + CurProjectValue]);
    }
}

function SetCurrentProject(bSet)
{
    if(bSet)
        SavePrevProject();
    
    PrevSmartValue = undefined;
    
    var SmartValue = $("idProjectList").value;
    if(SmartValue)
    {
        
        if(bSet === 2 && CurProjectValue === SmartValue)
            return;
        
        CurProjectValue = SmartValue;
        
        var Smart = ProjectArray[ + SmartValue];
        SetSmartToDialog(Smart);
        SetPrice();
        if(bSet)
            SetVisibleTab();
    }
}
function DelProject()
{
    DoConfirm("Are you sure?", function ()
    {
        var SmartValue = $("idProjectList").value;
        if(SmartValue)
        {
            var Index = parseInt(SmartValue);
            ProjectArray.splice(Index, 1);
            
            FillProject();
            if(Index >= ProjectArray.length)
                Index = ProjectArray.length - 1;
            var Smart;
            if(Index >= 0)
            {
                Smart = ProjectArray[Index];
                CurProjectValue = "" + Index;
            }
            else
            {
                Smart = GetBlankSmart();
                CurProjectValue = undefined;
            }
            
            SetSmartToDialog(Smart);
            $("idProjectList").value = Index;
        }
    });
}
function GetBlankSmart()
{
    var Smart = {};
    Smart.Name = "";
    Smart.ShortName = "";
    Smart.CentName = "";
    Smart.Fixed = 9;
    Smart.ISIN = "";
    Smart.Description = "";
    Smart.TokenGenerate = 0;
    Smart.AccountLength = 1;
    
    Smart.StateFormat = "";
    Smart.Category1 = 0;
    Smart.Category2 = 0;
    Smart.Category3 = 0;
    Smart.IconBlockNum = 0;
    Smart.IconTrNum = 0;
    Smart.Code = "";
    Smart.HTML = "";
    Smart.CrossMsgConfirms = 0;
    return Smart;
}
function NewProject()
{
    var NewSmartNum = 0;
    var Smart = GetBlankSmart();
    BlockNum:
    while(true)
    {
        NewSmartNum++;
        var Name = "New " + NewSmartNum;
        for(var i = 0; i < ProjectArray.length; i++)
        {
            var Smart2 = ProjectArray[i];
            if(Smart2.Name === Name)
                continue BlockNum;
        }
        break;
    }
    Smart.Name = Name;
    
    if($("idUseTemplate").checked)
    {
        Smart.Code = "//Smart-contract: " + Name + "\n\n";
        for(var i = 0; i < CodeTemplate.length; i++)
        {
            var Str = "" + CodeTemplate[i];
            Smart.Code += Str + "\n";
            if(Str.length > 8)
                Smart.Code += "\n";
        }
        
        var Str = "" + HTMLTemplate;
        Str = Str.replace("function HTMLTemplate(){", "<script>");
        Smart.HTML = Str.substr(0, Str.length - 1) + "<\/script>\n\n";
        Smart.HTML += $("idHTMLTemplate").innerHTML + "\n";
        
        Smart.StateFormat = "{HTMLBlock:uint,HTMLTr:uint16}";
    }
    
    ProjectArray.unshift(Smart);
    FillProject();
    $("idProjectList").value = 0;
    CurProjectValue = $("idProjectList").value;
    SetSmartToDialog(Smart, 0, 1);
    
    $("idName").focus();
}

function TrimStr(Str)
{
    var Arr = Str.split("\n");
    
    for(var i = 0; i < Arr.length; i++)
    {
        Arr[i] = Arr[i].trim();
    }
    return Arr.join("\n");
}

function TrimRows(StrID)
{
    $(StrID).value = TrimStr($(StrID).value);
}

function SetVisibleTokenMode()
{
    SetVisibleBlock("idTokenMode", $("idTokenGenerate").checked);
}

function OpenWalletPage()
{
    window.open(GetWalletLink());
}

function CheckReplay()
{
    if(editHTML && editHTML.NeedReplay)
    {
        if($("idAutoPlay").checked)
            DoPlay();
    }
}

function DoPlay(bRecreate)
{
    if(ArrTabs[1].Current != "TabPlay")
        return;
    
    var bEnable = SetDialogEnabled();
    if(!bEnable && LastBaseState)
    {
        GetData("DappBlockFile", {BlockNum:LastBaseState.HTMLBlock, TrNum:LastBaseState.HTMLTr}, function (SetData)
        {
            if(SetData && SetData.result)
            {
                bWasPlay = 1;
                RunFrame(SetData.Body, $("idPreview"), bRecreate);
            }
        });
        return;
    }
    bWasPlay = 1;
    var Code = GetHTMLCode();
    RunFrame(Code, $("idPreview"), bRecreate);
}

function SelectScreenStyle()
{
    var Select = $("idScreenStyle");
    $("idPreview").className = Select.value;
}
