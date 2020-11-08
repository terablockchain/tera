/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/



var LOC_ADD_NAME = "$";
module.exports = function ()
{
    'use strict';
    this.ErrorIgnore = false;
    this.ErrorOne = true;
    this.CommentIgnore = true;
    this.PrintMargin = 120;
    this.FileNumber = 0;
    this.InjectCheck = true;
    this.SideMode = "client";
    this.Clear = function ()
    {
        this.ExternMap = {};
        this.FunctionMap = {};
        
        this.WasPlus = 0;
        this.buf = "";
        this.stream = "";
        this.bWasBackSlash = false;
        this.pos = 0;
        this.start = 0;
        this.beforeRegExp = 0;
        this.value = "";
        this.type = "";
        this.BlockLevel = 0;
        this.LastStreamValue = "";
        this.CountCol = 0;
        this.ErrCount = 0;
        this.WasEnter = false;
        this.lastComment = 0;
        this.lastAddCode =  - 1;
        this.LineNumber = 0;
        this.posLineNumber = 0;
        this.IgnoreCodeLevel = false;
        this.AddToStream = this.AddToStreamAddTab;
    };
    
    this.AllowedWords = {true:1, false:1, undefined:1, Infinity:1, NaN:1, null:1, context:5, this:5, arguments:5, };
    
    var mapKeys = {break:1, return:1, case:1, do:1, if:1, switch:1, var:1, throw:1, while:1, default:1, for:1, try:1, continue:1,
        with:1, function:3, void:3, new:3, delete:3, typeof:3, finally:5, catch:5, else:5, instanceof:4, in:4, };
    this.KeyWords = Object.assign(Object.create(null), mapKeys);
    this.KeyWords["__proto__"] = 100;
    this.KeyWords["prototype"] = 100;
    this.KeyWords["constructor"] = 100;
    
    this.KeyWords["__count__"] = 100;
    this.KeyWords["__noSuchMethod__"] = 100;
    this.KeyWords["__parent__"] = 100;
    
    this.ProcessWords = {break:"break", return:"return", case:"case", do:"do", if:"if", switch:"switch", var:"var", throw:"throw",
        with:"with", while:"while", default:"default", for:"for", try:"try", continue:"continue", function:"function", void:"void",
        new:"new", delete:"delete", typeof:"typeof", finally:"finally", catch:"catch", else:"else", };
    
    this.enIndenifier = "1";
    this.enString = "2";
    this.enNumber = "3";
    this.enSpaces = "4";
    this.enNewLine = "5";
    this.enComments = "6";
    this.enRegular = "7";
    this.enOperator = "O";
    this.enEndFile = "EoF";
    this.lexTypeAll = new Array(0x10000);
    this.lexTypeIdentifier = new Array(0x10000);
    this.lexTypeNumbers = new Array(0x10000);
    this.lexTypeNumbers16 = new Array(0x10000);
    this.lexTypeSpaces = new Array(0x10000);
    this.lexTypeNewLines = new Array(0x10000);
    this.lexTypeRegStart = new Array(0x10000);
    this.SpacesArray = new Array(100);
    this.Init = function ()
    {
        var BufNumbers = "0123456789";
        var BufNumbers16 = "0123456789ABCDEFabcdef";
        var BufChars = "~!%^&*-+/<>`@#()=\\|{}[];':\"?,.";
        var BufSpaces = " \t\b\f\v\u00A0\u2028\u2029\u000C";
        var BufNewLine = "\n\r";
        var BufRegStart = "`~!#%^&*(+|-=\\[{};:,?<>";
        SetType("N", BufNumbers, this.lexTypeAll);
        SetType("C", BufChars, this.lexTypeAll);
        SetType("S", BufSpaces, this.lexTypeAll);
        SetType("M", BufNewLine, this.lexTypeAll);
        SetLetterType("L", this.lexTypeAll, this.lexTypeAll);
        SetType("N", BufNumbers, this.lexTypeNumbers);
        SetType("N", BufNumbers16, this.lexTypeNumbers16);
        SetType("S", BufSpaces, this.lexTypeSpaces);
        SetType("M", BufNewLine, this.lexTypeNewLines);
        SetType("R", BufRegStart, this.lexTypeRegStart);
        SetLetterType("L", this.lexTypeAll, this.lexTypeIdentifier);
        SetType("N", BufNumbers, this.lexTypeIdentifier);
        Normalize(this.lexTypeAll);
        Normalize(this.lexTypeNumbers);
        Normalize(this.lexTypeNumbers16);
        Normalize(this.lexTypeSpaces);
        Normalize(this.lexTypeNewLines);
        Normalize(this.lexTypeRegStart);
        Normalize(this.lexTypeIdentifier);
        this.SpacesArray[0] = "";
        this.SpacesArray[1] = "";
        for(var i = 2; i < 100; i++)
            this.SpacesArray[i] = this.SpacesArray[i - 1] + "    ";
        function SetType(type,buf,TypeArray)
        {
            for(var pos = 0; pos < buf.length; pos++)
            {
                var c = buf.charCodeAt(pos);
                TypeArray[c] = type;
            }
        };
        function SetLetterType(type,lexTypeAll,TypeArray)
        {
            for(var i = 32; i < 0x10000; i++)
            {
                if(!lexTypeAll[i] || lexTypeAll[i] == "L")
                    TypeArray[i] = "L";
            }
            TypeArray[92] = "L";
        };
        function Normalize(TypeArray)
        {
            for(var i = 0; i < 0x10000; i++)
            {
                TypeArray[i] = TypeArray[i] || false;
            }
        };
        function SetVeryQuickly(TypeArray)
        {
            var Ret = 0;
            for(var i = 0; i < 0x10000; i++)
            {
                if(TypeArray[i])
                    Ret = 1;
                else
                    Ret = 0;
            }
            return Ret;
        };
    };
    this.Init();
    
    function LANG(Str)
    {
        for(var i = 1; i < arguments.length; i++)
            Str = Str.replace("%" + i, arguments[i]);
        return Str;
    };
    this.Error = function ()
    {
        var Str1 = LANG.apply(this, arguments);
        var begin = 0;
        for(var i = this.start; i >= 0; i--)
            if(this.buf[i] == "\n" || this.buf[i] == "\r")
            {
                begin = i + 1;
                break;
            }
        var end = this.buf.length - 1;
        for(var i = this.pos; i < this.buf.length; i++)
            if(this.buf[i] == "\n" || this.buf[i] == "\r")
            {
                end = i;
                break;
            }
        var line = 1;
        for(var i = 0; i < this.start; i++)
            if(this.buf[i] == "\n")
            {
                line++;
            }
        
        var col = this.start + 1 - begin;
        var Dots1 = "";
        var Dots2 = "";
        if(this.start - begin > 100)
        {
            begin = this.start - 100;
            Dots1 = "...";
        }
        if(end - this.start > 100)
        {
            end = this.start + 100;
            Dots2 = "...";
        }
        this.ErrCount++;
        var ErrLabel;
        if(!this.ErrorOne && this.ErrorIgnore)
            ErrLabel = " <<err:" + this.ErrCount + ">> ";
        else
            ErrLabel = " <<?>> ";
        var StrLine = this.buf.substring(begin, this.start) + ErrLabel + this.buf.substring(this.start, end);
        var Str2 = LANG("At line: %1 col: %2", line - 1, col - 1);
        var Str = "SyntaxError: " + Str1 + ". " + Str2 + "\n" + Dots1 + StrLine + Dots2;
        if(this.ErrorIgnore)
        {
            console.log(Str);
            this.stream += ErrLabel;
            this.stream += this.value + " ";
            if(this.ErrorOne)
            {
                this.stream += "\n\n" + Str;
            }
            else
            {
                this.NotBackPos();
                return;
            }
        }
        throw Str;
    };
    this.code_base = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\ufffd\u2122\u0459\u203a\u045a\u045c\u045b\u045f\xa0\u040e\u045e\u0408\xa4\u0490\xa6\xa7\u0401\xa9\u0404\xab\xac\xad\xae\u0407\xb0\xb1\u0406\u0456\u0491\xb5\xb6\xb7\u0451\u2116\u0454\xbb\u0458\u0405\u0455\u0457\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f';
    this.FromBackSlashString = function (str)
    {
        var Ret = "";
        for(var i = 0; i < str.length; i++)
        {
            var s = str[i];
            if(s == "\\")
            {
                var s2 = str[i + 1];
                switch(s2)
                {
                    case "r":
                        i = i + 1;
                        Ret = Ret + "\r";
                        break;
                    case "n":
                        i = i + 1;
                        Ret = Ret + "\n";
                        break;
                    case "t":
                        i = i + 1;
                        Ret = Ret + "\t";
                        break;
                    case "b":
                        i = i + 1;
                        Ret = Ret + "\b";
                        break;
                    case "f":
                        i = i + 1;
                        Ret = Ret + "\f";
                        break;
                    case "u":
                        var s = str.substring(i + 2, i + 6);
                        var code = parseInt(s);
                        if(isNaN(code))
                            this.Error("Unrecognize unicode symbol: '%1'", "\\u" + s);
                        else
                            Ret = Ret + String.fromCharCode(code);
                        i = i + 5;
                        break;
                    case "x":
                        var s = str.substring(i + 2, i + 4);
                        var code = parseInt(s, 16);
                        if(isNaN(code))
                            this.Error("Unrecognize Latin symbol: '%1'", "\\x" + s);
                        else
                            Ret = Ret + this.code_base.charAt(code);
                        i = i + 3;
                        break;
                    default:
                        var c = str.charCodeAt(i + 1);
                        if(this.lexTypeNumbers[c] == "N")
                        {
                            var s = str.substring(i + 1, i + 4);
                            var code = parseInt(s, 8);
                            if(isNaN(code))
                                this.Error("Unrecognize Latin symbol: '%1'", "\\" + s);
                            else
                                Ret = Ret + this.code_base.charAt(code);
                            i = i + 3;
                        }
                        break;
                }
            }
            else
            {
                Ret = Ret + s;
            }
        }
        return Ret;
    };
    this.PosString = function ()
    {
        var separator = this.buf[this.pos];
        this.pos++;
        while(this.pos < this.buf.length)
        {
            var s = this.buf[this.pos];
            if(s == separator)
            {
                this.pos++;
                return;
            }
            else
                if(s == "\\")
                {
                    this.pos++;
                    this.bWasBackSlash = true;
                }
                else
                    if(s == "\n")
                    {
                        this.Error("Found end of line during calculate string");
                        return;
                    }
            this.pos++;
        }
        this.Error("Found end of file during calculate string");
    };
    this.PosRegExp = function ()
    {
        this.Error("RegExp not support");
        return;
        
        var separator = "/";
        this.pos++;
        while(this.pos < this.buf.length)
        {
            var s = this.buf[this.pos];
            if(s == separator)
            {
                this.pos++;
                return;
            }
            else
                if(s == "[")
                {
                    separator = "";
                }
                else
                    if(s == "]" && separator == "")
                    {
                        separator = "/";
                    }
                    else
                        if(s == "\\")
                        {
                            this.pos++;
                            this.bWasBackSlash = true;
                        }
                        else
                            if(s == "\n")
                            {
                                this.Error("Found end of line during calculate regexp");
                                return;
                            }
            this.pos++;
        }
        this.Error("Found end of file during calculate regexp");
    };
    
    this.PosCurrentType = function (TypeArray)
    {
        while(this.pos < this.buf.length)
        {
            var c = this.buf.charCodeAt(this.pos);
            if(!TypeArray[c])
                break;
            if(c == 92)
                this.bWasBackSlash = true;
            this.pos++;
        }
    };
    this.PosIdentifier = function ()
    {
        this.PosCurrentType(this.lexTypeIdentifier);
    };
    this.PosSpaces = function ()
    {
        this.PosCurrentType(this.lexTypeSpaces);
    };
    this.PosNewLines = function ()
    {
        this.PosCurrentType(this.lexTypeNewLines);
    };
    this.PosNumber = function ()
    {
        if(this.buf[this.pos] == "0")
        {
            this.pos++;
            var s = this.buf[this.pos];
            if(s == "x" || s == "X")
            {
                this.pos++;
                this.PosCurrentType(this.lexTypeNumbers16);
            }
            else
                if(s == ".")
                {
                    this.pos++;
                    this.PosCurrentType(this.lexTypeNumbers);
                }
                else
                {
                    this.PosCurrentType(this.lexTypeNumbers);
                }
            return;
        }
        this.PosCurrentType(this.lexTypeNumbers);
        if(this.buf[this.pos] == ".")
        {
            this.pos++;
            this.PosCurrentType(this.lexTypeNumbers);
        }
        if(this.buf[this.pos] == "e" || this.buf[this.pos] == "E")
        {
            this.pos++;
            var s2 = this.buf[this.pos];
            if(s2 == "+" || s2 == "-")
                this.pos++;
            var posstart = this.pos;
            this.PosCurrentType(this.lexTypeNumbers);
            if(posstart == this.pos)
                this.Error("Unrecognize exponent number");
        }
        var c = this.buf.charCodeAt(this.pos);
        var type = this.lexTypeAll[c];
        if(type == "L")
            this.Error("Unrecognize number");
    };
    this.PosCommentsOneLine = function ()
    {
        while(this.pos < this.buf.length)
        {
            var s = this.buf[this.pos];
            if(s == '\n')
                break;
            else
                if(s == '\r')
                    break;
            this.pos++;
        }
    };
    this.PosCommentsMultiLine = function ()
    {
        while(this.pos < this.buf.length)
        {
            var s = this.buf[this.pos] + this.buf[this.pos + 1];
            if(s == '*/')
            {
                this.pos += 2;
                break;
            }
            this.pos++;
        }
    };
    
    this.BackPos = function ()
    {
        if(this.type != this.enEndFile)
            this.pos = this.start;
    };
    this.NotBackPos = function ()
    {
        if(this.pos == this.start)
            this.PosNextItem();
    };
    this.PosNextToken = function ()
    {
        this.WasEnter = false;
        while(true)
        {
            this.PosNextItem();
            switch(this.type)
            {
                case this.enNewLine:
                    this.WasEnter = true;
                    break;
                case this.enSpaces:
                case this.enComments:
                    break;
                default:
                    return this.type;
            }
        }
    };
    this.PosNextItem = function ()
    {
        this.start = this.pos;
        if(this.pos >= this.buf.length)
        {
            this.type = this.enEndFile;
            return this.enEndFile;
        }
        var c = this.buf.charCodeAt(this.pos);
        var lex = this.lexTypeAll[c];
        switch(lex)
        {
            case "L":
                this.bWasBackSlash = false;
                this.PosIdentifier();
                this.value = this.buf.substring(this.start, this.pos);
                if(this.bWasBackSlash)
                    this.value = this.FromBackSlashString(this.value);
                this.beforeRegExp = 65;
                this.type = this.enIndenifier;
                if(this.value == "in" || this.value == "of" || this.value == "instanceof")
                {
                    return this.value;
                }
                
                if(this.KeyWords[this.value] === 100)
                {
                    this.Error("Not allow Identifier '" + this.value + "'");
                }
                
                return this.enIndenifier;
            case "N":
                this.PosNumber();
                this.value = this.buf.substring(this.start, this.pos);
                this.beforeRegExp = 48;
                this.type = this.enNumber;
                return this.enNumber;
            case "S":
                this.PosSpaces();
                this.type = this.enSpaces;
                return this.enSpaces;
            case "M":
                this.PosNewLines();
                this.type = this.enNewLine;
                return this.enNewLine;
            case "C":
                var s = this.buf[this.pos];
                switch(s)
                {
                    case '"':
                    case "'":
                        this.bWasBackSlash = false;
                        this.PosString();
                        this.value = this.buf.substring(this.start, this.pos);
                        this.beforeRegExp = 65;
                        this.type = this.enString;
                        return this.enString;
                    case "/":
                        var s2 = this.buf[this.pos + 1];
                        if(s2 == '/')
                        {
                            this.PosCommentsOneLine();
                            if(!this.CommentIgnore && this.lastComment <= this.start)
                            {
                                this.lastComment = this.start + 1;
                                this.value = this.buf.substring(this.start, this.pos);
                                this.AddToStream(this.value);
                                this.AddToStream("\n");
                            }
                            this.type = this.enComments;
                            return this.enComments;
                        }
                        else
                            if(s2 == '*')
                            {
                                this.PosCommentsMultiLine();
                                if(!this.CommentIgnore && this.lastComment <= this.start)
                                {
                                    this.lastComment = this.start + 1;
                                    this.value = this.buf.substring(this.start, this.pos);
                                    this.AddToStream(this.value);
                                    if(this.buf[this.pos] == "\n")
                                    {
                                        this.AddToStream("\n");
                                        this.pos++;
                                    }
                                }
                                this.type = this.enComments;
                                return this.enComments;
                            }
                            else
                                if(this.lexTypeRegStart[this.beforeRegExp] == "R")
                                {
                                    this.PosRegExp();
                                    this.beforeRegExp = 65;
                                    while("gmi".indexOf(this.buf[this.pos]) >= 0)
                                    {
                                        this.pos++;
                                    }
                                    this.value = this.buf.substring(this.start, this.pos);
                                    this.type = this.enRegular;
                                    return this.enRegular;
                                }
                        s += this.AddNextOperator("=");
                        break;
                    case "/":
                        this.beforeRegExp = 0;
                        s += this.AddNextOperator("=");
                        break;
                    case "=":
                        s += this.AddNextOperator("=");
                        s += this.AddNextOperator("=");
                        break;
                    case ">":
                        s += this.AddNextOperator(">");
                        s += this.AddNextOperator("=");
                        if(s == ">>=")
                            break;
                        s += this.AddNextOperator(">");
                        s += this.AddNextOperator("=");
                        break;
                    case "<":
                        s += this.AddNextOperator("<");
                        s += this.AddNextOperator("=");
                        break;
                    case "!":
                        s += this.AddNextOperator("=");
                        s += this.AddNextOperator("=");
                        break;
                    case "~":
                        break;
                    case "+":
                        s += this.AddNextOperator("+");
                        if(s == "++")
                            break;
                        s += this.AddNextOperator("=");
                        break;
                    case "-":
                        s += this.AddNextOperator("-");
                        if(s == "--")
                            break;
                        s += this.AddNextOperator("=");
                        break;
                    case "*":
                        s += this.AddNextOperator("=");
                        break;
                    case "&":
                        s += this.AddNextOperator("&");
                        if(s == "&&")
                            break;
                        s += this.AddNextOperator("=");
                        break;
                    case "|":
                        s += this.AddNextOperator("|");
                        if(s == "||")
                            break;
                        s += this.AddNextOperator("=");
                        break;
                    case "^":
                        s += this.AddNextOperator("=");
                        break;
                    case "%":
                        s += this.AddNextOperator("=");
                        break;
                    case ".":
                        var c2 = this.buf.charCodeAt(this.pos + 1);
                        if(this.lexTypeNumbers[c2])
                        {
                            this.pos++;
                            this.PosNumber();
                            this.value = this.buf.substring(this.start, this.pos);
                            this.beforeRegExp = 48;
                            this.type = this.enNumber;
                            return this.enNumber;
                        }
                        break;
                }
                this.beforeRegExp = c;
                this.value = s;
                this.pos++;
                this.type = s;
                return s;
            default:
                this.Error("Unrecognize symbol: '%1'", c);
        }
        this.type = this.enNewLine;
        return this.enNewLine;
    };
    this.AddNextOperator = function (find)
    {
        var s2 = this.buf[this.pos + 1];
        if(s2 == find)
        {
            this.pos++;
            return s2;
        }
        else
        {
            return "";
        }
    };
    this.ParseLexem = function (Code,bWrite)
    {
        this.Clear();
        this.buf = Code;
        this.beforeRegExp = 61;
        var AllStr = "";
        while(true)
        {
            var type = this.PosNextItem();
            if(type == this.enEndFile)
                break;
            if(bWrite)
            {
                AllStr = AllStr + this.value + "\n";
            }
        }
        if(AllStr)
        {
            console.log(AllStr);
        }
        return AllStr;
    };
    
    this.ParseLexem2 = function (Code)
    {
        this.Clear();
        this.buf = Code;
        this.beforeRegExp = 61;
        var n = 0;
        var Value1 = new Uint32Array(Code.length);
        var Value2 = new Uint32Array(Code.length);
        while(true)
        {
            var type = this.PosNextItem();
            if(type == this.enEndFile)
                break;
            Value1[n] = this.start;
            Value2[n] = this.pos;
            n++;
        }
        return {Value1:Value1, Value2:Value2};
    };
    this.ParseCode = function (Code)
    {
        this.Clear();
        this.buf = Code;
        this.ParseSmart();
    };
    this.ParseSmart = function ()
    {
        var nPublic = 0;
        while(true)
        {
            var type = this.PosNextToken();
            if(type === this.enEndFile)
                break;
            
            if(type === this.enString)
            {
                if(this.value === '"public"')
                {
                    nPublic = 1;
                    continue;
                }
                else
                    if(this.value === '"message"')
                    {
                        nPublic = 2;
                        continue;
                    }
            }
            
            if(this.value === "function")
            {
                var FuncName = this.Parse_function(0, 1);
                
                if(nPublic)
                    this.ExternMap[FuncName] = nPublic;
                
                nPublic = 0;
                this.AddNewLineToStream(";\n");
            }
            else
            {
                this.Error("Require 'function' indenifier");
            }
        }
    };
    this.ParseBlock = function (sConditions,bOneIteration,bSimpleMode,bNotCheck)
    {
        if(!bOneIteration)
            this.BlockLevel++;
        var WasIgnoreCodeLevel = this.IgnoreCodeLevel;
        
        var type;
        var bWasLabel = false;
        this.beforeRegExp = 61;
        Main:
        while(true)
        {
            var posSave = this.pos;
            type = this.PosNextToken();
            
            if(!bNotCheck && !bSimpleMode && !bWasLabel)
            {
                switch(type)
                {
                    case ";":
                    case ":":
                    case "{":
                    case "}":
                    case this.enEndFile:
                        break;
                    case this.enIndenifier:
                    default:
                        this.AddCheckLineToStream();
                }
            }
            switch(type)
            {
                case ";":
                    bWasLabel = false;
                    break;
                case ":":
                    this.Error("Unexpected token: '%1'", this.GetTokenName(type));
                    bWasLabel = false;
                    break;
                case "{":
                    this.AddNewLineToStream("{\n", true);
                    this.ParseBlock("}");
                    this.AddNewLineToStream("}\n", true);
                    bWasLabel = false;
                    break;
                case "}":
                    break Main;
                case this.enEndFile:
                    break Main;
                case this.enIndenifier:
                    bNotCheck = false;
                    var Name = this.value;
                    var key = this.KeyWords[Name];
                    if(key == 1 || Name == "function")
                    {
                        this["Parse_" + this.ProcessWords[Name]]();
                        if(!bSimpleMode)
                        {
                            this.AddNewLineToStream(";\n");
                        }
                        type = this.type;
                        break;
                    }
                default:
                    
                    this.pos = posSave;
                    type = this.ParseExpressionWithComma(false, false, true);
                    if(type === ":")
                    {
                        bWasLabel = true;
                    }
                    else
                    {
                        bWasLabel = false;
                        if(!bSimpleMode)
                        {
                            this.AddNewLineToStream(";\n");
                        }
                    }
            }
            if(bOneIteration && type != ":")
                break;
        }
        if(sConditions)
        {
            if(sConditions.indexOf(type) ==  - 1)
            {
                this.Error("Error block closing. Unexpected token: '%1'", this.GetTokenName(type));
            }
        }
        this.IgnoreCodeLevel = WasIgnoreCodeLevel;
        if(!bOneIteration)
            this.BlockLevel--;
        return type;
    };
    this.ParseOneBlock = function ()
    {
        var type = this.PosNextToken();
        if(type == "{")
        {
            this.AddNewLineToStream("\n");
            this.AddNewLineToStream("{\n", true);
            var type = this.ParseBlock("}");
            this.AddNewLineToStream("}\n", true);
        }
        else
            if(type == ";")
            {
                if(this.InjectCheck)
                {
                    this.AddCheckLineToStream();
                    this.AddNewLineToStream("\n");
                }
                else
                    this.AddNewLineToStream(";\n");
            }
            else
            {
                if(this.InjectCheck)
                {
                    this.AddNewLineToStream("\n");
                    this.AddNewLineToStream("{\n", true);
                    this.BackPos();
                    var type = this.ParseBlock(false, true);
                    this.AddNewLineToStream("}\n", true);
                }
                else
                {
                    this.AddNewLineToStream("\n");
                    this.BackPos();
                    this.BlockLevel++;
                    type = this.ParseBlock(false, true);
                    this.BlockLevel--;
                }
            }
        if(type == ";")
        {
            this.NotBackPos();
        }
        return type;
    };
    this.ParseExpressionWithComma = function (sConditions,bCanEmpty,bCanLabel)
    {
        var sConditions2;
        if(sConditions)
            sConditions2 = "," + sConditions;
        var type;
        while(true)
        {
            var prev = this.pos;
            type = this.ParseExpression(sConditions2, bCanEmpty, bCanLabel);
            if(type != ",")
                break;
            if(prev == this.pos || !sConditions2)
                this.PosNextItem();
            bCanLabel = false;
            if(this.CountCol <= this.PrintMargin)
                this.AddToStream(", ");
            else
                this.AddNewLineToStream(",\n", true);
        }
        return type;
    };
    
    this.ParseExpression = function (sConditions,bCanEmpty,bCanLabel)
    {
        var WasPlus2 = this.WasPlus;
        var stream2 = this.stream;
        
        this.WasPlus = 0;
        this.stream = "";
        
        var type = this.ParseExpression0(sConditions, bCanEmpty, bCanLabel);
        
        if(this.WasPlus)
            this.stream = stream2 + "CHKL(" + this.stream + ")";
        else
            this.stream = stream2 + this.stream;
        
        this.WasPlus = WasPlus2;
        
        return type;
    };
    this.ParseExpression0 = function (sConditions,bCanEmpty,bCanLabel)
    {
        var bWasExpr = false;
        var bCanDot = false;
        var bCanLeftSide = false;
        
        var type;
        var Name;
        this.beforeRegExp = 61;
        Main:
        while(true)
        {
            type = this.PosNextItem();
            
            switch(type)
            {
                case this.enSpaces:
                case this.enComments:
                    continue;
                case this.enNewLine:
                    bCanLeftSide = false;
                    this.WasEnter = true;
                    continue;
                case this.enNumber:
                case this.enIndenifier:
                case this.enString:
                case this.enRegular:
                case "{":
                    if(bWasExpr)
                        break Main;
            }
            
            switch(type)
            {
                case this.enIndenifier:
                    Name = this.value;
                    var key = this.KeyWords[Name];
                    
                    if(key == 3)
                    {
                        this["Parse_" + this.ProcessWords[Name]]();
                    }
                    else
                        if(key == 1 || key == 5)
                        {
                            type = this.enOperator;
                            this.BackPos();
                            break Main;
                        }
                        else
                        {
                            if(!this.AllowedWords[Name])
                                Name = LOC_ADD_NAME + Name;
                            this.AddToStream(Name);
                            if(bCanLabel)
                            {
                                var posSave2 = this.pos;
                                var type2 = this.PosNextToken();
                                if(type2 == ":")
                                {
                                    type = type2;
                                    bWasExpr = true;
                                    this.AddNewLineToStream(":\n", true);
                                    return ":";
                                }
                                else
                                {
                                    this.pos = posSave2;
                                }
                            }
                        }
                    bCanLeftSide = true;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case this.enNumber:
                    this.AddToStream(this.value);
                    bCanLeftSide = false;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case this.enString:
                    this.AddToStream(this.value);
                    bCanLeftSide = false;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case this.enRegular:
                    this.AddToStream(this.value);
                    bCanLeftSide = false;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case "{":
                    this.ParseDefObject();
                    bCanLeftSide = false;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case "[":
                    if(bCanDot)
                        this.ParseProperty();
                    else
                        this.ParseDefArray();
                    bCanLeftSide = true;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case "(":
                    this.ParseFunctionCall(bCanDot);
                    bCanLeftSide = true;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case ".":
                    if(!bCanDot)
                        this.Error("Unexpected token: '%1'", type);
                    this.AddToStream(".");
                    this.RequireIndenifier();
                    bCanLeftSide = true;
                    bCanDot = true;
                    bWasExpr = true;
                    break;
                case "?":
                    if(!bWasExpr)
                        this.Error("Require expression before token: '%1'", type);
                    this.ParseIfCondition();
                    bCanLeftSide = false;
                    bCanDot = false;
                    bWasExpr = true;
                    break;
                    
                case "=":
                case "+=":
                    if(type === "+=")
                        this.WasPlus = 1;
                    if(!bCanLeftSide)
                        this.Error("Unexpected token: '%1'", type);
                    this.AddToStream(" " + type + " ");
                    var type2 = this.ParseExpression(undefined, false, false);
                    
                    bCanLeftSide = false;
                    bCanDot = false;
                    bWasExpr = true;
                    break;
                    
                case "-=":
                case "*=":
                case "/=":
                case ">>=":
                case "<<=":
                case ">>>=":
                case "&=":
                case "|=":
                case "^=":
                case "%=":
                    if(!bCanLeftSide)
                        this.Error("Unexpected token: '%1'", type);
                    this.AddToStream(" " + type + " ");
                    
                    bCanLeftSide = false;
                    bCanDot = false;
                    bWasExpr = false;
                    break;
                case "!":
                    this.AddToStream(type);
                    bCanLeftSide = false;
                    bCanDot = false;
                    break;
                case "~":
                    this.AddToStream(type);
                    bCanLeftSide = false;
                    bCanDot = false;
                    break;
                case "==":
                case "===":
                case "!=":
                case "!==":
                case ">=":
                case "<=":
                case ">":
                case "<":
                case "~":
                case "^":
                case "&":
                case "|":
                case "<<":
                case ">>":
                case ">>>":
                case "%":
                case "*":
                case "/":
                case "&&":
                case "||":
                    if(!bWasExpr)
                        this.Error("Require expression before token: '%1'", type);
                    bWasExpr = false;
                    this.AddToStream(" " + type + " ");
                    bCanLeftSide = false;
                    bCanDot = false;
                    break;
                case "-":
                case "+":
                    if(type === "+")
                        this.WasPlus = 1;
                    bWasExpr = false;
                    this.AddToStream(" " + type + " ");
                    bCanLeftSide = false;
                    bCanDot = false;
                    break;
                case "++":
                case "--":
                    if(this.WasEnter)
                        if(bWasExpr)
                        {
                            type = ";";
                            break Main;
                        }
                    if(bWasExpr)
                        if(!bCanDot)
                            this.Error("Invalid left-side argument before token: '%1'", type);
                    
                    this.AddToStream(type);
                    bCanLeftSide = false;
                    bCanDot = false;
                    break;
                    
                case "in":
                case "of":
                case "instanceof":
                    if(!bWasExpr)
                        this.Error("Invalid argument before: '%1'", type);
                    this.AddToStream(" " + type + " ");
                    this.ParseExpressionWithComma(false, false);
                    bWasExpr = true;
                    bCanLeftSide = false;
                    bCanDot = false;
                    break;
                case ",":
                case ";":
                case ")":
                case "]":
                case "}":
                case ":":
                case this.enEndFile:
                    break Main;
                default:
                    this.Error("Unexpected token: '%1'", type);
            }
            this.WasEnter = false;
        }
        if(sConditions)
        {
            if(sConditions.indexOf(type) ==  - 1)
            {
                if(type == this.enOperator)
                    this.Error("Unexpected keywords: '%1'", this.value);
                else
                {
                    var str = this.GetTokenName(type);
                    if(str == type)
                        this.Error("Error expression closing. Unexpected token: '%1'", str);
                    else
                        this.Error("Error expression closing. Unexpected %1", str);
                }
            }
        }
        else
        {
            this.BackPos();
        }
        if(!bCanEmpty && !bWasExpr)
        {
            var str;
            if(type == this.enOperator)
                str = Name;
            else
            {
                str = this.GetTokenName(type);
            }
            if(str == type)
                this.Error("Require expression before token: '%1'", str);
            else
                this.Error("Require expression before: %1", str);
        }
        return type;
    };
    this.GetTokenName = function (type)
    {
        switch(type)
        {
            case this.enNumber:
                return "number";
            case this.enIndenifier:
                return "indenifier";
            case this.enString:
                return "string";
            case this.enRegular:
                return "regular";
            case this.enEndFile:
                return "End of file";
            default:
                return type;
        }
    };
    this.RequireChar = function (sFind)
    {
        var type = this.PosNextToken();
        if(type != sFind)
            this.Error("Require token: '%1'", sFind);
    };
    
    this.RequireIndenifier = function (Name,DopStr)
    {
        var type = this.PosNextToken();
        if(type != this.enIndenifier || (Name && this.value != Name))
        {
            if(Name)
                this.Error("Require indenifier: '%1'", Name);
            else
                this.Error("Require indenifier");
        }
        if(DopStr)
            this.AddToStream(DopStr + this.value);
        else
            this.AddToStream(this.value);
        return this.value;
    };
    this.RequireIndenifierOptional = function ()
    {
        var type = this.PosNextToken();
        if(type != this.enIndenifier)
        {
            this.BackPos();
        }
        else
        {
            this.AddToStream(" " + this.value);
        }
    };
    this.HasEnter = function ()
    {
        this.PosNextToken();
        this.BackPos();
        return this.WasEnter;
    };
    this.Parse_var = function ()
    {
        this.AddToStream("var ");
        while(true)
        {
            this.RequireIndenifier(undefined, LOC_ADD_NAME);
            var type = this.PosNextToken();
            this.AddToStream(type);
            if(type === "=")
                this.ParseExpressionWithComma(false, false);
            if(type !== ",")
            {
                break;
            }
        }
    };
    this.Parse_function = function (bGetSet,bFindExternal)
    {
        if(!bGetSet)
        {
            this.AddToStream("function ");
        }
        var FuncName;
        var type = this.PosNextToken();
        if(type == this.enIndenifier)
        {
            FuncName = this.value;
            if(bGetSet)
                this.AddToStream(FuncName);
            else
                this.AddToStream(LOC_ADD_NAME + FuncName);
            type = this.PosNextToken();
        }
        else
            if(bGetSet)
            {
                this.Error("Require name before: '%1'", type);
            }
        if(type != "(")
            this.Error("Require token: '%1'", "(");
        this.AddToStream("(");
        var bMustIdentifier = false;
        while(true)
        {
            type = this.PosNextToken();
            if(type == this.enIndenifier)
            {
                var Name = this.value;
                this.AddToStream(LOC_ADD_NAME + Name);
                type = this.PosNextToken();
                if(type == ",")
                {
                    this.AddToStream(",");
                    bMustIdentifier = true;
                    continue;
                }
                bMustIdentifier = false;
            }
            else
                if(bMustIdentifier)
                {
                    this.Error("Require indenifier");
                    break;
                }
            if(type == ")")
                break;
            this.Error("Require indenifier");
        }
        
        if(FuncName && bFindExternal)
        {
            this.FunctionMap[FuncName] = 1;
            
            type = this.PosNextToken();
            
            if(this.value === 'public')
            {
                this.ExternMap[FuncName] = 1;
            }
            else
                if(this.value === 'message')
                {
                    this.ExternMap[FuncName] = 2;
                }
                else
                {
                    this.BackPos();
                }
        }
        
        this.RequireChar("{");
        this.AddNewLineToStream(")\n", true);
        this.AddNewLineToStream("{\n", true);
        
        if(this.InjectCheck)
        {
            this.AddCheckLineToStream(30);
        }
        
        this.ParseBlock("}", false, false, false);
        this.AddNewLineToStream("\n");
        this.AddToStream("}", "} ");
        
        return FuncName;
    };
    
    this.ParseFunctionCall = function (bCanEmpty)
    {
        this.AddToStream("(");
        this.ParseExpressionWithComma(")", true);
        this.AddToStream(")");
    };
    
    this.Parse_void = function ()
    {
        this.AddToStream("void ");
        var type = this.ParseExpression();
    };
    this.Parse_new = function ()
    {
        
        this.AddToStream("new ");
        var type = this.ParseExpression();
    };
    this.Parse_delete = function ()
    {
        this.AddToStream("delete ");
        this.ParseExpression();
    };
    this.ParseIfCondition = function ()
    {
        this.AddToStream(" ? ");
        this.ParseExpression(":");
        this.AddToStream(" : ");
        this.ParseExpression();
    };
    this.ParseDefArray = function ()
    {
        this.AddToStream("[");
        this.ParseExpressionWithComma("]", true);
        this.AddToStream("]");
    };
    this.ParseProperty = function ()
    {
        this.AddToStream("[CHK404(");
        this.ParseExpressionWithComma("]", true);
        this.AddToStream(")]");
    };
    this.ParseDefObject = function ()
    {
        this.BlockLevel++;
        this.AddToStream("{");
        while(true)
        {
            var type = this.PosNextToken();
            if(type == this.enIndenifier || type == this.enString || type == this.enNumber)
            {
                var Name = this.value;
                if(Name === "get" || Name === "set")
                {
                    type = this.PosNextToken();
                    if(type == ":")
                    {
                        this.AddToStream(Name + ":");
                        type = this.ParseExpression(",}");
                    }
                    else
                    {
                        this.AddToStream(Name + " ");
                        this.BackPos();
                        this.Parse_function(true);
                        type = this.PosNextToken();
                    }
                }
                else
                {
                    this.RequireChar(":");
                    this.AddToStream(Name + ":");
                    type = this.ParseExpression(",}");
                }
            }
            if(type == "}")
                break;
            else
                if(type == ",")
                {
                    if(this.CountCol <= this.PrintMargin)
                        this.AddToStream(", ");
                    else
                        this.AddNewLineToStream(",\n", true);
                    continue;
                }
                else
                {
                    this.Error("Unexpected token: '%1'", this.GetTokenName(type));
                    break;
                }
        }
        this.BlockLevel--;
        this.AddToStream("}", "} ");
    };
    this.Parse_break = function ()
    {
        this.AddToStream("break");
        if(this.HasEnter())
            return;
        this.RequireIndenifierOptional();
    };
    this.Parse_continue = function ()
    {
        this.AddToStream("continue");
        if(this.HasEnter())
            return;
        this.RequireIndenifierOptional();
    };
    this.Parse_return = function ()
    {
        this.AddToStream("return ");
        if(this.HasEnter())
            return;
        this.ParseExpressionWithComma(false, true);
    };
    this.Parse_typeof = function ()
    {
        this.AddToStream("typeof ");
        this.ParseExpression();
    };
    this.Parse_for = function ()
    {
        this.AddToStream("for(");
        this.RequireChar("(");
        var bForInMode = false;
        var bWasVar = false;
        var bWasName;
        var posSave = this.pos;
        var type = this.PosNextToken();
        if(type == this.enIndenifier)
        {
            if(this.value == "var")
            {
                type = this.PosNextToken();
                bWasVar = true;
            }
            if(type == this.enIndenifier)
            {
                bWasName = this.value;
                type = this.PosNextToken();
                if(type == this.enIndenifier && (this.value == "in" || this.value == "of"))
                    bForInMode = true;
            }
        }
        
        if(bForInMode)
        {
            if(bWasVar)
                this.AddToStream("var ");
            this.AddToStream(LOC_ADD_NAME + bWasName + " " + this.value + " ");
        }
        else
        {
            this.pos = posSave;
            var type = this.ParseBlock(";", true, true);
            if(type == ";")
                this.NotBackPos();
            this.AddToStream("; ");
            this.ParseExpressionWithComma(";", true);
            this.AddToStream("; ");
        }
        this.ParseExpressionWithComma(")", true);
        this.AddToStream(")");
        this.ParseOneBlock();
    };
    this.Parse_while = function ()
    {
        this.RequireChar("(");
        this.AddToStream("while(");
        this.ParseExpressionWithComma(")");
        this.AddToStream(")");
        this.ParseOneBlock();
    };
    this.Parse_do = function ()
    {
        this.AddToStream("do");
        this.ParseOneBlock();
        this.RequireIndenifier("while");
        this.RequireChar("(");
        this.AddToStream("(");
        this.ParseExpressionWithComma(")");
        this.AddToStream(")");
    };
    this.Parse_if = function ()
    {
        this.AddToStream("if(");
        this.RequireChar("(");
        this.ParseExpressionWithComma(")");
        this.AddToStream(")");
        this.ParseOneBlock();
        var type = this.PosNextToken();
        if(type == this.enIndenifier && this.ProcessWords[this.value] == "else")
        {
            this.AddToStream("else");
            this.ParseOneBlock();
        }
        else
        {
            this.BackPos();
        }
    };
    this.Parse_switch = function ()
    {
        this.RequireChar("(");
        this.AddToStream("switch(");
        this.ParseExpressionWithComma(")");
        this.RequireChar("{");
        this.AddNewLineToStream(")\n", true);
        this.AddNewLineToStream("{\n", true);
        this.BlockLevel++;
        this.ParseBlock("}", false, false, true);
        this.BlockLevel--;
        this.AddNewLineToStream("}\n", true);
    };
    this.Parse_case = function ()
    {
        this.BlockLevel--;
        this.AddToStream("case ");
        this.ParseExpressionWithComma(":");
        this.AddNewLineToStream(":\n", true);
        this.BlockLevel++;
    };
    this.Parse_default = function ()
    {
        this.RequireChar(":");
        this.BlockLevel--;
        this.AddNewLineToStream("default:\n", true);
        this.BlockLevel++;
    };
    this.Parse_with = function ()
    {
        this.RequireChar("(");
        this.AddToStream("with(");
        this.ParseExpressionWithComma(")");
        this.AddToStream(")");
        this.ParseOneBlock();
    };
    
    this.Parse_try = function ()
    {
        this.Error("try-catch not support");
        return;
        
        this.RequireChar("{");
        this.AddToStream("try\n");
        this.AddNewLineToStream("{\n", true);
        this.ParseBlock("}");
        this.AddNewLineToStream("}\n", true);
        var type = this.PosNextToken();
        if(type == this.enIndenifier && this.ProcessWords[this.value] == "catch")
        {
            this.AddToStream("catch(");
            this.RequireChar("(");
            this.RequireIndenifier();
            this.RequireChar(")");
            this.AddNewLineToStream(")\n", true);
            this.AddNewLineToStream("{\n", true);
            
            this.RequireChar("{");
            this.ParseBlock("}");
            this.AddToStream("}");
            type = this.PosNextToken();
        }
        
        if(type == this.enIndenifier && this.ProcessWords[this.value] == "finally")
        {
            this.RequireChar("{");
            this.AddNewLineToStream("\n");
            this.AddNewLineToStream("finally\n", true);
            this.AddNewLineToStream("{\n", true);
            this.ParseBlock("}");
            this.AddToStream("}");
        }
        else
        {
            this.BackPos();
        }
    };
    
    this.Parse_throw = function ()
    {
        this.AddToStream("throw ");
        if(this.HasEnter())
            return;
        var type = this.ParseExpressionWithComma();
    };
    this.AddCheckLineToStream = function (Count)
    {
        if(this.InjectCheck)
        {
            if(!Count)
                Count = 1;
            this.CalculateLineNumber();
            this.AddToStream("DO(" + Count + ");");
        }
    };
    this.CalculateLineNumber = function ()
    {
        for(var i = this.posLineNumber; i < this.pos; i++)
            if(this.buf[i] == "\n")
                this.LineNumber++;
        this.posLineNumber = this.pos;
    };
    
    this.CalculateLineNumber0 = function (str)
    {
        for(var i = 0; i < str.length; i++)
            if(str[i] == "\n")
                this.LineNumber++;
    };
    this.AddCheckToStream = function (str)
    {
        if(this.InjectCheck)
        {
            this.AddToStream(str);
        }
    };
    
    this.AddToStreamSimple = function (str,strMustLast)
    {
        if(strMustLast)
            this.LastStreamValue = strMustLast;
        else
            this.LastStreamValue = str;
        if(!this.IgnoreCodeLevel)
            this.stream += str;
    };
    this.AddToStreamAddTab = function (str,strMustLast)
    {
        if(this.LastStreamValue[this.LastStreamValue.length - 1] == "\n")
        {
            this.CountCol = 0;
            if(!this.IgnoreCodeLevel)
                this.stream += this.SpacesArray[this.BlockLevel >= 100 ? 99 : this.BlockLevel];
        }
        if(str[str.length - 1] == "\n")
        {
            this.CountCol = 0;
        }
        else
        {
            this.CountCol += str.length;
        }
        this.AddToStreamSimple(str, strMustLast);
    };
    this.AddNewLineToStream = function (str,bAlways)
    {
        var sLast = this.LastStreamValue[this.LastStreamValue.length - 1];
        if(bAlways || sLast != "\n")
        {
            if(str == ";\n" && (sLast == "}" || sLast == ";"))
            {
                this.AddToStream("\n");
            }
            else
            {
                this.AddToStream(str);
            }
        }
    };
}
global.LexerJS = new module.exports();
