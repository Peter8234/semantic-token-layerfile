import * as vscode from 'vscode';
import * as antlr4 from "antlr4";
import LayerfileLexer from "./antlr/LayerfileLexer.js"

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const handleNormalToken = (token : antlr4.Token, tokenType : string, tokenArray : IParsedToken[]) => {
	tokenArray.push({
		line : token.line - 1,
		startCharacter : token.column,
		length : token.text.length,
		tokenType: tokenType,
		tokenModifiers: []
	})
}
const handleKeyValToken = (token : antlr4.Token, tokenArray : IParsedToken[], types : {
	keyType : string,
	valType : string,
	split: RegExp
}) => {
	var keyVal = token.text.split(types.split);
	if (keyVal.length >= 2) {
		let [key, value] = keyVal;
		tokenArray.push({
			line : token.line - 1,
			startCharacter : token.column,
			length : key.length,
			tokenType: types.keyType,
			tokenModifiers: []
		})
		tokenArray.push({
			line : token.line - 1,
			startCharacter : token.column + token.text.indexOf(value, key.length),
			length : token.text.length - token.text.indexOf(value, key.length),
			tokenType: types.valType,
			tokenModifiers: []
		})
	}
}

const mapTokens = (token : antlr4.Token, tokenArray : IParsedToken[])  => {
	switch (token.type) {
		case LayerfileLexer.BUTTON:
		case LayerfileLexer.CACHE:
		case LayerfileLexer.CHECKPOINT:
		case LayerfileLexer.CLONE:
		case LayerfileLexer.COPY:
		case LayerfileLexer.ENV:
		case LayerfileLexer.BUILD_ENV:
		case LayerfileLexer.FROM:
		case LayerfileLexer.MEMORY:
		case LayerfileLexer.RUN:
		case LayerfileLexer.RUN_BACKGROUND:
		case LayerfileLexer.RUN_REPEATABLE:
		case LayerfileLexer.SECRET_ENV:
		case LayerfileLexer.SETUP_FILE:
		case LayerfileLexer.SKIP_REMAINING_IF:
		case LayerfileLexer.SPLIT:
		case LayerfileLexer.EXPOSE_WEBSITE:
		case LayerfileLexer.USER:
		case LayerfileLexer.WAIT:
		case LayerfileLexer.WORKDIR:
		case LayerfileLexer.SKIP_REMAINING_IF_AND:	
			handleNormalToken(token, "keyword", tokenArray)		
			return
		case LayerfileLexer.COMMENT:
		case LayerfileLexer.CHECKPOINT_COMMENT:
		case LayerfileLexer.BUILD_ENV_COMMENT:
		case LayerfileLexer.BUTTON_COMMENT:
		case LayerfileLexer.ENV_COMMENT:
		case LayerfileLexer.WEBSITE_COMMENT:
		case LayerfileLexer.MEMORY_COMMENT:
		case LayerfileLexer.SECRET_ENV_COMMENT:		
		case LayerfileLexer.USER_COMMENT:	
		case LayerfileLexer.FILE_COMMENT:						
			handleNormalToken(token, "comment", tokenArray)		
			return
		case LayerfileLexer.BUILD_ENV_VALUE:
		case LayerfileLexer.CHECKPOINT_VALUE:	
		case LayerfileLexer.BUTTON_DATA:
		case LayerfileLexer.SECRET_ENV_VALUE:
		case LayerfileLexer.USER_NAME:		
			handleNormalToken(token, "variable", tokenArray)
			return	
		case LayerfileLexer.MEMORY_AMOUNT:
		case LayerfileLexer.SPLIT_NUMBER:
			handleNormalToken(token, "number", tokenArray)		
			return
		case LayerfileLexer.FILE:	
			handleNormalToken(token, "string", tokenArray)		
			return
		case LayerfileLexer.ENV_VALUE_WS:
			handleKeyValToken(token, tokenArray, {
				keyType: "variable",
				valType: "string",
				split: /\s+/
			})
			return
		case LayerfileLexer.ENV_VALUE:
			handleKeyValToken(token, tokenArray, {
				keyType: "variable",
				valType: "string",
				split: /=/
			})
			return
		case LayerfileLexer.SKIP_REMAINING_IF_VALUE:	
			handleKeyValToken(token, tokenArray, {
				keyType: "variable",
				valType: "string",
				split: /!=~|!=|=~|=/
			})
			return 	
		default:
			return
	}
}

export const legend = (function () {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'decorator', 'macro', 'variable', 'parameter', 'property', 'label'
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));
	const tokenModifiersLegend = [
		'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
		'modification', 'async'
	];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();


export class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

	async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		const allTokens = this._parseText(document.getText());
		const builder = new vscode.SemanticTokensBuilder();
		allTokens.forEach((token) => {
			builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType));
		});
		return builder.build();
	}

	private _encodeTokenType(tokenType: string): number {
		if (tokenTypes.has(tokenType)) {
			return tokenTypes.get(tokenType)!;
		}
		return 0;
	}

	private _parseText(text: string): IParsedToken[] {
		const r: IParsedToken[] = [];
		var chars = new antlr4.InputStream(text, true)
		var lexer = new LayerfileLexer(chars);
		var tokens : antlr4.Token[];
		//@ts-ignore
		tokens = lexer.getAllTokens()
		for (const token of tokens) {
			console.log(token.type)
			console.log(token.text);
			mapTokens(token, r)
		}
		console.log(r)
		return r;
	}
}
