import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as model from '../src/exportMomentumModel.js';
import {snapshot,industryDetails} from './fixtures/export-recovery.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));

// Execute the actual view and rendering helpers. This DOM adapter supports only
// the view's lifecycle selectors; real layout/keyboard/value checks live in E2E.
function harness(focus=null,state={}){
  let document;
  class Element{
    constructor(attributes='',html=''){
      this.dataset={};this.attrs={};this.nodes=[];this.events={};this.isConnected=true;
      for(const [,key,value=''] of attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){
        this.attrs[key]=value;
        if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
      }
      this.hidden=Object.hasOwn(this.attrs,'hidden');this.disabled=Object.hasOwn(this.attrs,'disabled');
      this.classList={add(){},remove(){},toggle(){}};this.innerHTML=html;
    }
    set innerHTML(html){
      this.html=html;this.nodes=[];
      const panels=[...html.matchAll(/<div ([^>]*data-export-panel="[^"]+"[^>]*)>/g)];
      if(panels.length){
        for(let i=0;i<panels.length;i++){
          const start=panels[i].index+panels[i][0].length,end=panels[i+1]?.index??html.length;
          this.nodes.push(new Element(panels[i][1],html.slice(start,end)));
        }
      }else{
        for(const [,attrs,body] of html.matchAll(/<button ([^>]*)>([\s\S]*?)<\/button>/g))this.nodes.push(new Element(attrs,body));
      }
      if(html.includes('id="export-momentum-root"')){
        const marker=html.indexOf('<div id="export-momentum-root"');
        this.nodes.push(new Element('id="export-momentum-root"',html.slice(html.indexOf('>',marker)+1)));
        const nav=new Element('class="export-topic-nav" role="tablist"');
        nav.nodes=this.nodes.filter(node=>node.attrs.role==='tab');nav.nodes.forEach(node=>node.list=nav);
        this.nodes.push(nav);
      }
      if(html.includes('id="export-item-detail"')&&!this.nodes.some(node=>node.attrs.id==='export-item-detail'))this.nodes.push(new Element('id="export-item-detail" hidden'));
      if(html.includes('data-export-monthly-semiconductor')&&!this.nodes.some(node=>node.dataset.exportMonthlySemiconductor!==undefined))this.nodes.push(new Element('data-export-monthly-semiconductor'));
      if(!panels.length)for(const [,attrs] of html.matchAll(/<section ([^>]*id="[^"]+"[^>]*)>/g)){
        const section=new Element(attrs);section.tag='section';this.nodes.push(section);
      }
    }
    get innerHTML(){return this.html;}
    get textContent(){return this.html.replace(/<[^>]+>/g,'');}
    set textContent(value){this.innerHTML=value;}
    querySelectorAll(selector){
      const match=node=>{
        if(selector.startsWith('#'))return node.attrs.id===selector.slice(1);
        if(selector==='.export-topic-nav')return node.attrs.class==='export-topic-nav';
        const found=/^\[([^=\]]+)(?:="([^"]+)")?\]$/.exec(selector);
        return found&&Object.hasOwn(node.attrs,found[1])&&(found[2]===undefined||node.attrs[found[1]]===found[2]);
      };
      return this.nodes.flatMap(node=>[...(match(node)?[node]:[]),...node.querySelectorAll(selector)]);
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    setAttribute(key,value){this.attrs[key]=String(value);}
    getAttribute(key){return this.attrs[key]??null;}
    addEventListener(name,fn){this.events[name]=fn;}
    closest(selector){return selector==='[role="tablist"]'?this.list:selector==='section'&&this.tag==='section'?this:null;}
    contains(node){return this.nodes.includes(node);}
    focus(){document.activeElement=this;}
    scrollIntoView(){}
    click(){(this.onclick||this.events.click)?.({detail:1,target:this});}
  }
  const app=new Element(),monthly=deferred(),requests=[],pending=new Map();
  document={querySelector:selector=>selector==='#app'?app:null,createElement:()=>new Element(),activeElement:null};
  const context=vm.createContext({
    ...model,document,window:{},console,Intl,Date,setTimeout,requestAnimationFrame:fn=>fn(),
    exportCompanyCandidates:()=>[],memoryMovements:()=>[],
    bindHorizontalTabs:()=>{},focusSelectedTab:nav=>nav.nodes.find(node=>node.attrs['aria-selected']==='true')?.focus(),
    loadExportMomentumSnapshot:()=>{requests.push('monthly');return monthly.promise;},
    loadExportItemDetail:key=>{requests.push(key);const item=deferred();pending.set(key,item);return item.promise;},
    loadExportMomentumMap:()=>new Promise(()=>{}),loadExportProvisionalRadar:()=>new Promise(()=>{}),
    loadSemiconductorCountryMatrix:()=>new Promise(()=>{}),loadSemiconductorTrends:()=>new Promise(()=>{}),
  });
  const source=readFileSync(new URL('../src/exportMomentumView.js',import.meta.url),'utf8')
    .replace(/^import[\s\S]*?;\n/gm,'').replace(/^export /gm,'');
  vm.runInContext(source+'\nwindow.mount=renderExportMomentumView;',context);
  const cleanup=context.window.mount({shell:html=>html,bindNav(){},focus,state});
  return {app,document,monthly,requests,pending,state,cleanup,
    tab:key=>app.querySelector(`[data-export-topic="${key}"]`),
    panel:key=>app.querySelector(`[data-export-panel="${key}"]`),
    reply:key=>pending.get(key).resolve(model.normalizeExportItemDetail(industryDetails[key])),
    snapshot:()=>monthly.resolve(model.normalizeExportSnapshot(snapshot)),
  };
}

test('monthly delay leaves navigation enabled and the selected independent industry usable',async()=>{
  const h=harness();
  assert.equal(h.tab('cosmetics').disabled,false);
  h.tab('cosmetics').click();
  assert.deepEqual(h.requests,['monthly','cosmetics']);
  h.reply('cosmetics');await flush();
  assert.equal(h.panel('cosmetics').hidden,false);
  assert.equal(h.panel('cosmetics').dataset.loadState,'ready');
  assert.match(h.panel('cosmetics').textContent,/화장품/);
  h.snapshot();await flush();
  assert.equal(h.panel('cosmetics').hidden,false);
  assert.equal(h.panel('cosmetics').dataset.loadState,'ready');
});

test('direct industry survives monthly failure and monthly-only retry preserves its panel',async()=>{
  const h=harness('steel');
  assert.equal(h.tab('steel').disabled,false);
  h.reply('steel');await flush();
  const panel=h.panel('steel'),html=panel.innerHTML;
  h.monthly.reject(new Error('monthly unavailable'));await flush();
  assert.equal(h.panel('steel'),panel);assert.equal(panel.innerHTML,html);
  assert.equal(h.panel('overview').dataset.loadState,'error');
  h.tab('overview').click();
  h.panel('overview').querySelector('[data-export-retry]').click();
  await flush();
  assert.equal(h.requests.filter(key=>key==='steel').length,1);
  assert.equal(h.panel('steel'),panel);assert.equal(panel.innerHTML,html);
});

test('different industries may finish out of order without losing valid cached panels',async()=>{
  const h=harness('cosmetics');
  h.tab('steel').click();h.reply('steel');await flush();
  h.reply('cosmetics');await flush();
  assert.equal(h.panel('steel').dataset.loadState,'ready');
  assert.equal(h.panel('cosmetics').dataset.loadState,'ready');
  h.tab('cosmetics').click();
  assert.equal(h.requests.filter(key=>key==='cosmetics').length,1);
});

test('view cleanup prevents late monthly and industry mutations',async()=>{
  const h=harness('cosmetics'),panel=h.panel('cosmetics'),before=panel.innerHTML;
  h.cleanup();h.reply('cosmetics');h.snapshot();await flush();
  assert.equal(panel.innerHTML,before);
  assert.equal(panel.dataset.loadState,'loading');
});

test('late monthly content does not steal restored keyboard tab focus',async()=>{
  const h=harness('items',{restoreTabFocus:true});
  assert.equal(h.document.activeElement,h.tab('products'));
  h.snapshot();await flush();
  assert.equal(h.document.activeElement,h.tab('products'));
});

test('direct content deep link still focuses its section when monthly data arrives',async()=>{
  const h=harness('items');
  h.snapshot();await flush();
  assert.equal(h.document.activeElement,h.panel('products').querySelector('#export-items'));
});

test('industry failure retries only its endpoint while monthly is pending',async()=>{
  const h=harness('steel');
  h.pending.get('steel').reject(new Error('industry unavailable'));await flush();
  assert.equal(h.panel('steel').dataset.loadState,'error');
  h.panel('steel').querySelector('[data-export-industry-retry="steel"]').click();
  assert.deepEqual(h.requests,['steel','monthly','steel']);
  h.reply('steel');await flush();
  assert.equal(h.panel('steel').dataset.loadState,'ready');
});

test('a response for a different industry never becomes valid selected data',async()=>{
  const h=harness('steel');
  h.pending.get('steel').resolve(model.normalizeExportItemDetail(industryDetails.cosmetics));await flush();
  assert.equal(h.panel('steel').dataset.loadState,'error');
  assert.match(h.panel('steel').textContent,/요청한 산업과 다른 자료/);
});
