import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

test('Sync uses the same icon slot, image sizing and label spacing as every Discover entry',()=>{
 const file=ts.createSourceFile('page.tsx',readFileSync(new URL('../../app/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const labels=['Statistics','Roadmap','Themes','Icons','Activity Log','Sync'];
 const rows=new Map();
 function walk(node){
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(file)==='button'){
   const label=node.children.flatMap(child=>ts.isJsxElement(child)?findLabels(child):[]).find(value=>labels.includes(value));
   if(label&&node.openingElement.getText(file).includes('discoverRowStyle'))rows.set(label,node);
  }
  ts.forEachChild(node,walk);
 }
 function findLabels(node){
  const found=[];
  if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(file)==='style'&&p.initializer?.getText(file)==='{discoverLabelStyle}')){
   found.push(node.children.filter(ts.isJsxText).map(c=>c.text.trim()).join(''));
  }
  ts.forEachChild(node,child=>found.push(...findLabels(child)));
  return found;
 }
 walk(file);
 for(const label of labels){
  const row=rows.get(label);assert.ok(row,label);
  const outer=row.children.find(ts.isJsxElement);
  const slot=outer.children.find(ts.isJsxElement);
  const style=slot.openingElement.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(file)==='style').initializer.expression;
  const values=Object.fromEntries(style.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(file),p.initializer.getText(file)]));
  assert.equal(values.width,'18',label);assert.equal(values.height,'14',label);
  assert.equal(values.flex,'"0 0 auto"',label);
  assert.equal(values.justifyContent,'"center"',label);
  assert.equal(values.alignItems,'"center"',label);
  assert.match(outer.openingElement.getText(file),/gap: discoverSidebarGap/,label);
  const image=slot.children.find(ts.isJsxSelfClosingElement).getText(file);
  assert.match(image,/width=\{discoverSidebarIconSize\}/,label);
  assert.match(image,/maxWidth: "none", maxHeight: "none"/,label);
 }
});
