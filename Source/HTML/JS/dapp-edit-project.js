/*
 * @project: TERA
 * @version: 2
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

function SaveAllProjects()
{
    SaveValues(1);
    var Value=localStorage['SMART-ProjectArray'];
    SaveWebDataToFile(Value,'dapp-ide.txt');

    SaveProjectsToDB(Value);
}


function SetDialogToSmart(Smart)
{
    
    if(!Smart.ID)
        Smart.ID = Date.now() * 1000 + random(1000);
    
    Smart.ShortName = idShortName.value;
    Smart.CentName = idCentName.value;
    Smart.Fixed = idFixed.value;
    Smart.ISIN = idISIN.value;
    
    Smart.Name = idName.value;
    Smart.Description = idDescription.value;
    //Smart.TokenGenerate = idTokenGenerate.checked;
    //Smart.AccountLength = idAccountLength.value;
    
    Smart.StateFormat = "";//idStateFormat.value.trim();
    Smart.Category1 = idCategory1.value;
    Smart.Category2 = idCategory2.value;
    Smart.Category3 = idCategory3.value;
    
    var IconParam = ParseFileName(idIcon.value);
    Smart.IconBlockNum = IconParam.BlockNum;
    Smart.IconTrNum = IconParam.TrNum;
    
    EditorsToSmart(Smart);
    
    Smart.Code = GetSmartCode();
    Smart.HTML = GetHTMLCode();
    
    Smart.StartValue = 0;//idStartValue.value;
    Smart.OwnerPubKey = idOwnerPubKey.checked;
    
    SetVisibleTokenMode();
}

function SetSmartToDialog(Smart,bSaveToArr,bNoSetPos)
{
    idName.value = Smart.Name;
    idShortName.value = Smart.ShortName;

    if(Smart.CentName)
        idCentName.value = Smart.CentName;
    else
        idCentName.value = "";
    
    if(Smart.Fixed)
        idFixed.value = Smart.Fixed;
    else
        idFixed.value = "";
    
    idISIN.value = Smart.ISIN;
    
    idDescription.value = Smart.Description;
    //idTokenGenerate.checked = Smart.TokenGenerate;
    //idAccountLength.value = Smart.AccountLength;
    
    //idStateFormat.value = Smart.StateFormat;
    idCategory1.value = Smart.Category1;
    idCategory2.value = Smart.Category2;
    idCategory3.value = Smart.Category3;
    if(Smart.IconBlockNum)
    {
        idIcon.value = "/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum;
    }
    else
        idIcon.value = "";
    
    if(window.ace)
    {
        editCode.setValue(Smart.Code);
        editHTML.setValue(Smart.HTML);
        
        editCode.getSession().setUndoManager(new ace.UndoManager());
        editHTML.getSession().setUndoManager(new ace.UndoManager());
        
        editCode.WasReload = 1;
        editHTML.WasReload = 1;
        
        if(!Smart.HTML)
            editHTML.NeedReplay = 1;
    }
    else
    {
        idCode.value = Smart.Code;
        idHTML.value = Smart.HTML;
    }
    
    //if(!Smart.StartValue)
    Smart.StartValue = 0;
    //idStartValue.value = Smart.StartValue;
    idOwnerPubKey.checked = Smart.OwnerPubKey;
    
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
        SmartToEditors(Smart);
        SetVisibleTab();
    }
    
    CheckReplay();

    CheckShortName();

}

function SetDialogEnabled()
{

    var bDisabled = (CurProjectValue != idProjectList.value);
    
    var Arr = ["idName", "idShortName", "idCentName", "idFixed", "idISIN", "idCode", "idHTML", "idDescription",
    "idOwnerPubKey",  "idCategory1", "idCategory2", "idCategory3", "idIcon",
    "idBtIcon", "idBtSendSmart", "idBtSendHTML","idBtSendJS", "!idStateHTML1", "!idStateHTML2"];
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
    
    // if(idSmartHTMLMode.value !== "1")
    // {
    //     idStateHTML1.disabled = 1;
    //     idStateHTML2.disabled = 1;
    // }
    
    SetVisibleBlock("idRefHTML", bDisabled);
    
    return !bDisabled;
}

var LastBaseState = undefined;
function LoadSmart(Path,LoadLastHTML,WasSmart)
{
    LastBaseState = undefined;
    SetStatus("");
    if(Path !== null)
    {
        if(Path == "" + parseInt(Path))
        {
            LastBaseState = undefined;
            
            GetData("DappSmartList", {StartNum:parseInt(Path), CountNum:1, GetAllData:1, AllRow:1}, function (SetData)
            {
                if(SetData && SetData.result && SetData.arr.length === 1)
                {
                    var Smart = SetData.arr[0];
                    idSmartNum.value = Smart.Num;
                    idSmartOwner.value = Smart.Owner;
                    idSmartAccount.value = Smart.Account;
                    // if(MapAccounts[Smart.Owner] && Smart.BaseState && Smart.BaseState.HTMLBlock !== undefined && Smart.BaseState.HTMLTr !== undefined)
                    //     idSmartHTMLMode.value = 1;
                    // else
                    //     idSmartHTMLMode.value = 0;
                    
                    var Str = "";
                    var Url = "";
                    //idSmartHTMLMode.value = 0;
                    if(Smart.HTMLBlock)
                    {
                        LastBaseState={HTMLBlock:Smart.HTMLBlock,HTMLTr:Smart.HTMLTr};
                    }
                    else
                    if(Smart.BaseState && Smart.BaseState.HTMLBlock)
                    {
                        LastBaseState = Smart.BaseState;
                    }

                    if(LastBaseState)
                    {
                        //idSmartHTMLMode.value = 1;
                        Url = "/file/" + LastBaseState.HTMLBlock + "/" + LastBaseState.HTMLTr;
                        Str = "<a target='_blank' class='link' onclick='OpenExtLink(\"" + Url + "\"); return 0;'>" + Url + "</a>";
                    }
                    idRefHTML.innerHTML = Str;
                    idNewStateFile.value = Url;
                    var StateHTML=undefined;
                    if(LoadLastHTML)
                        StateHTML=LastBaseState;
                    LoadSmart("/file/" + Smart.BlockNum + "/" + Smart.TrNum,StateHTML,Smart);
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
            if(WasSmart)
            GetData("DappBlockFile", Param, function (SetData)
            {
                if(SetData && SetData.result)
                {
                    var Smart = SetData.Body?SetData.Body.Body:undefined;
                    var SmartType=Smart?Smart.Type:0;

                    if((SetData.Type === 111 || SetData.Type === 112) && (SmartType === 130 || SmartType === 131))
                    {

                        if(LoadLastHTML && typeof LoadLastHTML === "object")
                        {
                            GetData("DappBlockFile", {BlockNum:LoadLastHTML.HTMLBlock, TrNum:LoadLastHTML.HTMLTr}, function (SetData)
                            {
                                if(SetData && SetData.result)
                                {
                                    WasSmart.HTML=SetData.Body;
                                    SetSmartToDialog(WasSmart, 1);
                                }
                            });
                        }
                        else
                        {
                            SetSmartToDialog(WasSmart, 1);
                        }
                    }
                    else
                    {
                        SetSmartToDialog(WasSmart, 1);
                        console.log("Error type (" + SetData.Type+"," + SmartType+") transaction in path: " + Path);
                    }
                }
                else
                {
                    console.log("Error data in path: " + Path);
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
    
    var SmartValue =  + (idSmartList.value);
    
    if(nSet === 2 && SmartValue === PrevSmartValue)
        return;
    
    PrevSmartValue = SmartValue;
    
    if(SmartValue)
        LoadSmart(SmartValue);
    SetDialogEnabled();
    if(SmartValue > 8)
    {
        idSmartStart.value = SmartValue;
        
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
        StartNum = idSmartStart.value;
    // if(!StartNum)
    //     StartNum = 1;
    //if(window.NETWORK_ID === "MAIN-JINN.TERA" && (StartNum < 8))
    if(!StartNum || StartNum<8)
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
    idProjectList.value = CurProjectValue;
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
    
    var SmartValue = idProjectList.value;
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
    var SmartValue = idProjectList.value;
    if(!SmartValue)
        return;
    var Index = parseInt(SmartValue);
    Smart = ProjectArray[Index];
    
    DoConfirm("Are you sure?", "Remove project <B>" + Smart.Name + "</B>", function ()
    {
        if(SmartValue)
        {
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
            idProjectList.value = Index;
            SaveValues(1);
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
    SavePrevProject();
    openModal("idNewSmart");
}
function NewDapp(Mode,FCodeTemplate,FHTMLTemplate,idHTML,idHTMLBefor)
{
    var CodeSmart = "", CodeHTML = "";
    if(typeof FCodeTemplate === "function")
    {
        CodeSmart = GetTextFromF(FCodeTemplate);
    }
    else
    {
        if(typeof FCodeTemplate === "object")
        {
            for(var i = 0; i < FCodeTemplate.length; i++)
            {
                var Str = "" + FCodeTemplate[i];
                CodeSmart += Str + "\n";
                if(Str.length > 8)
                    CodeSmart += "\n";
            }
        }
        else
        {
            CodeSmart = FCodeTemplate;
        }
    }
    
    CodeHTML = GetTextFromF(FHTMLTemplate);

    //console.log("CodeHTML",CodeHTML);
    
    NewDappNext(Mode, CodeSmart, CodeHTML, idHTML, idHTMLBefor);
    DoPlay(1);
}

function GetTextFromF(F)
{
    if(!F)
        return "";
    var Str = "" + F;
    var Index = Str.indexOf("{");
    Str = Str.substr(Index + 1);
    Str = Str.substr(0, Str.length - 1);
    return Str;
}

function NewDappNext(Mode,CodeSmart,CodeHTML,idHTML,idHTMLBefor)
{
    closeModal();
    
    var NewSmartNum = 0;
    var Smart = GetBlankSmart();
    
    LBlockNum:
    while(true)
    {
        NewSmartNum++;
        var Name = Mode + " " + NewSmartNum;
        for(var i = 0; i < ProjectArray.length; i++)
        {
            var Smart2 = ProjectArray[i];
            if(Smart2.Name === Name)
                continue LBlockNum;
        }
        break;
    }
    Smart.Name = Name;
    
    if(CodeSmart)
    {
        Smart.Code = "//Smart-contract: " + Name + "\n\n";
        Smart.Code += CodeSmart;
    }
    if(CodeHTML)
    {
        var Str = "";
        
        if(idHTMLBefor)
            Str += $(idHTMLBefor).innerHTML + "\n";
        
        Str += "<script>\n" + CodeHTML + "\n<\/script>\n\n";
        if(idHTML)
            Str +=  $(idHTML).innerHTML + "\n";

        Smart.HTML = Str;
        //Smart.StateFormat = "{HTMLBlock:uint,HTMLTr:uint16}";
    }
    
    ProjectArray.unshift(Smart);
    FillProject();
    idProjectList.value = 0;
    CurProjectValue = idProjectList.value;
    SetSmartToDialog(Smart, 0, 1);
    
    idName.focus();
}

function LoadFromDapp()
{
    var Num = idLoadDapp.value;
    if(Num)
    {
        NewDappNext("Blank");
        LoadSmart(Num,1);
    }
}

function TrimStr(Str)
{
    var Arr = Str.split("\n");
    var StrAll = "";
    for(var i = 0; i < Arr.length; i++)
    {
        var Str2 = Arr[i].trim();
        if(Str2.substring(0, 2) === "//")
        {
            Str2 = null;
        }
        if(Str2)
            StrAll += Str2 + "\n";
    }
    
    return StrAll;
}

function TrimRows(StrID)
{
    $(StrID).value = TrimStr($(StrID).value);
}

function SetVisibleTokenMode()
{
    //SetVisibleBlock("idTokenMode", idTokenGenerate.checked);
}

function OpenWalletPage()
{
    window.open(GetWalletLink());
}

function CheckReplay()
{
    if(editHTML && editHTML.NeedReplay)
    {
        if(idAutoPlay.checked)
            DoPlay();
    }
}

function DoPlay(bRecreate)
{


    if(ArrTabs[1].Current != "TabPlay")
        return;




    if(idAutoPlay.checked)//защита от бесконечных циклов
    {
        idAutoPlay.checked=false;
        SaveValues(1);
        setTimeout(function ()
        {
            idAutoPlay.checked=true;
        },100);
    }
    
    var bEnable = SetDialogEnabled();
    if(!bEnable && LastBaseState)
    {
        GetData("DappBlockFile", {BlockNum:LastBaseState.HTMLBlock, TrNum:LastBaseState.HTMLTr}, function (SetData)
        {
            if(SetData && SetData.result)
            {
                bWasPlay = 1;
                RunFrame(SetData.Body, idPreview, bRecreate);
            }
        });
        return;
    }
    bWasPlay = 1;
    var Code = GetHTMLCode();
    RunFrame(Code, idPreview, bRecreate);
}

function SelectScreenStyle()
{
    idPreview.className = idScreenStyle.value;
}

function DoPlaySend()
{
    var SendFrom = ParseNum(idSendFrom.value);
    var SendTo = ParseNum(idSendTo.value);
    var fSum = parseFloat(idSendSum.value);
    var Currency=parseInt(idCurrency.value);
    var TokenID=idTokenID.value;
    
    PlaySend(SendFrom, SendTo, fSum, idSendDesc.value,Currency,TokenID);
}

function CheckShortName()
{
    SetVisibleBlock("idCheckShortName",!IsOkShortName(idShortName.value));
    SetVisibleBlock("idCheckCentName",!IsOkShortName(idCentName.value,1));
}
function IsErrTokenNames()
{
    if(!IsOkShortName(idShortName.value))
        return "Token name";
    if(!IsOkShortName(idCentName.value,1))
        return "Cent name";
    return 0;
}

function IsOkShortName(Name,bCent)
{
    var MustName = NormalizeCurrencyName(Name,bCent);
    return Name===MustName;
}

function MoveProject(DeltaNum)
{
    var Arr=ProjectArray;
    var CurNum=+idProjectList.value;
    if(!DeltaNum)//to top
        DeltaNum=-CurNum2;

    var CurNum2=CurNum+DeltaNum;
    if(CurNum2<0 || CurNum2==CurNum)
        return;
    if(CurNum2>=Arr.length)
        return;

    var Item=Arr[CurNum];
    Arr.splice(CurNum,1);
    Arr.splice(CurNum2,0,Item);

    CurProjectValue=CurNum2;
    FillProject()
}
