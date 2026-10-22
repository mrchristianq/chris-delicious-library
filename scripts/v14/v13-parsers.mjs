import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const names=['safeStr','getGitHubCoverUrl','chooseCover','mapBookGenre','normalizeBookGenres','rowToBook','rowToMovie','rowToShow','rowToGame'];
function extract(source){
 const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const functions=new Map(ast.statements.filter(ts.isFunctionDeclaration).filter(node=>names.includes(node.name?.text)).map(node=>[node.name.text,node.getText(ast)]));
 if(functions.size!==names.length)throw new Error('Reference parser dependency changed; review the test harness');
 return names.map(name=>functions.get(name)).join('\n');
}
export function originalParsers(){
 const reference=execFileSync('git',['show','79524e83e2908cf60817cb9633a6d71a7a85e433:app/page.tsx'],{encoding:'utf8',maxBuffer:16*1024*1024});
 const original=extract(reference).replaceAll('\r\n','\n');
 const current=extract(readFileSync(new URL('../../app/page.tsx',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 if(original!==current)throw new Error('v13 parser source changed; explicit compatibility review required');
 const code=ts.transpileModule(original+'\nglobalThis.parsers={book:rowToBook,movie:rowToMovie,tv:rowToShow,game:rowToGame};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const context={};vm.runInNewContext(code,context,{timeout:1000});
 return Object.fromEntries(Object.entries(context.parsers).map(([key,parse])=>[key,row=>structuredClone(parse(row))]));
}
