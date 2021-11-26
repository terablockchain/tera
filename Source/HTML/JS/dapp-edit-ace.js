/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


function InitCommonEdit()
{
    SetVisibleBlock("idCode", 1);
    SetVisibleBlock("idHTML", 1);
}

function InitAce()
{
    if(!window.ace)
    {
        $("idCode1").id = "idCode";
        $("idHTML1").id = "idHTML";
        InitCommonEdit();
        return;
    }
    else
    {
        $("idCode2").id = "idCode";
        $("idHTML2").id = "idHTML";
    }
    InitCommonEdit();
    
    editCode = ace.edit("idCode");
    editHTML = ace.edit("idHTML");
    
    editCode.getSession().setMode("ace/mode/javascript");
    editHTML.getSession().setMode("ace/mode/html");
    
    AddAceOptions(editCode);
    AddAceOptions(editHTML);

    editHTML.$search=editCode.$search;//common finding word

    SetAutocomplete();
    
    editHTML.getSession().on('change', function (e)
    {
        editHTML.NeedReplay = 1;
    });
}

function SetTheme(editor)
{
    if($("idSelStyle").value === "styleDark")
        editor.setTheme("ace/theme/cobalt");
    else
        editor.setTheme("ace/theme/chrome");
}

function SetAutocomplete()
{
    const langTools = ace.require("ace/ext/language_tools");
    
    window.context = GetSmartContext({BlockNum:100}, 200, undefined, {}, 2, {Num:300, Value:{SumCOIN:0, SumCENT:0}}, 7, 1);
    let SmartListEvents = [];
    let SmartListContext = ["context", "JSON", "Math"];
    let DappList = ["SendCall", "Call", "GetWalletAccounts", "GetAccountList", "GetSmartList", "GetBlockList", "GetTransactionList",
    "DappSmartHTMLFile", "DappBlockFile", "SetStatus", "SetError", "SetLocationPath", "CreateNewAccount", "OpenLink", "SetMobileMode",
    "ComputeSecret", "CheckInstall", "ReloadDapp", "CurrencyName", "GetState", "GetDappBlock", "OpenRefFile", "SetStorage", "GetStorage",
    "SetCommon", "GetCommon", "GetInfo"];
    for(var i = 0; i < CodeTemplateSmart.length; i++)
    {
        var Item = CodeTemplateSmart[i];
        var Str = "" + Item;
        if(Str.substr(0, 11) === "function On")
        {
            var Index = Str.indexOf("\n");
            if(Index > 0)
            {
                var StrF = Str.substr(0, Index);
                var Name = StrF.substr(9);
                Name = Name.replace("//", " - ");
                
                SmartListEvents.push(StrF + "\n{\n    \n}\n");
            }
        }
    }
    for(var key in _ListF)
    {
        if(key.substr(0, 1) === "$" && key.length > 1)
        {
            var Name = key.substr(1);
            var Value = _ListF[key];
            SmartListContext.push('' + Name + (typeof Value === "function" ? '(' : ""));
        }
    }
    
    var MyCompleter = {getCompletions:function (editor,session,pos,prefix,callback)
        {
            CheckGoodAutocompleter(editor);

            var WordScore = 0;
            var wordMeta;
            if(editor === editCode)
                wordMeta = "smart";
            else
                wordMeta = "dapp";
            
            var pos = editor.selection.getCursor();
            var session = editor.session;
            
            var curLine = (session.getDocument().getLine(pos.row)).trim();
            var curTokens = curLine.slice(0, pos.column).split(/\s+/);
            var curCmd = curTokens[0];
            if(!curCmd)
                return;

            
            var lastToken = curTokens[curTokens.length - 1];
            var wordList = [];
            
            var Arr = ToWordsArray(lastToken);
            if(Arr.length > 1)
            {
                var Obj = window;
                for(var i = 0; i < Arr.length - 1; i++)
                {
                    var Name = Arr[i];
                    if(!Name)
                        continue;
                    
                    var Obj2 = Obj[Name];
                    
                    if(!Obj2)
                        break;
                    Obj = Obj2;
                }
                if(Obj)
                {
                    WordScore = 1000;
                    var Arr2 = Object.getOwnPropertyNames(Obj);
                    for(var key of Arr2)
                    {
                        wordList.push(key);
                    }
                    wordMeta = lastToken;
                }
            }
            else
                if(editor === editCode)
                {
                    if(pos.column === 1)
                    {
                        wordList = SmartListEvents;
                        wordMeta = "event";
                    }
                    else
                    {
                        wordList = SmartListContext;
                    }
                }
                else
                {
                    wordList = DappList;
                }
            
            callback(null, wordList.map(function (word)
            {
                return {caption:word, value:word, score:WordScore, meta:wordMeta};
            }));
        }};
    
    langTools.addCompleter(MyCompleter);
}


function CheckGoodAutocompleter(editor)
{
    //корректировка исходников Ace - делаем так чтобы редактор не реагировал на редактирование цифр
    //TODO - подобрать лучшую точку корректировки


    if(!editor.completer || editor.completer.gatherCompletionsOld)
        return;


    // function retrievePrecedingIdentifier(text, pos, regex)
    // {
    //     var ID_REGEX = /[a-zA-Z_0-9\$\-\u00A2-\uFFFF]/;
    //     regex = regex || ID_REGEX;
    //     var buf = [];
    //     for (var i = pos-1; i >= 0; i--) {
    //         if (regex.test(text[i]))
    //             buf.push(text[i]);
    //         else
    //             break;
    //     }
    //     return buf.reverse().join("");
    // };
    //

    editor.completer.gatherCompletionsOld=editor.completer.gatherCompletions;
    editor.completer.gatherCompletions = function(editor, callback)
    {
        var session = editor.getSession();
        var pos = editor.getCursorPosition();

        var line = session.getLine(pos.row);
        var prefix = retrievePrecedingIdentifier(line, pos.column);
        this.base = session.doc.createAnchor(pos.row, pos.column - prefix.length);
        this.base.$insertRight = true;


        var lastchar=prefix.substr(prefix.length-1);
        if(prefix.length<=1 || String(+lastchar)===lastchar)
            return this.detach();


        editor.completer.gatherCompletionsOld(editor, callback);
    }


}
function SetAceOptions(editor)
{
    var FontSize = +idFontSize.value;
    if(!FontSize)
        FontSize=10;
    editor.setOptions({
        //fontFamily: "tahoma",
        fontSize: FontSize+"pt"
    });
}

function AddAceOptions(editor)
{
    SetTheme(editor);
    editor.setPrintMarginColumn(120);
    
    editor.setReadOnly(1);

    SetAceOptions(editor);
    
    editor.setOptions({enableBasicAutocompletion:true, enableSnippets:false, enableLiveAutocompletion:true});
    
    editor.$blockScrolling = Infinity;
    
    ace.require('ace/ext/settings_menu').init(editor);
    editor.commands.addCommands([{name:"showSettingsMenu", bindKey:{win:"Ctrl-q", mac:"Command-q"}, exec:function (editor)
        {
            editor.showSettingsMenu();
        }, readOnly:true}]);
    editor.commands.addCommand({name:"DoHelp", bindKey:{win:"F1", mac:"F1"}, exec:function (editor)
        {
            ace.config.loadModule("ace/ext/keybinding_menu", function (module)
            {
                module.init(editor);
                editor.showKeyboardShortcuts();
            });
        }, readOnly:true});
    
    editor.commands.addCommand({name:"selectOrFindNext", bindKey:{win:"Ctrl-F3", mac:"Ctrl-G"}, exec:function (editor)
        {
            if(editor.selection.isEmpty())
            {
                // editor.selection.selectWord();
            }
            else
            {
                editor.findNext();
            }
        }, readOnly:true});
    
    editor.commands.addCommand({name:"findnext", bindKey:{win:"F3", mac:"Command-G"}, exec:function (editor)
        {
            if(!editor.selection.isEmpty())
                editor.selection.clearSelection();


            editor.findNext();
        }, readOnly:true});
    editor.commands.addCommand({name:"Set bookmark", bindKey:{win:"Ctrl-F2", mac:"Command-F2"}, exec:function (editor)
        {
            var sesion = editor.getSession();
            var pos = editor.getCursorPosition();
            var arr = sesion.getBreakpoints();
            if(arr[pos.row])
            {
                sesion.clearBreakpoint(pos.row);
            }
            else
            {
                sesion.setBreakpoint(pos.row);
            }
        }, readOnly:true});
    editor.commands.addCommand({name:"Next bookmark", bindKey:{win:"F2", mac:"F2"}, exec:function (editor)
        {
            var sesion = editor.getSession();
            var pos = editor.getCursorPosition();
            var arr = sesion.getBreakpoints();
            for(var n = 1; n <= 2; n++)
                for(var i = (n === 1) ? pos.row + 1 : 0; i < arr.length; i++)
                {
                    if(arr[i])
                    {
                        editor.gotoLine(i + 1);
                        return;
                    }
                }
        }, readOnly:true});
    
    editor.commands.addCommand({name:"Run", bindKey:{win:"F5", mac:"F5"}, exec:function (editor)
        {
            SelectTab("TabPlay");
            DoPlay();
        }, readOnly:false});

    editor.commands.addCommand({name:"Run", bindKey:{win:"F12", mac:"F12"}, exec:function (editor)
        {
            var session = editor.getSession();
            var pos = editor.getCursorPosition();

            var StrLine = session.getLine(pos.row);

            var Name = retrievePrecedingIdentifier(StrLine, pos.column,undefined,1);
            if(!Name)
                return;
            //console.log(Name);
            //var regex = new RegExp("(function|var)\\s+"+Name+"\\W","");
            var regexVar = new RegExp("var\\s+"+Name+"\\W","");

            for(var row=pos.row-1;row>=0;row--)
            {
                var Str=session.getLine(row);
                if (regexVar.test(Str))
                {
                    editor.gotoLine(row + 1);
                    break;
                }
            }


            var regexFunc = new RegExp("function\\s+"+Name+"\\W","");
            var AllCount=session.getLength();
            for(var row=0;row<AllCount;row++)
            {
                var Str=session.getLine(row);
                if (regexFunc.test(Str))
                {
                    editor.gotoLine(row + 1);
                    break;
                }
            }

        }, readOnly:false});

    editor.commands.addCommand({name:"togglecomment2", bindKey:{win:"Ctrl-o", mac:"Command-o"}, exec:function (editor)
        {
            editor.toggleCommentLines();
        }, multiSelectAction:"forEachLine", scrollIntoView:"selectionPart", readOnly:false});
    
    editor.on("change", function (e)
    {
        var sesion = editor.getSession();
        if(!sesion.$breakpoints.length)
            return;
        var delta = e.data;
        var range = delta.range;
        var firstRow = range.start.row;
        
        var len = range.end.row - firstRow;
        if(len > 0)
        {
            if(delta.action == "removeText" || delta.action == "removeLines")
            {
                var WasRow = sesion.$breakpoints[firstRow];
                sesion.$breakpoints.splice(firstRow, len);
                if(!sesion.$breakpoints[firstRow])
                {
                    sesion.$breakpoints[firstRow] = WasRow;
                }
            }
            else
            {
                if(range.start.column > 0)
                {
                    firstRow++;
                }

                var args = new Array(len);
                args.unshift(firstRow, 0);
                sesion.$breakpoints.splice.apply(sesion.$breakpoints, args);
            }
        }
    });
}
function GetSmartCode()
{
    if(window.ace)
    {
        return editCode.getValue();
    }
    else
    {
        return $("idCode").value;
    }
}
function GetHTMLCode()
{
    if(window.ace)
    {
        return editHTML.getValue();
    }
    else
    {
        return $("idHTML").value;
    }
}

function ActivateEditor(editor)
{
    if(!window.ace)
        return;
    
    if(!CurProjectValue)
        return;
    
    setTimeout(function ()
    {
        if(editor.PosToSet)
        {
            var nRow = editor.PosToSet.row + 1;
            editor.gotoLine(nRow, editor.PosToSet.column, 1);
            editor.PosToSet = undefined;
        }
    }, 1);
    
    editor.focus();
    if(editor.WasReload)
    {
        editor.WasReload = 0;
        editor.resize();
        editor.renderer.scrollCursorIntoView();
    }
}

function SmartToOneEditor(ItemEditor,editor)
{
    if(!ItemEditor)
        return;
    
    if(ItemEditor.Pos)
        editor.PosToSet = ItemEditor.Pos;
    
    var sesion = editor.getSession();
    sesion.clearBreakpoints();
    
    var arr = ItemEditor.Arr;
    for(var i = 0; arr && i < arr.length; i++)
        sesion.setBreakpoint(arr[i]);
}
function OneEditorToSmart(Item,name,editor)
{
    
    var sesion = editor.getSession();
    var arr = sesion.getBreakpoints();
    var Arr = [];
    for(var i = 0; i < arr.length; i++)
    {
        if(arr[i])
            Arr.push(i);
    }
    
    if(editor.PosToSet)
        Item[name] = {Pos:editor.PosToSet, Arr:Arr};
    else
        Item[name] = {Pos:editor.getCursorPosition(), Arr:Arr};
}

function SmartToEditors(Item)
{
    if(!window.ace)
        return;
    
    SmartToOneEditor(Item.EditorCode, editCode);
    SmartToOneEditor(Item.EditorHTML, editHTML);
}

function EditorsToSmart(Item)
{
    
    if(!window.ace)
        return;
    
    OneEditorToSmart(Item, "EditorCode", editCode);
    OneEditorToSmart(Item, "EditorHTML", editHTML);
}

function ToWordsArray(Str)
{
    var Arr = [];
    var Word = "";
    for(var i = Str.length - 1; i >= 0; i--)
    {
        var CurC = Str.substring(i, i + 1);
        var BigC = CurC.toUpperCase();
        if(BigC === ".")
        {
            Arr.unshift(Word);
            Word = "";
        }
        else
            if(BigC >= 'A' && BigC <= 'Z' || CurC >= '0' && CurC <= '9' || CurC === "_" || CurC === "$")
            {
                Word = CurC + Word;
            }
            else
            {
                break;
            }
    }
    if(Word)
        Arr.unshift(Word);
    return Arr;
}


function retrievePrecedingIdentifier(text, pos, regex, bToRight)
{
    var ID_REGEX = /[a-zA-Z_0-9\$\-\u00A2-\uFFFF]/;
    regex = regex || ID_REGEX;
    var buf = [];
    for (var i = pos-1; i >= 0; i--)
    {
        if (regex.test(text[i]))
            buf.push(text[i]);
        else
            break;
    }
    var StrRet=buf.reverse().join("");
    if(bToRight)
    {
        for (var i = pos; i<text.length; i++)
        {
            if (regex.test(text[i]))
                StrRet+=text[i];
            else
                break;
        }
    }
    return StrRet;
};
